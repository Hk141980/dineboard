// ============================================
// DineBoard — Promo Code Routes
// ============================================

const express = require('express');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantFromAuth, tenantFromSlug } = require('../middleware/tenant-context');

const router = express.Router();

/**
 * GET /api/promos
 * Admin: List promo codes
 */
router.get('/', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    const promos = await prisma.promoCode.findMany({
      where: { tenantId: req.tenant.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: promos });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/promos
 * Admin: Create promo code
 */
router.post('/', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, validFrom, validUntil, maxUses } = req.body;

    if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
      return res.status(400).json({ success: false, message: 'Code, discount type, value, and validity dates are required.' });
    }

    const promo = await prisma.promoCode.create({
      data: {
        tenantId: req.tenant.id,
        code: code.toUpperCase(),
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount || 0,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        maxUses: maxUses || 100,
      },
    });

    res.status(201).json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/promos/:id
 * Admin: Update promo
 */
router.put('/:id', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    const { discountValue, minOrderAmount, validUntil, maxUses, isActive } = req.body;

    const promo = await prisma.promoCode.update({
      where: { id: req.params.id, tenantId: req.tenant.id },
      data: {
        ...(discountValue !== undefined && { discountValue }),
        ...(minOrderAmount !== undefined && { minOrderAmount }),
        ...(validUntil && { validUntil: new Date(validUntil) }),
        ...(maxUses !== undefined && { maxUses }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/promos/validate
 * Public: Validate promo code
 */
router.post('/validate', tenantFromSlug, async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Promo code is required.' });
    }

    const orderService = require('../services/order.service');
    const result = await orderService.validatePromoCode(req.tenant.id, code, orderAmount || 0);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
