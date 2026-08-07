// ============================================
// DineBoard — AI Routes
// ============================================

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { tenantFromAuth, tenantFromSlug } = require('../middleware/tenant-context');
const aiService = require('../services/ai.service');
const { prisma } = require('../config/database');

const router = express.Router();

/**
 * POST /api/ai/recommend
 * AI food recommendations
 */
router.post('/recommend', tenantFromSlug, async (req, res, next) => {
  try {
    const { isVeg, category } = req.body;
    const recommendations = await aiService.getRecommendations(req.tenant.id, { isVeg, category });
    res.json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/conversation/:phone
 * Admin: Get conversation history for a phone number
 */
router.get('/conversation/:phone', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const logs = await prisma.aiConversationLog.findMany({
      where: {
        tenantId: req.tenant.id,
        customerPhone: req.params.phone,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/logs
 * Admin: Get all AI conversation logs
 */
router.get('/logs', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, intent } = req.query;
    const where = { tenantId: req.tenant.id };
    if (intent) where.detectedIntent = intent;

    const [logs, total] = await Promise.all([
      prisma.aiConversationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.aiConversationLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: { logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
