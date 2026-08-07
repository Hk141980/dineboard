// ============================================
// DineBoard — Super Admin Routes
// Platform management for DineBoard admins
// ============================================

const express = require('express');
const { prisma } = require('../config/database');
const { authenticate, superAdminOnly } = require('../middleware/auth');
const reportService = require('../services/report.service');
const commissionService = require('../services/commission.service');

const router = express.Router();

// All routes require super admin auth
router.use(authenticate, superAdminOnly);

/**
 * GET /api/superadmin/tenants
 * List all restaurants
 */
router.get('/tenants', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          subscriptionPlan: true,
          _count: { select: { orders: true, bookings: true, staff: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      success: true,
      data: { tenants, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/superadmin/revenue
 * Platform revenue report
 */
router.get('/revenue', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await reportService.getPlatformRevenueReport({
      startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate: endDate || new Date().toISOString(),
    });
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/superadmin/commissions
 * All commission records
 */
router.get('/commissions', async (req, res, next) => {
  try {
    const { month, year, status, page, limit } = req.query;
    const result = await commissionService.getPlatformCommissions({
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/superadmin/commissions/invoice
 * Generate monthly commission invoice for a tenant
 */
router.post('/commissions/invoice', async (req, res, next) => {
  try {
    const { tenantId, month, year } = req.body;
    const result = await commissionService.generateMonthlyInvoice(tenantId, month, year);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, data: result.invoiceData });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/superadmin/plans
 * Manage subscription plans
 */
router.post('/plans', async (req, res, next) => {
  try {
    const { name, monthlyPrice, yearlyPrice, commissionRate, bookingCommission, maxTables, maxStaff, maxMenuItems, features } = req.body;

    const plan = await prisma.subscriptionPlan.create({
      data: { name, monthlyPrice, yearlyPrice, commissionRate, bookingCommission, maxTables, maxStaff, maxMenuItems, features: features || {} },
    });

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/superadmin/tenants/:id/status
 * Suspend/activate restaurant
 */
router.put('/tenants/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'suspended', 'trial', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Use: ${validStatuses.join(', ')}` });
    }

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
