// ============================================
// DineBoard — Email Service
// Uses Nodemailer with SMTP (Gmail free tier)
// ============================================

const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
async function sendOTPEmail(to, otp, purpose = 'verification') {
  const subject = purpose === 'verification'
    ? 'DineBoard — Verify Your Email'
    : 'DineBoard — Password Reset OTP';

  const purposeText = purpose === 'verification'
    ? 'verify your email address'
    : 'reset your password';

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0A0A0F; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
      <div style="background: linear-gradient(135deg, #FF6B35, #E85A2A); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🍽️ DineBoard</h1>
      </div>
      <div style="padding: 32px; color: #F5F5F7;">
        <h2 style="margin: 0 0 16px; color: #F5F5F7; font-size: 20px;">
          ${purpose === 'verification' ? 'Verify Your Email' : 'Reset Your Password'}
        </h2>
        <p style="color: #A1A1AA; line-height: 1.6; margin-bottom: 24px;">
          Use the code below to ${purposeText}. This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="background: #12121A; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #FF6B35;">${otp}</span>
        </div>
        <p style="color: #71717A; font-size: 13px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      <div style="padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
        <p style="color: #71717A; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} DineBoard — Made with ❤️ in India
        </p>
      </div>
    </div>
  `;

  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`📧 [DEV MODE] OTP for ${to}: ${otp} (SMTP not configured)`);
    return { success: true, devMode: true };
  }

  try {
    await transporter.sendMail({
      from: `"DineBoard" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 OTP email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    // In dev, still return success so flow continues
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 [DEV FALLBACK] OTP for ${to}: ${otp}`);
      return { success: true, devMode: true };
    }
    throw error;
  }
}

module.exports = { generateOTP, sendOTPEmail };
