// ============================================
// DineBoard — Order Routes
// ============================================

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { tenantFromAuth, tenantFromSlug } = require('../middleware/tenant-context');
const orderService = require('../services/order.service');
const paymentService = require('../services/payment.service');
const whatsappService = require('../services/whatsapp.service');

const router = express.Router();

/**
 * POST /api/orders/create
 * Public: Place order (no login)
 */
router.post('/create', tenantFromSlug, async (req, res, next) => {
  try {
    const { customerName, customerPhone, items, promoCode, note, bookingId, tableId, tableToken, table, source } = req.body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, phone, and at least one item are required.',
      });
    }

    const result = await orderService.createOrder(req.tenant.id, {
      customerName, customerPhone, items, promoCode, note, bookingId,
      tableId: tableId || tableToken || table,
      source: source || 'website',
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Send WhatsApp confirmation
    try {
      await whatsappService.sendOrderConfirmation(result.order, req.tenant);
    } catch (e) {
      console.error('WhatsApp order confirmation error:', e.message);
    }

    res.status(201).json({
      success: true,
      message: result.isMerged ? 'Items added to your active table order!' : 'Order placed successfully!',
      isMerged: result.isMerged || false,
      data: result.order,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/active-table?r=slug&t=token
 * Public: Get active running order for table
 */
router.get('/active-table', tenantFromSlug, async (req, res, next) => {
  try {
    const { prisma } = require('../config/database');
    const token = req.query.t || req.query.table || req.query.tableId;
    if (!token) return res.json({ success: true, data: null });

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
        OR: [{ id: targetTableId }, { id: token }],
      },
    });

    if (!table) return res.json({ success: true, data: null });

    const activeOrder = await prisma.order.findFirst({
      where: {
        tenantId: req.tenant.id,
        assignedTableId: table.id,
        status: { in: ['pending', 'preparing', 'ready', 'served', 'billed'] },
      },
      include: {
        orderItems: { include: { menuItem: true } },
        assignedTable: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: activeOrder,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders
 * Admin: List all orders
 */
router.get('/', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const result = await orderService.getOrders(req.tenant.id, req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/orders/:id
 * Admin: Modify order (discounts, notes)
 */
router.put('/:id', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const order = await orderService.modifyOrder(req.params.id, req.tenant.id, req.body);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/orders/:id/status
 * Admin: Update order status
 */
router.put('/:id/status', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { status, paymentMethod } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'billed', 'paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Use: ${validStatuses.join(', ')}`,
      });
    }

    const order = await orderService.updateOrderStatus(req.params.id, req.tenant.id, status, paymentMethod);

    // Auto-update table status based on order status
    if (order.assignedTableId) {
      const { prisma } = require('../config/database');
      if (status === 'served' || status === 'billed') {
        // When food is served or billed, table goes to 'cleaning' after some time
        // For now, keep as occupied until paid
      }
      if (status === 'paid') {
        // When order is paid, mark table for cleaning
        await prisma.table.update({
          where: { id: order.assignedTableId },
          data: { status: 'cleaning' },
        });
        // Schedule auto-release to 'available' after cleaning time
        const tenant = await prisma.tenant.findUnique({ where: { id: req.tenant.id } });
        const cleaningMinutes = tenant?.cleaningMinutes || 15;
        setTimeout(async () => {
          try {
            await prisma.table.update({
              where: { id: order.assignedTableId },
              data: { status: 'available' },
            });
            console.log(`🪑 Table ${order.assignedTableId} auto-released after ${cleaningMinutes}min cleaning.`);
          } catch (e) {
            console.error('Auto-release error:', e.message);
          }
        }, cleaningMinutes * 60 * 1000);
      }
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders/:id/add-items
 * Customer: Add more items to existing order
 */
router.post('/:id/add-items', tenantFromSlug, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required.',
      });
    }

    const result = await orderService.addItemsToOrder(req.params.id, req.tenant.id, items);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Items added to your order!',
      data: result.order,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders/:id/send-bill
 * Admin: Manually send bill to customer
 */
router.post('/:id/send-bill', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentLink(req.params.id, req.tenant.id);
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Send payment link via WhatsApp
    const { prisma } = require('../config/database');
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    try {
      await whatsappService.sendPaymentLink(order, result.paymentLink, req.tenant);
    } catch (e) {
      console.error('WhatsApp bill send error:', e.message);
    }

    res.json({
      success: true,
      message: 'Payment link sent to customer via SMS (Razorpay) & WhatsApp!',
      data: { paymentLink: result.paymentLink },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders/:id/request-bill
 * Customer: Request bill
 */
router.post('/:id/request-bill', tenantFromSlug, async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentLink(req.params.id, req.tenant.id);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Your bill has been generated!',
      data: { paymentLink: result.paymentLink },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/by-code/:code
 * Customer: Get order by code
 */
router.get('/by-code/:code', tenantFromSlug, async (req, res, next) => {
  try {
    const order = await orderService.getOrderByCode(req.tenant.id, req.params.code);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
