// ============================================
// DineBoard — Auth Routes
// Registration, login, email verification, password reset
// ============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const { generateToken, generateRefreshToken, authenticate } = require('../middleware/auth');
const { slugify } = require('../utils/helpers');
const { generateOTP, sendOTPEmail } = require('../services/email');
const { redis } = require('../config/redis');

const router = express.Router();

/**
 * POST /api/auth/send-register-otp
 * Send OTP for email verification during step 1 of registration
 */
router.post('/send-register-otp', async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingStaff = await prisma.staff.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (existingStaff) {
      return res.status(400).json({
        success: false,
        exists: true,
        message: 'An account with this email address already exists. Please Sign In.',
      });
    }

    if (phone) {
      const cleanDigits = phone.replace(/\D/g, '').replace(/^91/, '');
      if (cleanDigits.length === 10) {
        const existingPhone = await prisma.staff.findFirst({
          where: { OR: [{ phone: cleanDigits }, { phone: `+91${cleanDigits}` }] },
        });
        if (existingPhone) {
          return res.status(400).json({
            success: false,
            exists: true,
            message: 'An account with this phone number already exists.',
          });
        }
      }
    }

    const otp = generateOTP();
    try {
      await redis.set(`otp:reg:${normalizedEmail}`, otp, 'EX', 600);
    } catch (redisErr) {
      console.error('Redis error saving OTP:', redisErr.message);
    }

    const emailResult = await sendOTPEmail(normalizedEmail, otp, 'verification');

    return res.json({
      success: true,
      message: `Verification OTP sent to ${normalizedEmail}`,
      data: {
        devOtp: emailResult?.devMode ? otp : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify-register-otp
 * Verify OTP entered by user on step 1 before proceeding to restaurant details
 */
router.post('/verify-register-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let storedOtp = null;
    try {
      storedOtp = await redis.get(`otp:reg:${normalizedEmail}`);
    } catch (redisErr) {
      console.error('Redis error getting OTP:', redisErr.message);
    }

    if (!storedOtp || storedOtp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP code. Please check and try again.',
      });
    }

    try {
      await redis.set(`verified:reg:${normalizedEmail}`, '1', 'EX', 1800);
      await redis.del(`otp:reg:${normalizedEmail}`);
    } catch (redisErr) {
      console.error('Redis error setting verified state:', redisErr.message);
    }

    return res.json({
      success: true,
      message: 'Email address verified successfully!',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/check-email
 * Check if email or phone is already registered
 */
router.post('/check-email', async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingStaff = await prisma.staff.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: 'insensitive' },
        },
      });
      if (existingStaff) {
        return res.status(200).json({
          success: false,
          exists: true,
          field: 'email',
          message: 'An account with this email address already exists. Please Sign In.',
        });
      }
    }

    if (phone) {
      const cleanDigits = phone.replace(/\D/g, '').replace(/^91/, '');
      if (cleanDigits.length === 10) {
        const existingPhone = await prisma.staff.findFirst({
          where: {
            OR: [
              { phone: cleanDigits },
              { phone: `+91${cleanDigits}` },
            ],
          },
        });
        if (existingPhone) {
          return res.status(200).json({
            success: false,
            exists: true,
            field: 'phone',
            message: 'An account with this phone number already exists.',
          });
        }
      }
    }

    return res.json({ success: true, exists: false });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/register
 * New restaurant owner signup
 */
router.post('/register', async (req, res, next) => {
  try {
    const { ownerName, email, phone, password, restaurantName, address, city, state, pincode, cuisineType, planId } = req.body;

    // Validate required fields
    if (!ownerName || !email || !password || !restaurantName) {
      return res.status(400).json({
        success: false,
        message: 'Owner name, email, password, and restaurant name are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email verified in session (Redis)
    let isVerified = false;
    try {
      const verificationStatus = await redis.get(`verified:reg:${normalizedEmail}`);
      if (verificationStatus === '1') isVerified = true;
    } catch (redisErr) {
      console.error('Redis error checking verification status:', redisErr.message);
    }

    if (!isVerified) {
      return res.status(400).json({ success: false, message: 'Email not verified. Please verify your email first.' });
    }

    // Validate 10-digit phone
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');
      if (cleanPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits.',
        });
      }
    }

    // Check if email already exists
    const existingStaff = await prisma.staff.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Generate unique slug
    let slug = slugify(restaurantName);
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create tenant and owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: restaurantName,
          slug,
          phone: phone ? `+91${phone.replace(/\D/g, '').replace(/^91/, '')}` : null,
          email: normalizedEmail,
          address,
          city,
          state,
          pincode,
          cuisineType,
          subscriptionPlanId: planId || 'starter',
          status: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      const owner = await tx.staff.create({
        data: {
          tenantId: tenant.id,
          name: ownerName,
          email: normalizedEmail,
          phone: phone ? `+91${phone.replace(/\D/g, '').replace(/^91/, '')}` : null,
          passwordHash: hashedPassword,
          role: 'owner',
          isActive: true,
          emailVerified: true,
        },
      });

      return { tenant, owner };
    });

    const token = generateToken({
      id: result.owner.id,
      email: result.owner.email,
      role: 'owner',
      tenantId: result.tenant.id,
      type: 'staff',
    });

    const refreshToken = generateRefreshToken({
      id: result.owner.id,
      type: 'staff',
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to DineBoard.',
      data: {
        token,
        refreshToken,
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          status: result.tenant.status,
          trialEndsAt: result.tenant.trialEndsAt,
        },
        user: {
          id: result.owner.id,
          name: result.owner.name,
          email: result.owner.email,
          role: result.owner.role,
          emailVerified: false,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email OTP after registration
 */
router.post('/verify-email', async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required.',
      });
    }

    const staff = await prisma.staff.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    if (staff.emailVerified) {
      return res.json({
        success: true,
        message: 'Email already verified.',
      });
    }

    if (!staff.otpCode || staff.otpCode !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    if (staff.otpExpiry && new Date() > staff.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Mark as verified
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        emailVerified: true,
        otpCode: null,
        otpExpiry: null,
      },
    });

    const token = generateToken({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      tenantId: staff.tenantId,
      type: 'staff',
    });

    res.json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        token,
        tenant: {
          id: staff.tenant.id,
          name: staff.tenant.name,
          slug: staff.tenant.slug,
          status: staff.tenant.status,
        },
        user: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          emailVerified: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/resend-otp
 * Resend verification OTP
 */
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { email } = req.body;

    const staff = await prisma.staff.findUnique({ where: { email } });
    if (!staff) {
      return res.json({ success: true, message: 'If the email exists, a new OTP will be sent.' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.staff.update({
      where: { id: staff.id },
      data: { otpCode: otp, otpExpiry },
    });

    await sendOTPEmail(email, otp, 'verification');

    res.json({
      success: true,
      message: 'A new OTP has been sent to your email.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Staff/Owner login — checks email verification
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const staff = await prisma.staff.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!staff.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact the restaurant owner.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, staff.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check email verification
    if (!staff.emailVerified) {
      // Send new OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.staff.update({
        where: { id: staff.id },
        data: { otpCode: otp, otpExpiry },
      });
      await sendOTPEmail(email, otp, 'verification');

      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. A new OTP has been sent.',
        requiresVerification: true,
        email: staff.email,
      });
    }

    const token = generateToken({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      tenantId: staff.tenantId,
      type: 'staff',
    });

    const refreshToken = generateRefreshToken({
      id: staff.id,
      type: 'staff',
    });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        tenant: {
          id: staff.tenant.id,
          name: staff.tenant.name,
          slug: staff.tenant.slug,
          logoUrl: staff.tenant.logoUrl,
          primaryColor: staff.tenant.primaryColor,
          status: staff.tenant.status,
        },
        user: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          emailVerified: staff.emailVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login/superadmin
 * Super admin login
 */
router.post('/login/superadmin', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.superAdmin.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: 'superadmin',
      type: 'superadmin',
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'superadmin',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Send OTP for password reset
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const staff = await prisma.staff.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        exists: false,
        message: 'No account found with this email address. Please check your email or Register.',
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        resetToken: otp,
        resetTokenExpiry: otpExpiry,
      },
    });

    const emailResult = await sendOTPEmail(staff.email, otp, 'reset');

    res.json({
      success: true,
      message: `Reset OTP sent successfully to ${staff.email}.`,
      data: {
        devOtp: emailResult?.devMode ? otp : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Verify OTP and reset password
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const staff = await prisma.staff.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!staff || !staff.resetToken || staff.resetToken !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.',
      });
    }

    if (staff.resetTokenExpiry && new Date() > staff.resetTokenExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        emailVerified: true,
      },
    });

    res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    if (req.user.type === 'superadmin') {
      const admin = await prisma.superAdmin.findUnique({
        where: { id: req.user.id },
      });
      return res.json({ success: true, data: admin });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: req.user.id },
      include: { tenant: { include: { subscriptionPlan: true } } },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          emailVerified: staff.emailVerified,
        },
        tenant: staff.tenant,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
