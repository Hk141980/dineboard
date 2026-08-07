// ============================================
// DineBoard — Settlement Routes
// ============================================

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantFromAuth } = require('../middleware/tenant-context');
const settlementService = require('../services/settlement.service');

const router = express.Router();

/**
 * GET /api/settlements/today
 * Summary of today's payments & settlement status
 */
router.get('/today', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const summary = await settlementService.getTodaySummary(req.tenant.id);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/settlements/settle
 * Perform daily payment settlement (Owner Only)
 */
router.post('/settle', authenticate, authorize('owner'), tenantFromAuth, async (req, res, next) => {
  try {
    const { notes } = req.body;
    const settledBy = req.user ? `${req.user.name} (${req.user.role})` : 'Owner';
    const result = await settlementService.performSettlement(req.tenant.id, { settledBy, notes });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/settlements/history
 * List past settlements
 */
router.get('/history', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const history = await settlementService.getSettlementHistory(req.tenant.id);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/settlements/:id/bank-payout
 * Settle Razorpay online funds directly to bank account (Owner Only)
 */
router.post('/:id/bank-payout', authenticate, authorize('owner'), tenantFromAuth, async (req, res, next) => {
  try {
    const result = await settlementService.settleBankPayout(req.tenant.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
