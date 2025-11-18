const EmailVerification = require('../models/EmailVerification');
const emailService = require('../services/emailService');
const crypto = require('crypto');

// Generate a 6-digit verification code
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send verification code to email
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if there's already a pending verification for this email
    const existingVerification = await EmailVerification.findOne({ 
      email, 
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (existingVerification) {
      // If there's a pending verification, check if we can resend
      const timeSinceLastSent = Date.now() - existingVerification.createdAt.getTime();
      const oneMinute = 60 * 1000;

      if (timeSinceLastSent < oneMinute) {
        return res.status(429).json({ 
          message: 'Please wait 1 minute before requesting a new code',
          retryAfter: Math.ceil((oneMinute - timeSinceLastSent) / 1000)
        });
      }

      // Update the existing verification with a new code
      const newCode = generateVerificationCode();
      existingVerification.code = newCode;
      existingVerification.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      existingVerification.attempts = 0;
      await existingVerification.save();

      // Send the new code
      const emailResult = await emailService.sendVerificationCode(email, newCode);
      
      if (!emailResult.success) {
        return res.status(500).json({ 
          message: 'Failed to send verification email',
          error: emailResult.error 
        });
      }

      return res.json({ 
        message: 'Verification code sent successfully',
        expiresIn: 15 * 60 // 15 minutes in seconds
      });
    }

    // Create new verification record
    const verificationCode = generateVerificationCode();
    const verification = new EmailVerification({
      email,
      code: verificationCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    });

    await verification.save();

    // Send verification email
    const emailResult = await emailService.sendVerificationCode(email, verificationCode);
    
    if (!emailResult.success) {
      // If email sending fails, delete the verification record
      await EmailVerification.findByIdAndDelete(verification._id);
      return res.status(500).json({ 
        message: 'Failed to send verification email',
        error: emailResult.error 
      });
    }

    res.json({ 
      message: 'Verification code sent successfully',
      expiresIn: 15 * 60 // 15 minutes in seconds
    });

  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify the code
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    // Find the verification record
    const verification = await EmailVerification.findOne({ 
      email, 
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(400).json({ 
        message: 'No valid verification code found for this email. Please request a new code.' 
      });
    }

    // Check if too many attempts
    if (verification.attempts >= 3) {
      await EmailVerification.findByIdAndDelete(verification._id);
      return res.status(400).json({ 
        message: 'Too many failed attempts. Please request a new verification code.' 
      });
    }

    // Verify the code
    if (verification.code !== code) {
      verification.attempts += 1;
      await verification.save();

      const remainingAttempts = 3 - verification.attempts;
      return res.status(400).json({ 
        message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
        remainingAttempts
      });
    }

    // Code is correct - mark as verified
    verification.verified = true;
    await verification.save();

    res.json({ 
      message: 'Email verified successfully',
      verified: true
    });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check verification status
exports.checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.params;

    const verification = await EmailVerification.findOne({ 
      email, 
      verified: true,
      expiresAt: { $gt: new Date() }
    });

    res.json({ 
      verified: !!verification,
      email: email
    });

  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
