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

// Helper function to calculate per-person amount
const calculatePerPersonAmount = (targetAmount, memberCount) => {
  const totalParticipants = memberCount + 1; // owner + members
  return totalParticipants > 0 ? targetAmount / totalParticipants : 0;
};

// Create a shared account
exports.createSharedAccount = async (req, res) => {
  try {
    const { name, description, targetAmount, targetDate, memberIds, invites } = req.body;
    const senderId = req.user.userId;
    
    // Validate required fields
    if (!name || !description || !targetAmount || !targetDate) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, description, targetAmount, and targetDate are required' 
      });
    }

    // Validate targetDate is in the future
    const targetDateObj = new Date(targetDate);
    if (isNaN(targetDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid target date' });
    }
    if (targetDateObj <= new Date()) {
      return res.status(400).json({ message: 'Target date must be in the future' });
    }

    // Prepare members array (owner is automatically included, but not in members array)
    const members = memberIds && Array.isArray(memberIds) ? memberIds : [];
    const totalParticipants = members.length + 1; // owner + members
    const perPersonAmount = calculatePerPersonAmount(targetAmount, members.length);

    const sharedAccount = new SharedAccount({
      owner: senderId,
      name: name.trim(),
      description: description.trim(),
      targetAmount: parseFloat(targetAmount),
      targetDate: targetDateObj,
      perPersonAmount: Math.round(perPersonAmount * 100) / 100, // Round to 2 decimal places
      members,
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
    
    // Populate members for response
    const populatedAccount = await SharedAccount.findById(sharedAccount._id)
      .populate('members', 'firstName lastName email');
    
    res.status(201).json({
      sharedAccount: populatedAccount,
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
    console.log('SharedAccountController: Fetching shared accounts for user:', userId);
    
    // Fetch accounts and populate owner, members, and financeRecords with user details
    const accounts = await SharedAccount.find({
      $or: [
        { owner: userId },
        { members: userId }
      ]
    })
      .populate('owner', 'name firstName lastName email')
      .populate('members', 'name firstName lastName email')
      .populate({
        path: 'financeRecords',
        populate: { path: 'user', select: 'name email' }
      });
    
    console.log('SharedAccountController: Found', accounts.length, 'accounts');
    
    // Log details about each account and its finance records BEFORE any saves
    for (const account of accounts) {
      console.log(`SharedAccountController: Account "${account.name}" (ID: ${account._id})`);
      console.log(`  Finance Records Count: ${account.financeRecords?.length || 0}`);
      
      if (account.financeRecords && account.financeRecords.length > 0) {
        account.financeRecords.forEach((record, index) => {
          if (typeof record === 'object' && record !== null && record._id) {
            console.log(`  Record ${index + 1}: type=${record.type}, amount=£${record.amount}, id=${record._id}, populated=${!!record.type}`);
          } else {
            console.warn(`  Record ${index + 1}: NOT POPULATED (ID only): ${record}`);
          }
        });
      } else {
        console.warn(`  Account "${account.name}" has NO finance records!`);
      }
    }
    
    // Recalculate perPersonAmount for each account to ensure it's always accurate
    // Use updateOne to avoid losing populated data
    for (const account of accounts) {
      if (account.targetAmount && account.targetAmount > 0) {
        const currentMemberCount = Array.isArray(account.members) ? account.members.length : 0;
        const newPerPersonAmount = Math.round(calculatePerPersonAmount(account.targetAmount, currentMemberCount) * 100) / 100;
        
        // Only update if the value has changed
        if (account.perPersonAmount !== newPerPersonAmount) {
          // Use updateOne to avoid interfering with populated data
          await SharedAccount.updateOne(
            { _id: account._id },
            { $set: { perPersonAmount: newPerPersonAmount } }
          );
          // Update the in-memory object so the response has the correct value
          account.perPersonAmount = newPerPersonAmount;
        }
      }
    }
    
    // Convert to plain objects to ensure JSON serialization works correctly
    // This also ensures populated data is properly included
    const accountsToReturn = await Promise.all(accounts.map(async (account) => {
      const accountObj = account.toObject ? account.toObject() : account;
      
      // Log detailed information about each account being returned
      console.log(`SharedAccountController: Processing account "${accountObj.name}"`);
      console.log(`  Finance Records Array Length (from populate): ${accountObj.financeRecords?.length || 0}`);
      
      // FALLBACK: If populate didn't work or returned empty, fetch records directly
      if (!accountObj.financeRecords || accountObj.financeRecords.length === 0) {
        console.log(`  SharedAccountController: Populate returned empty, fetching records directly for account ${accountObj._id}`);
        const directRecords = await FinanceRecord.find({ sharedAccount: accountObj._id })
          .populate('user', 'name email');
        
        console.log(`  SharedAccountController: Found ${directRecords.length} records via direct query`);
        if (directRecords.length > 0) {
          // Convert to plain objects
          accountObj.financeRecords = directRecords.map(record => {
            const recordObj = record.toObject ? record.toObject() : record;
            return recordObj;
          });
          console.log(`  SharedAccountController: Added ${accountObj.financeRecords.length} records to account`);
          
          // Also update the shared account's financeRecords array in the database
          // to ensure consistency for future fetches
          const recordIds = directRecords.map(r => r._id);
          const existingIds = (account.financeRecords || []).map((id) => id.toString());
          const missingIds = recordIds.filter(id => !existingIds.includes(id.toString()));
          
          if (missingIds.length > 0) {
            console.log(`  SharedAccountController: Found ${missingIds.length} records not in account's financeRecords array, adding them...`);
            await SharedAccount.updateOne(
              { _id: accountObj._id },
              { $push: { financeRecords: { $each: missingIds } } }
            );
            console.log(`  SharedAccountController: Added ${missingIds.length} record IDs to account's financeRecords array`);
          }
        }
      }
      
      // Log final state
      if (accountObj.financeRecords && accountObj.financeRecords.length > 0) {
        accountObj.financeRecords.forEach((record, idx) => {
          if (record && typeof record === 'object') {
            console.log(`  Record ${idx + 1}: type=${record.type}, amount=£${record.amount}, id=${record._id}`);
          } else {
            console.warn(`  Record ${idx + 1}: NOT POPULATED - ${typeof record}: ${record}`);
          }
        });
      } else {
        console.warn(`  SharedAccountController: Account "${accountObj.name}" still has NO finance records after fallback query`);
      }
      
      return accountObj;
    }));
    
    console.log('SharedAccountController: Returning', accountsToReturn.length, 'accounts to frontend');
    if (accountsToReturn.length > 0) {
      console.log('SharedAccountController: First account finance records:', accountsToReturn[0].financeRecords?.length || 0);
      console.log('SharedAccountController: First account finance records type:', typeof accountsToReturn[0].financeRecords);
      console.log('SharedAccountController: First account finance records is array:', Array.isArray(accountsToReturn[0].financeRecords));
    }
    res.json(accountsToReturn);
  } catch (err) {
    console.error('SharedAccountController: Error fetching shared accounts:', err);
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
    
    // Recalculate perPersonAmount to ensure it's always accurate
    if (account.targetAmount && account.targetAmount > 0) {
      const currentMemberCount = Array.isArray(account.members) ? account.members.length : 0;
      account.perPersonAmount = Math.round(calculatePerPersonAmount(account.targetAmount, currentMemberCount) * 100) / 100;
      // Save the updated perPersonAmount
      await account.save();
    }
    
    res.json(account);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update a shared account (owner only)
exports.updateSharedAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { name, description, targetAmount, targetDate, memberIds, action } = req.body;

    // Find the shared account
    const account = await SharedAccount.findById(id);
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    // Only the owner can update the account
    if (!account.owner.equals(userId)) {
      return res.status(403).json({ message: 'Only the account owner can update this account' });
    }

    // Update account name if provided
    if (name !== undefined) {
      account.name = name.trim();
    }

    // Update description if provided
    if (description !== undefined) {
      account.description = description.trim();
    }

    // Update target amount if provided
    if (targetAmount !== undefined) {
      account.targetAmount = parseFloat(targetAmount);
      // Recalculate per-person amount
      const totalParticipants = account.members.length + 1;
      account.perPersonAmount = Math.round(calculatePerPersonAmount(account.targetAmount, account.members.length) * 100) / 100;
    }

    // Update target date if provided
    if (targetDate !== undefined) {
      const targetDateObj = new Date(targetDate);
      if (isNaN(targetDateObj.getTime())) {
        return res.status(400).json({ message: 'Invalid target date' });
      }
      if (targetDateObj <= new Date()) {
        return res.status(400).json({ message: 'Target date must be in the future' });
      }
      account.targetDate = targetDateObj;
    }

    // Handle member management
    let membersChanged = false;
    if (memberIds !== undefined && Array.isArray(memberIds)) {
      if (action === 'add') {
        // Add new members (avoid duplicates and owner)
        const existingMembers = account.members.map(m => m.toString());
        const ownerId = account.owner.toString();
        const newMembers = memberIds.filter(
          memberId => !existingMembers.includes(memberId) && memberId !== ownerId
        );
        if (newMembers.length > 0) {
          account.members.push(...newMembers);
          membersChanged = true;
        }
      } else if (action === 'remove') {
        // Remove members (but not the owner)
        const ownerId = account.owner.toString();
        const beforeCount = account.members.length;
        account.members = account.members.filter(
          member => !memberIds.includes(member.toString()) && member.toString() !== ownerId
        );
        if (account.members.length !== beforeCount) {
          membersChanged = true;
        }
      } else {
        // Replace members list (but always keep the owner)
        const ownerId = account.owner.toString();
        const newMembers = memberIds.filter(id => id !== ownerId);
        if (JSON.stringify(account.members.map(m => m.toString()).sort()) !== JSON.stringify(newMembers.sort())) {
          account.members = newMembers;
          membersChanged = true;
        }
      }
    }

    // Recalculate per-person amount if members changed or target amount changed
    if (membersChanged || targetAmount !== undefined) {
      account.perPersonAmount = Math.round(calculatePerPersonAmount(account.targetAmount, account.members.length) * 100) / 100;
    }

    // Save the updated account
    await account.save();

    // Populate members for response
    const updatedAccount = await SharedAccount.findById(id)
      .populate('members', 'firstName lastName email');

    res.json({
      message: 'Shared account updated successfully',
      account: updatedAccount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a shared account (owner only)
exports.deleteSharedAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find the shared account
    const account = await SharedAccount.findById(id);
    if (!account) {
      return res.status(404).json({ message: 'Shared account not found' });
    }

    // Only the owner can delete the account
    if (!account.owner.equals(userId)) {
      return res.status(403).json({ message: 'Only the account owner can delete this account' });
    }

    // Remove sharedAccount reference from related finance records
    if (account.financeRecords && account.financeRecords.length > 0) {
      await FinanceRecord.updateMany(
        { _id: { $in: account.financeRecords } },
        { $unset: { sharedAccount: '' } }
      );
    }

    // Delete the shared account
    await SharedAccount.findByIdAndDelete(id);

    res.json({ message: 'Shared account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};