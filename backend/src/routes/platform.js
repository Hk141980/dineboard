// ============================================
// DineBoard — Platform Routes (Landing Page APIs)
// ============================================

const express = require('express');
const { prisma } = require('../config/database');

const router = express.Router();

/**
 * GET /api/platform/plans
 * Public: List subscription plans
 */
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });

    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/platform/contact
 * Contact form submission
 */
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, phone, message, restaurantName } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required.',
      });
    }

    // In production: save to DB, send email notification
    console.log('Contact form submission:', { name, email, phone, message, restaurantName });

    res.json({
      success: true,
      message: 'Thank you for contacting us! We\'ll get back to you within 24 hours.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/platform/stats
 * Public: Platform statistics for landing page
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [restaurants, orders] = await Promise.all([
      prisma.tenant.count({ where: { status: { in: ['active', 'trial'] } } }),
      prisma.order.count({ where: { status: 'paid' } }),
    ]);

    res.json({
      success: true,
      data: {
        restaurants: restaurants || 50,
        ordersProcessed: orders || 10000,
        citiesServed: 5,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
