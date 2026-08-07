// ============================================
// DineBoard — Table Routes
// ============================================

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantFromAuth } = require('../middleware/tenant-context');
const tableService = require('../services/table.service');

const router = express.Router();

/**
 * GET /api/tables
 * Admin: List all tables
 */
router.get('/', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const tables = await tableService.getTables(req.tenant.id, req.query);
    res.json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tables/stats
 * Admin: Get table utilization stats
 */
router.get('/stats', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const stats = await tableService.getTableStats(req.tenant.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tables
 * Admin: Add table
 */
router.post('/', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    const result = await tableService.createTable(req.tenant.id, req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tables/:id
 * Admin: Update table
 */
router.put('/:id', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    const result = await tableService.updateTable(req.params.id, req.tenant.id, req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, data: result.table });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tables/:id/status
 * Admin: Manual status toggle
 */
router.put('/:id/status', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Use: ${validStatuses.join(', ')}`,
      });
    }
    const table = await tableService.updateTableStatus(req.params.id, req.tenant.id, status);
    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tables/combine
 * Admin: Combine tables for seating
 */
router.post('/combine', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    const { tableIds, newCapacity, combinedName } = req.body;
    const result = await tableService.updateSeatingCombination(
      req.tenant.id, { tableIds, newCapacity, combinedName }
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tables/available?r=slug
 * Public: Get available tables for customers to choose from
 */
const { tenantFromSlug } = require('../middleware/tenant-context');

router.get('/available', tenantFromSlug, async (req, res, next) => {
  try {
    const { prisma } = require('../config/database');
    const tables = await prisma.table.findMany({
      where: { tenantId: req.tenant.id, status: 'available', isActive: true },
      select: { id: true, name: true, capacity: true, section: true },
      orderBy: [{ section: 'asc' }, { capacity: 'asc' }],
    });

    res.json({
      success: true,
      data: tables,
      totalAvailable: tables.length,
      allBooked: tables.length === 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tables/resolve?r=slug&t=token
 * Public: Validate encrypted table QR token and return table details
 */
router.get('/resolve', tenantFromSlug, async (req, res, next) => {
  try {
    const { prisma } = require('../config/database');
    const token = req.query.t || req.query.table || req.query.tableId;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Table token required.' });
    }

    let targetTableId = token;
    try {
      if (token.startsWith('tbl_') || token.startsWith('eyJ')) {
        const raw = Buffer.from(token.replace(/^tbl_/, ''), 'base64url').toString('utf8');
        const parsed = JSON.parse(raw);
        if (parsed.id) targetTableId = parsed.id;
      }
    } catch (e) {}

    const table = await prisma.table.findFirst({
      where: {
        tenantId: req.tenant.id,
        isActive: true,
        OR: [
          { id: targetTableId },
          { id: token },
        ],
      },
      select: { id: true, name: true, capacity: true, section: true },
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Invalid table QR token.' });
    }

    res.json({
      success: true,
      data: {
        id: table.id,
        name: table.name,
        section: table.section,
        capacity: table.capacity,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tables/auto-release
 * System: Release tables that exceeded dining + cleaning time
 */
router.post('/auto-release', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { prisma } = require('../config/database');
    const cutoffTime = new Date(Date.now() - 60 * 60 * 1000);

    // Find occupied tables from orders that are completed/paid
    const oldOrders = await prisma.order.findMany({
      where: {
        tenantId: req.tenant.id,
        assignedTableId: { not: null },
        status: { in: ['served', 'completed', 'paid'] },
        updatedAt: { lte: cutoffTime },
      },
      select: { assignedTableId: true },
    });

    const tableIds = [...new Set(oldOrders.map(o => o.assignedTableId).filter(Boolean))];

    if (tableIds.length > 0) {
      await prisma.table.updateMany({
        where: { id: { in: tableIds }, status: { in: ['occupied', 'cleaning'] } },
        data: { status: 'available' },
      });
    }

    // Also release cleaning tables after cleaning time
    const cleaningCutoff = new Date(Date.now() - (tenant.cleaningMinutes || 15) * 60 * 1000);
    await prisma.table.updateMany({
      where: {
        tenantId: req.tenant.id,
        status: 'cleaning',
        updatedAt: { lte: cleaningCutoff },
      },
      data: { status: 'available' },
    });

    res.json({ success: true, message: `Released ${tableIds.length} tables.` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
