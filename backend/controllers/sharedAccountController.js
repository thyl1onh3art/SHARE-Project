const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');
const Invite = require('../models/Invite');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Helper: Send SMS via Twilio
const sendSMS = (to, body) => {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to
  });
};

// Create a shared account
exports.createSharedAccount = async (req, res) => {
  try {
    const { name, memberIds, invites } = req.body;
    const senderId = req.user.userId;
    
    // Create the shared account
    const sharedAccount = new SharedAccount({
      owner: senderId,
      name,
      members: [senderId, ...(memberIds || [])],
      financeRecords: [],
    });
    await sharedAccount.save();
    
    // Create invitations if provided
    const createdInvites = [];
    if (invites && Array.isArray(invites) && invites.length > 0) {
      for (const inviteData of invites) {
        const { recipientEmail, recipientPhone } = inviteData;
        
        // Skip if email is not provided (email is required for invite acceptance)
        if (!recipientEmail?.trim()) {
          continue;
        }
        
        // Check for existing pending invite
        const existingInvite = await Invite.findOne({
          sharedAccount: sharedAccount._id,
          $or: [
            { recipientEmail: recipientEmail.trim() },
            ...(recipientPhone?.trim() ? [{ recipientPhone: recipientPhone.trim() }] : [])
          ],
          status: 'pending'
        });
        
        if (existingInvite) {
          continue; // Skip if invite already exists
        }
        
        // Create invite
        const invite = new Invite({
          sender: senderId,
          recipientEmail: recipientEmail.trim(),
          recipientPhone: recipientPhone?.trim(),
          sharedAccount: sharedAccount._id
        });
        await invite.save();
        createdInvites.push(invite);
        
        // Send email notification
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail.trim(),
            subject: 'You have been invited to a shared account',
            text: `You have been invited to join the shared account "${sharedAccount.name}". Please log in to accept the invite.`
          };
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Email sent:', info.response);
            }
          });
        } catch (emailError) {
          console.error('Error setting up email:', emailError);
        }
        
        // Send SMS notification if phone provided
        if (recipientPhone?.trim()) {
          try {
            sendSMS(recipientPhone.trim(), `You have been invited to join the shared account '${sharedAccount.name}'. Please log in to accept the invite.`)
              .then(message => console.log('SMS sent:', message.sid))
              .catch(error => console.error('Error sending SMS:', error));
          } catch (smsError) {
            console.error('Error sending SMS:', smsError);
          }
        }
      }
    }
    
    res.status(201).json({
      sharedAccount,
      invitesCreated: createdInvites.length,
      message: createdInvites.length > 0 
        ? `Shared account created and ${createdInvites.length} invitation(s) sent`
        : 'Shared account created successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// List shared accounts for the user (owner or member)
exports.getUserSharedAccounts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const accounts = await SharedAccount.find({
      $or: [
        { owner: userId },
        { members: userId }
      ]
    });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get details of a shared account (including finance records)
exports.getSharedAccountDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await SharedAccount.findById(id)
      .populate('members', 'name email')
      .populate({
        path: 'financeRecords',
        populate: { path: 'user', select: 'name email' }
      });
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }
    // Only allow if user is a member or owner
    if (!account.members.some(m => m._id.equals(req.user.userId)) && !account.owner.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(account);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
