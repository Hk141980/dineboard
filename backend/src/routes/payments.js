// ============================================
// DineBoard — Payment Routes
// ============================================

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { tenantFromAuth } = require('../middleware/tenant-context');
const paymentService = require('../services/payment.service');
const commissionService = require('../services/commission.service');

const router = express.Router();

/**
 * POST /api/payments/create-link
 * Generate Razorpay payment link for an order
 */
router.post('/create-link', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const result = await paymentService.createPaymentLink(orderId, req.tenant.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/webhook
 * Razorpay payment webhook
 */
router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const result = await paymentService.handlePaymentWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/commissions
 * Admin: View commission history
 */
router.get('/commissions', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { month, year, page, limit } = req.query;
    const result = await commissionService.getTenantCommissions(req.tenant.id, {
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/verify/:orderId
 * Admin/Client: Verify payment status of an order
 */
router.post('/verify/:orderId', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const result = await paymentService.verifyOrderPayment(req.params.orderId, req.tenant.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/callback
 * Razorpay payment callback (redirect after payment)
 */
router.get('/callback', async (req, res) => {
  const { razorpay_payment_id, razorpay_payment_link_id } = req.query;

  if (razorpay_payment_link_id || razorpay_payment_id) {
    try {
      const { prisma } = require('../config/database');
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { paymentLinkId: razorpay_payment_link_id || 'NONE' },
            { paymentLinkId: razorpay_payment_id || 'NONE' }
          ]
        },
      });

      if (order && order.status !== 'paid') {
        await paymentService.markOrderAsPaid(order.id, order.tenantId, {
          paymentId: razorpay_payment_id || razorpay_payment_link_id,
          method: 'razorpay_link',
          amount: Number(order.total),
        });
        console.log(`✅ Auto-confirmed paid order ${order.orderCode} via payment callback`);
      }
    } catch (e) {
      console.error('Payment callback auto-confirm error:', e);
    }
  }

  // Redirect to success page
  res.redirect(`${process.env.APP_URL}/payment-success?payment_id=${razorpay_payment_id || ''}`);
});

module.exports = router;
