// ============================================
// DineBoard — Invoice Routes
// ============================================

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantFromAuth } = require('../middleware/tenant-context');
const invoiceService = require('../services/invoice.service');

const router = express.Router();

/**
 * POST /api/invoices/generate/:orderId
 * Admin: Generate invoice with GST
 */
router.post('/generate/:orderId', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const result = await invoiceService.generateInvoice(req.params.orderId, req.tenant.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, data: result.invoice });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/invoices/:id/pdf
 * Public: Download invoice PDF
 */
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { prisma } = require('../config/database');
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });

    if (invoice && invoice.pdfUrl && invoice.pdfUrl.startsWith('/api/uploads/s3/')) {
      return res.redirect(invoice.pdfUrl);
    }

    const result = await invoiceService.generatePDF(req.params.id);
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${result.invoice.invoiceNumber}.pdf`);
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/invoices/:orderId/send
 * Admin: Send invoice to customer
 */
router.post('/:orderId/send', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const result = await invoiceService.sendInvoice(req.params.orderId, req.tenant.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, message: 'Invoice sent to customer.', data: result.invoice });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
