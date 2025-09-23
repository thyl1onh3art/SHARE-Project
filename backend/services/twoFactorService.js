const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const emailService = require('./emailService');
const twilio = require('twilio');

class TwoFactorService {
  constructor() {
    this.twilioClient = null;
    this.initializeTwilio();
  }

  initializeTwilio() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      console.log('✅ Twilio SMS service initialized');
    } else {
      console.warn('⚠️ Twilio credentials not found. SMS 2FA will not be available.');
    }
  }

  // Generate a secret for TOTP (Time-based One-Time Password)
  generateSecret(userId, userEmail) {
    const secret = speakeasy.generateSecret({
      name: `SHARE Project (${userEmail})`,
      issuer: 'SHARE Project',
      length: 32
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url
    };
  }

  // Generate QR code for TOTP setup
  async generateQRCode(secretUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(secretUrl);
      return qrCodeDataURL;
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  // Verify TOTP token
  verifyTOTP(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds) of tolerance
    });
  }

  // Generate a random 6-digit code
  generateRandomCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Send email verification code
  async sendEmailCode(email, code, purpose = 'login') {
    try {
      const subject = purpose === 'login' 
        ? 'SHARE Project - Two-Factor Authentication Code'
        : 'SHARE Project - Verification Code';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SHARE Project</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Two-Factor Authentication</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Security Verification</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Your two-factor authentication code is:
            </p>
            
            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: 'Courier New', monospace;">
                ${code}
              </h3>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              <strong>Important:</strong>
            </p>
            <ul style="color: #666; font-size: 14px; line-height: 1.5;">
              <li>This code will expire in 5 minutes</li>
              <li>You have 3 attempts to enter the correct code</li>
              <li>If you didn't request this code, please secure your account immediately</li>
            </ul>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This is an automated security message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `;

      const textContent = `
        SHARE Project - Two-Factor Authentication
        
        Your verification code is: ${code}
        
        This code will expire in 5 minutes.
        You have 3 attempts to enter the correct code.
        
        If you didn't request this code, please secure your account immediately.
      `;

      await emailService.sendVerificationEmail(email, code);
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending email 2FA code:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS verification code
  async sendSMSCode(phoneNumber, code, purpose = 'login') {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    try {
      const message = purpose === 'login'
        ? `Your SHARE Project 2FA code is: ${code}. This code expires in 5 minutes.`
        : `Your SHARE Project verification code is: ${code}. This code expires in 5 minutes.`;

      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log('📱 SMS 2FA code sent:', result.sid);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('❌ Error sending SMS 2FA code:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate backup codes
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push({
        code: crypto.randomBytes(4).toString('hex').toUpperCase(),
        used: false,
        createdAt: new Date()
      });
    }
    return codes;
  }

  // Verify backup code
  verifyBackupCode(backupCodes, inputCode) {
    const codeIndex = backupCodes.findIndex(
      backupCode => backupCode.code === inputCode.toUpperCase() && !backupCode.used
    );

    if (codeIndex !== -1) {
      backupCodes[codeIndex].used = true;
      return true;
    }
    return false;
  }

  // Rate limiting for 2FA attempts
  isRateLimited(attempts, maxAttempts = 5, windowMinutes = 15) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
    
    const recentAttempts = attempts.filter(attempt => attempt > windowStart);
    return recentAttempts.length >= maxAttempts;
  }
}

module.exports = new TwoFactorService();
