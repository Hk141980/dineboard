// ============================================
// DineBoard — Report Routes
// ============================================

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantFromAuth } = require('../middleware/tenant-context');
const reportService = require('../services/report.service');

const router = express.Router();

/**
 * GET /api/reports/dashboard
 * Admin: Overview stats
 */
router.get('/dashboard', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const stats = await reportService.getDashboardStats(req.tenant.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/orders
 * Admin: Order reports
 */
router.get('/orders', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required.' });
    }
    const report = await reportService.getOrderReport(req.tenant.id, { startDate, endDate, groupBy });
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/revenue
 * Admin: Revenue reports
 */
router.get('/revenue', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required.' });
    }
    const report = await reportService.getRevenueReport(req.tenant.id, { startDate, endDate });
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/bookings
 * Admin: Booking reports
 */
router.get('/bookings', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required.' });
    }
    const report = await reportService.getBookingReport(req.tenant.id, { startDate, endDate });
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/export/pdf
 * Admin: Export report as PDF
 */
router.get('/export/pdf', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    // In production: generate PDF report and return
    res.json({
      success: true,
      message: 'PDF report generation queued. You\'ll receive it on WhatsApp.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
