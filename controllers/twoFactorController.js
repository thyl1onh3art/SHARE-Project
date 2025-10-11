const TwoFactorAuth = require('../models/TwoFactorAuth');
const TwoFactorCode = require('../models/TwoFactorCode');
const User = require('../models/User');
const twoFactorService = require('../services/twoFactorService');
const auth = require('../middleware/auth');

// Setup 2FA for a user
exports.setup2FA = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { method } = req.body; // 'email' or 'sms'

    if (!['email', 'sms'].includes(method)) {
      return res.status(400).json({ message: 'Invalid 2FA method. Use "email" or "sms"' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get or create 2FA record
    let twoFactorRecord = await TwoFactorAuth.findOne({ userId });
    if (!twoFactorRecord) {
      twoFactorRecord = new TwoFactorAuth({ userId });
    }

    if (method === 'email') {
      // Generate TOTP secret for email
      const secretData = twoFactorService.generateSecret(userId, user.email);
      twoFactorRecord.emailSecret = secretData.secret;
      
      // Generate QR code
      const qrCodeUrl = await twoFactorService.generateQRCode(secretData.qrCodeUrl);
      
      res.json({
        message: '2FA setup initiated for email',
        qrCode: qrCodeUrl,
        secret: secretData.secret, // For manual entry
        manualEntryKey: secretData.secret
      });
    } else if (method === 'sms') {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required for SMS 2FA' });
      }

      // Validate phone number format (basic validation)
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ message: 'Invalid phone number format. Use international format (+1234567890)' });
      }

      twoFactorRecord.phoneNumber = phoneNumber;
      
      // Send verification SMS
      const code = twoFactorService.generateRandomCode();
      const smsResult = await twoFactorService.sendSMSCode(phoneNumber, code, 'setup');
      
      if (!smsResult.success) {
        return res.status(500).json({ message: 'Failed to send SMS verification code', error: smsResult.error });
      }

      // Store verification code
      const verificationCode = new TwoFactorCode({
        userId,
        code,
        type: 'sms',
        purpose: 'setup'
      });
      await verificationCode.save();

      res.json({
        message: 'SMS verification code sent to your phone',
        phoneNumber: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') // Mask phone number
      });
    }

    await twoFactorRecord.save();
  } catch (error) {
    console.error('❌ 2FA setup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify and enable 2FA
exports.verifyAndEnable2FA = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { method, code, phoneNumber } = req.body;

    if (!['email', 'sms'].includes(method)) {
      return res.status(400).json({ message: 'Invalid 2FA method' });
    }

    const twoFactorRecord = await TwoFactorAuth.findOne({ userId });
    if (!twoFactorRecord) {
      return res.status(404).json({ message: '2FA setup not found. Please setup 2FA first.' });
    }

    let isValid = false;

    if (method === 'email') {
      // Verify TOTP code
      isValid = twoFactorService.verifyTOTP(twoFactorRecord.emailSecret, code);
      if (isValid) {
        twoFactorRecord.emailEnabled = true;
      }
    } else if (method === 'sms') {
      // Verify SMS code
      const verificationCode = await TwoFactorCode.findOne({
        userId,
        type: 'sms',
        purpose: 'setup',
        code,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (verificationCode) {
        isValid = true;
        verificationCode.used = true;
        await verificationCode.save();
        
        twoFactorRecord.phoneEnabled = true;
        twoFactorRecord.phoneNumber = phoneNumber;
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Generate backup codes
    const backupCodes = twoFactorService.generateBackupCodes();
    twoFactorRecord.backupCodes = backupCodes;

    await twoFactorRecord.save();

    res.json({
      message: `${method.toUpperCase()} 2FA enabled successfully`,
      backupCodes: backupCodes.map(bc => bc.code),
      warning: 'Save these backup codes in a secure location. They can only be used once.'
    });
  } catch (error) {
    console.error('❌ 2FA verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send 2FA code for login
exports.send2FACode = async (req, res) => {
  try {
    const { email, method } = req.body;

    if (!email || !method) {
      return res.status(400).json({ message: 'Email and method are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if 2FA is enabled for this method
    const twoFactorRecord = await TwoFactorAuth.findOne({ userId: user._id });
    if (!twoFactorRecord) {
      return res.status(400).json({ message: '2FA not enabled for this user' });
    }

    if (method === 'email' && !twoFactorRecord.emailEnabled) {
      return res.status(400).json({ message: 'Email 2FA not enabled' });
    }

    if (method === 'sms' && !twoFactorRecord.phoneEnabled) {
      return res.status(400).json({ message: 'SMS 2FA not enabled' });
    }

    // Generate and send code
    const code = twoFactorService.generateRandomCode();
    
    if (method === 'email') {
      const emailResult = await twoFactorService.sendEmailCode(user.email, code, 'login');
      if (!emailResult.success) {
        return res.status(500).json({ message: 'Failed to send email code', error: emailResult.error });
      }
    } else if (method === 'sms') {
      const smsResult = await twoFactorService.sendSMSCode(twoFactorRecord.phoneNumber, code, 'login');
      if (!smsResult.success) {
        return res.status(500).json({ message: 'Failed to send SMS code', error: smsResult.error });
      }
    }

    // Store verification code
    const verificationCode = new TwoFactorCode({
      userId: user._id,
      code,
      type: method,
      purpose: 'login'
    });
    await verificationCode.save();

    res.json({
      message: `2FA code sent via ${method}`,
      maskedContact: method === 'email' 
        ? user.email.replace(/(.{2}).*(@.*)/, '$1***$2')
        : twoFactorRecord.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    });
  } catch (error) {
    console.error('❌ Send 2FA code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify 2FA code for login
exports.verify2FACode = async (req, res) => {
  try {
    const { email, code, method } = req.body;

    if (!email || !code || !method) {
      return res.status(400).json({ message: 'Email, code, and method are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if 2FA is enabled
    const twoFactorRecord = await TwoFactorAuth.findOne({ userId: user._id });
    if (!twoFactorRecord) {
      return res.status(400).json({ message: '2FA not enabled for this user' });
    }

    let isValid = false;

    if (method === 'email') {
      // Verify TOTP code
      isValid = twoFactorService.verifyTOTP(twoFactorRecord.emailSecret, code);
    } else if (method === 'sms') {
      // Verify SMS code
      const verificationCode = await TwoFactorCode.findOne({
        userId: user._id,
        type: 'sms',
        purpose: 'login',
        code,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (verificationCode) {
        isValid = true;
        verificationCode.used = true;
        await verificationCode.save();
      }
    } else if (method === 'backup') {
      // Verify backup code
      isValid = twoFactorService.verifyBackupCode(twoFactorRecord.backupCodes, code);
      if (isValid) {
        await twoFactorRecord.save(); // Save the updated backup codes
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid 2FA code' });
    }

    // Update last used timestamp
    twoFactorRecord.lastUsed = new Date();
    await twoFactorRecord.save();

    res.json({
      message: '2FA verification successful',
      userId: user._id,
      email: user.email
    });
  } catch (error) {
    console.error('❌ 2FA verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get 2FA status
exports.get2FAStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const twoFactorRecord = await TwoFactorAuth.findOne({ userId });
    if (!twoFactorRecord) {
      return res.json({
        emailEnabled: false,
        phoneEnabled: false,
        backupCodesCount: 0
      });
    }

    res.json({
      emailEnabled: twoFactorRecord.emailEnabled,
      phoneEnabled: twoFactorRecord.phoneEnabled,
      phoneNumber: twoFactorRecord.phoneNumber ? 
        twoFactorRecord.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : null,
      backupCodesCount: twoFactorRecord.backupCodes.filter(code => !code.used).length,
      lastUsed: twoFactorRecord.lastUsed
    });
  } catch (error) {
    console.error('❌ Get 2FA status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Disable 2FA
exports.disable2FA = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { method } = req.body;

    if (!['email', 'sms', 'all'].includes(method)) {
      return res.status(400).json({ message: 'Invalid method. Use "email", "sms", or "all"' });
    }

    const twoFactorRecord = await TwoFactorAuth.findOne({ userId });
    if (!twoFactorRecord) {
      return res.status(404).json({ message: '2FA not enabled for this user' });
    }

    if (method === 'email') {
      twoFactorRecord.emailEnabled = false;
      twoFactorRecord.emailSecret = undefined;
    } else if (method === 'sms') {
      twoFactorRecord.phoneEnabled = false;
      twoFactorRecord.phoneNumber = undefined;
      twoFactorRecord.phoneSecret = undefined;
    } else if (method === 'all') {
      twoFactorRecord.emailEnabled = false;
      twoFactorRecord.phoneEnabled = false;
      twoFactorRecord.emailSecret = undefined;
      twoFactorRecord.phoneNumber = undefined;
      twoFactorRecord.phoneSecret = undefined;
      twoFactorRecord.backupCodes = [];
    }

    await twoFactorRecord.save();

    res.json({
      message: `${method.toUpperCase()} 2FA disabled successfully`
    });
  } catch (error) {
    console.error('❌ Disable 2FA error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
