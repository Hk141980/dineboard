// ============================================
// DineBoard — Menu Routes
// ============================================

const express = require('express');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantFromAuth, tenantFromSlug } = require('../middleware/tenant-context');

const router = express.Router();

const toTitleCase = (str) => {
  if (!str) return 'General';
  return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

/**
 * GET /api/menu/by-slug/:slug
 * Public: Get menu items for a restaurant
 */
router.get('/by-slug/:slug', tenantFromSlug, async (req, res, next) => {
  try {
    const { category, vegOnly } = req.query;
    const where = { tenantId: req.tenant.id, isAvailable: true };
    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (vegOnly === 'true') where.isVeg = true;

    const items = await prisma.menuItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    // Group by category (case-insensitive & trimmed, Title Cased for display)
    const grouped = {};
    const categoryMap = {};

    const normalizedItems = items.map(item => {
      const catName = toTitleCase(item.category);
      const key = catName.toLowerCase();
      if (!categoryMap[key]) {
        categoryMap[key] = catName;
      }
      const displayCategory = categoryMap[key];
      if (!grouped[displayCategory]) grouped[displayCategory] = [];
      const normItem = { ...item, category: displayCategory };
      grouped[displayCategory].push(normItem);
      return normItem;
    });

    res.json({ success: true, data: { items: normalizedItems, grouped } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/menu/items
 * Admin: Get all menu items (including unavailable)
 */
router.get('/items', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: { tenantId: req.tenant.id },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    const normalizedItems = items.map(i => ({ ...i, category: toTitleCase(i.category) }));
    res.json({ success: true, data: normalizedItems });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/menu/items
 * Owner/Manager: Add menu item
 */
router.post('/items', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    const { name, description, price, priceHalf, category, isVeg, imageUrl, sortOrder } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required.',
      });
    }

    // Check plan limits
    const count = await prisma.menuItem.count({ where: { tenantId: req.tenant.id } });
    if (req.tenant.subscriptionPlan && count >= req.tenant.subscriptionPlan.maxMenuItems) {
      return res.status(403).json({
        success: false,
        message: `Menu item limit reached (${req.tenant.subscriptionPlan.maxMenuItems}). Upgrade your plan.`,
      });
    }

    const item = await prisma.menuItem.create({
      data: {
        tenantId: req.tenant.id,
        name,
        description,
        price,
        priceHalf: priceHalf ? parseFloat(priceHalf) : null,
        category: toTitleCase(category),
        isVeg: isVeg !== false,
        imageUrl,
        sortOrder: sortOrder || 0,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/menu/items/:id
 * Owner/Manager: Update menu item
 */
router.put('/items/:id', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    const { name, description, price, priceHalf, category, isVeg, isAvailable, imageUrl, sortOrder } = req.body;

    const item = await prisma.menuItem.update({
      where: { id: req.params.id, tenantId: req.tenant.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        priceHalf: priceHalf !== undefined ? (priceHalf ? parseFloat(priceHalf) : null) : undefined,
        ...(category && { category: toTitleCase(category) }),
        ...(isVeg !== undefined && { isVeg }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/menu/items/:id
 * Owner/Manager: Delete menu item
 */
router.delete('/items/:id', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    await prisma.menuItem.delete({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    res.json({ success: true, message: 'Menu item deleted.' });
  } catch (error) {
    next(error);
  }
});
/**
 * POST /api/menu/upload-image
 * Owner/Manager: Upload menu item image (S3 or local fallback)
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const memStorage = multer.memoryStorage();
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `menu-${req.tenant.id}-${Date.now()}${ext}`);
  },
});

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

router.post('/upload-image', authenticate, authorize('owner', 'manager'), tenantFromAuth,
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded.' });
      }

      let imageUrl;

      if (isS3Configured) {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: process.env.AWS_REGION || 'ap-south-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        const ext = path.extname(req.file.originalname);
        const key = `menu/menu-${req.tenant.id}-${Date.now()}${ext}`;

        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }));

        imageUrl = `/api/uploads/s3/${key}`;
      } else {
        imageUrl = `/uploads/${req.file.filename}`;
      }

      res.json({
        success: true,
        message: 'Menu image uploaded successfully.',
        data: { imageUrl },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
