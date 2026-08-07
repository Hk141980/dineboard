// ============================================
// DineBoard — Restaurant Routes
// Restaurant settings & configuration
// ============================================

const express = require('express');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantFromAuth, tenantFromSlug } = require('../middleware/tenant-context');

const router = express.Router();

/**
 * GET /api/restaurants/by-slug/:slug
 * Public: Get restaurant info by slug
 */
router.get('/by-slug/:slug', tenantFromSlug, async (req, res, next) => {
  try {
    const tenant = req.tenant;

    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        phone: tenant.phone,
        address: tenant.address,
        city: tenant.city,
        state: tenant.state,
        openingTime: tenant.openingTime,
        closingTime: tenant.closingTime,
        primaryColor: tenant.primaryColor,
        tagline: tenant.tagline,
        description: tenant.description,
        cuisineType: tenant.cuisineType,
        bookingSlotMinutes: tenant.bookingSlotMinutes,
        diningMinutes: tenant.diningMinutes,
        cleaningMinutes: tenant.cleaningMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/restaurants/settings
 * Admin: Get own restaurant settings (authenticated)
 */
router.get('/settings', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant.id },
      include: { subscriptionPlan: true },
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    }

    res.json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/restaurants/settings
 * Owner: Update restaurant details
 */
router.put('/settings', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    const {
      name, logoUrl, phone, address, city, state, pincode,
      gstNumber, openingTime, closingTime, primaryColor,
      tagline, description, cuisineType,
      bookingSlotMinutes, diningMinutes, cleaningMinutes,
      whatsappNumber, metaPhoneNumberId, metaAccessToken,
    } = req.body;

    if (whatsappNumber || metaPhoneNumberId) {
      const cleanWp = whatsappNumber ? String(whatsappNumber).replace(/\D/g, '') : undefined;
      const cleanMetaId = metaPhoneNumberId ? String(metaPhoneNumberId).trim() : undefined;

      if (cleanWp || cleanMetaId) {
        await prisma.tenant.updateMany({
          where: {
            id: { not: req.tenant.id },
            OR: [
              ...(cleanMetaId ? [{ metaPhoneNumberId: cleanMetaId }] : []),
              ...(cleanWp ? [
                { whatsappNumber: cleanWp },
                ...(cleanWp.length >= 10 ? [{ whatsappNumber: { contains: cleanWp.slice(-10) } }] : [])
              ] : [])
            ]
          },
          data: {
            whatsappNumber: '',
            metaPhoneNumberId: ''
          }
        }).catch((err) => console.error('Error releasing WhatsApp credentials from old tenants:', err.message));
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: req.tenant.id },
      data: {
        ...(name && { name }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(city && { city }),
        ...(state && { state }),
        ...(pincode && { pincode }),
        ...(gstNumber !== undefined && { gstNumber }),
        ...(openingTime && { openingTime }),
        ...(closingTime && { closingTime }),
        ...(primaryColor && { primaryColor }),
        ...(tagline !== undefined && { tagline }),
        ...(description !== undefined && { description }),
        ...(cuisineType && { cuisineType }),
        ...(bookingSlotMinutes && { bookingSlotMinutes }),
        ...(diningMinutes && { diningMinutes }),
        ...(cleaningMinutes && { cleaningMinutes }),
        ...(whatsappNumber !== undefined && { whatsappNumber }),
        ...(metaPhoneNumberId !== undefined && { metaPhoneNumberId }),
        ...(metaAccessToken !== undefined && { metaAccessToken }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/restaurants/payment-config
 * Owner: Set own Razorpay keys
 */
router.put('/payment-config', authenticate, authorize('owner'), tenantFromAuth, async (req, res, next) => {
  try {
    const useOwn = req.body.usesOwnRazorpay !== undefined ? req.body.usesOwnRazorpay : req.body.useOwnRazorpay;
    const disableMaster = req.body.disableMasterRazorpay !== undefined ? req.body.disableMasterRazorpay : req.body.disableMaster;
    const keyId = req.body.razorpayKeyId || req.body.keyId;
    const keySecret = req.body.razorpayKeySecret || req.body.keySecret;

    const usesOwnRazorpay = !!useOwn;
    const disableMasterRazorpay = !!disableMaster;
    const updateData = { usesOwnRazorpay, disableMasterRazorpay };

    if (usesOwnRazorpay) {
      updateData.paymentConfig = { keyId: keyId || '', keySecret: keySecret || '' };
    } else {
      updateData.paymentConfig = null;
    }

    const updated = await prisma.tenant.update({
      where: { id: req.tenant.id },
      data: updateData,
    });

    res.json({
      success: true,
      message: disableMasterRazorpay && !usesOwnRazorpay
        ? 'Master Razorpay online collection turned off. Online payments disabled.'
        : usesOwnRazorpay
        ? 'Own Razorpay configured. Commissions will be invoiced monthly.'
        : 'Using platform Razorpay. Commissions auto-deducted via Route.',
      data: {
        usesOwnRazorpay: updated.usesOwnRazorpay,
        disableMasterRazorpay: updated.disableMasterRazorpay,
        paymentConfig: updated.paymentConfig,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/restaurants/bank-details
 * Owner: Configure bank account details for settlements
 */
router.put('/bank-details', authenticate, authorize('owner'), tenantFromAuth, async (req, res, next) => {
  try {
    const { accountName, accountNumber, ifscCode, bankName, branch, upiId } = req.body;

    const bankDetails = {
      accountName: accountName || '',
      accountNumber: accountNumber || '',
      ifscCode: ifscCode ? ifscCode.toUpperCase().trim() : '',
      bankName: bankName || '',
      branch: branch || '',
      upiId: upiId || '',
      updatedAt: new Date().toISOString(),
    };

    const updated = await prisma.tenant.update({
      where: { id: req.tenant.id },
      data: { bankDetails },
    });

    res.json({
      success: true,
      message: 'Bank account details updated successfully!',
      data: { bankDetails: updated.bankDetails },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/restaurants/whatsapp-config
 * Owner: Configure WhatsApp number
 */
router.put('/whatsapp-config', authenticate, authorize('owner'), tenantFromAuth, async (req, res, next) => {
  try {
    const { whatsappNumber, watiPhoneId } = req.body;

    const updated = await prisma.tenant.update({
      where: { id: req.tenant.id },
      data: { whatsappNumber, watiPhoneId },
    });

    res.json({
      success: true,
      message: 'WhatsApp configuration updated.',
      data: {
        whatsappNumber: updated.whatsappNumber,
        watiPhoneId: updated.watiPhoneId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/restaurants/settings/logo
 * Owner: Upload restaurant logo (S3 or local fallback)
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use memory storage for S3 uploads
const memStorage = multer.memoryStorage();

// Local fallback storage
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${req.tenant.id}-${Date.now()}${ext}`);
  },
});

// Determine storage based on S3 config
const isS3Configured = !!(process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
const upload = multer({
  storage: isS3Configured ? memStorage : diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const isValid = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(isValid ? null : new Error('Only image files allowed.'), isValid);
  },
});

router.post('/settings/logo', authenticate, authorize('owner', 'manager'), tenantFromAuth,
  upload.single('logo'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }

      let logoUrl;

      if (isS3Configured) {
        // Upload to AWS S3
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: process.env.AWS_REGION || 'ap-south-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        const ext = path.extname(req.file.originalname);
        const key = `logos/logo-${req.tenant.id}-${Date.now()}${ext}`;

        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }));

        // Store as API proxy URL (no public S3 access needed)
        logoUrl = `/api/uploads/s3/${key}`;
        console.log(`📷 Logo uploaded to S3: ${key}`);
      } else {
        // Local fallback
        logoUrl = `/uploads/${req.file.filename}`;
        console.log(`📷 Logo saved locally: ${logoUrl}`);
      }

      await prisma.tenant.update({
        where: { id: req.tenant.id },
        data: { logoUrl },
      });

      res.json({
        success: true,
        message: isS3Configured ? 'Logo uploaded to S3!' : 'Logo uploaded locally.',
        data: { logoUrl },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/uploads/s3/*
 * Public: Serve S3 files through API proxy (no public S3 access needed)
 */
router.get('/logo-proxy/:key(*)', async (req, res, next) => {
  try {
    if (!isS3Configured) {
      return res.status(404).json({ success: false, message: 'S3 not configured.' });
    }

    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const result = await s3.send(new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: req.params.key,
    }));

    // Set caching headers (cache for 24 hours)
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (result.ContentType) res.setHeader('Content-Type', result.ContentType);
    if (result.ContentLength) res.setHeader('Content-Length', result.ContentLength);

    // Stream the S3 object to the response
    result.Body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }
    next(error);
  }
});

module.exports = router;


