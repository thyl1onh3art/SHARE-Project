const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (process.env.NODE_ENV === 'production' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      this.transporter = null;
      return;
    }

    // For development, we'll use a test account
    // In production, you would use real SMTP credentials
    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
      // Development mode - use Ethereal Email test account
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass'
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } else {
      // Production mode with authentication
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
  }

  async sendVerificationCode(email, code) {
    try {
      const mailOptions = {
        from: `"SHARE Project" <${process.env.EMAIL_USER || 'noreply@shareproject.com'}>`,
        to: email,
        subject: 'Email Verification Code - SHARE Project',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">SHARE Project</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-top: 0;">Welcome to SHARE Project!</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                Thank you for signing up! To complete your registration, please use the verification code below:
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
                <li>This code will expire in 15 minutes</li>
                <li>You have 3 attempts to enter the correct code</li>
                <li>If you didn't request this code, please ignore this email</li>
              </ul>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  This is an automated message. Please do not reply to this email.
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
          SHARE Project - Email Verification
          
          Welcome to SHARE Project!
          
          Your verification code is: ${code}
          
          This code will expire in 15 minutes.
          You have 3 attempts to enter the correct code.
          
          If you didn't request this code, please ignore this email.
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Verification email sent:', info.messageId);
      
      // For development with Ethereal Email, log the preview URL
      if (process.env.NODE_ENV === 'development' && info.messageId) {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      
      // In development mode, if email fails, we'll simulate success for testing
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Simulating email success for testing');
        return { success: true, messageId: 'dev-simulated-' + Date.now() };
      }
      
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(email, resetUrl) {
    if (!this.transporter) {
      return { success: false, error: 'SMTP not configured' };
    }

    const mailOptions = {
      from: `"SHARE" <${process.env.EMAIL_USER || 'noreply@shareproject.com'}>`,
      to: email,
      subject: 'Reset your SHARE password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SHARE</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Password reset</p>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              We received a request to reset the password for this SHARE account.
            </p>
            <p style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                Choose a new password
              </a>
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              This link expires in 60 minutes. If you did not ask to reset your password, you can ignore this email.
            </p>
          </div>
        </div>
      `,
      text: [
        'SHARE — Password reset',
        '',
        'We received a request to reset the password for this SHARE account.',
        '',
        `Choose a new password: ${resetUrl}`,
        '',
        'This link expires in 60 minutes. If you did not ask to reset your password, you can ignore this email.'
      ].join('\n')
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return { success: true, messageId: 'dev-simulated-' + Date.now() };
      }
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
