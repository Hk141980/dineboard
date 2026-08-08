// ============================================
// DineBoard — Invoice Service
// Invoice generation with GST support
// ============================================

const { prisma } = require('../config/database');
const { generateInvoiceNumber, calculateGST } = require('../utils/helpers');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InvoiceService {
  /**
   * Generate invoice for an order
   */
  async generateInvoice(orderId, tenantId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: {
        orderItems: { include: { menuItem: true } },
        assignedTable: true,
      },
    });

    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    // Check if invoice already exists
    const existing = await prisma.invoice.findUnique({
      where: { orderId },
    });
    if (existing) {
      return { success: true, invoice: existing };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const invoiceNumber = generateInvoiceNumber();

    // Calculate GST if restaurant has GST number
    let gstData = { cgst: 0, sgst: 0, igst: 0 };
    if (tenant.gstNumber) {
      gstData = calculateGST(Number(order.subtotal) - Number(order.discountAmount));
    }

    let invoice = await prisma.invoice.create({
      data: {
        tenantId,
        orderId,
        invoiceNumber,
        subtotal: order.subtotal,
        cgst: gstData.cgst,
        sgst: gstData.sgst,
        igst: gstData.igst,
        total: order.total,
        gstNumber: tenant.gstNumber,
      },
    });

    // Auto-generate PDF & upload to AWS S3
    try {
      const pdfRes = await this.generatePDF(invoice.id);
      if (pdfRes.invoice) {
        invoice = pdfRes.invoice;
      }
    } catch (err) {
      console.error('⚠️ Invoice PDF generation background warning:', err.message);
    }

    return { success: true, invoice, order, tenant };
  }

  /**
   * Generate PDF invoice
   */
  async generatePDF(invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            orderItems: true,
            assignedTable: true,
          },
        },
        tenant: true,
      },
    });

    if (!invoice) {
      return { success: false, message: 'Invoice not found.' };
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(chunks);

        // Upload PDF Invoice to AWS S3
        const s3Service = require('./s3.service');
        const s3Key = `invoices/${invoice.tenant?.slug || 'tenant'}/${invoice.invoiceNumber}.pdf`;
        const uploadResult = await s3Service.uploadBuffer(pdfBuffer, s3Key, 'application/pdf');

        if (uploadResult.success) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { pdfUrl: uploadResult.url },
          });
          invoice.pdfUrl = uploadResult.url;
        }

        resolve({ success: true, buffer: pdfBuffer, invoice, pdfUrl: uploadResult.url || invoice.pdfUrl });
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text(invoice.tenant.name, { align: 'center' });
      if (invoice.tenant.tagline) {
        doc.fontSize(10).font('Helvetica').text(invoice.tenant.tagline, { align: 'center' });
      }
      doc.moveDown();

      // Invoice Info
      doc.fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice No: ${invoice.invoiceNumber}`);
      doc.text(`Date: ${new Date(invoice.generatedAt).toLocaleDateString('en-IN')}`);
      doc.text(`Order: ${invoice.order.orderCode}`);
      if (invoice.order.assignedTable) {
        doc.text(`Table: ${invoice.order.assignedTable.name}`);
      }
      doc.moveDown();

      // Restaurant details
      if (invoice.tenant.address) {
        doc.text(`Address: ${invoice.tenant.address}`);
      }
      if (invoice.gstNumber) {
        doc.text(`GSTIN: ${invoice.gstNumber}`);
      }
      doc.moveDown();

      // Customer details
      doc.text(`Customer: ${invoice.order.customerName}`);
      doc.text(`Phone: ${invoice.order.customerPhone}`);
      doc.moveDown();

      // Items table header
      const tableTop = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('Item', 50, tableTop, { width: 200 });
      doc.text('Qty', 260, tableTop, { width: 50, align: 'center' });
      doc.text('Price', 320, tableTop, { width: 80, align: 'right' });
      doc.text('Total', 420, tableTop, { width: 80, align: 'right' });
      doc.moveDown(0.5);

      // Divider
      doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
      doc.moveDown(0.5);

      // Consolidate identical items for clean invoice presentation
      const consolidatedMap = new Map();
      for (const item of invoice.order.orderItems) {
        const key = `${item.itemName.toLowerCase().trim()}_${item.portion || 'Full'}`;
        if (consolidatedMap.has(key)) {
          const existing = consolidatedMap.get(key);
          existing.quantity += item.quantity;
          existing.lineTotal += Number(item.lineTotal);
        } else {
          consolidatedMap.set(key, {
            itemName: item.itemName,
            itemPrice: Number(item.itemPrice),
            quantity: item.quantity,
            lineTotal: Number(item.lineTotal),
          });
        }
      }
      const consolidatedItems = Array.from(consolidatedMap.values());

      // Items
      doc.font('Helvetica');
      for (const item of consolidatedItems) {
        const y = doc.y;
        doc.text(item.itemName, 50, y, { width: 200 });
        doc.text(String(item.quantity), 260, y, { width: 50, align: 'center' });
        doc.text(`Rs. ${Number(item.itemPrice).toFixed(2)}`, 320, y, { width: 80, align: 'right' });
        doc.text(`Rs. ${Number(item.lineTotal).toFixed(2)}`, 420, y, { width: 80, align: 'right' });
        doc.moveDown(0.5);
      }

      // Divider
      doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
      doc.moveDown(0.5);

      // Totals
      doc.text(`Subtotal:`, 320, doc.y, { width: 80, align: 'right' });
      doc.text(`Rs. ${Number(invoice.subtotal).toFixed(2)}`, 420, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
      doc.moveDown(0.3);

      if (Number(invoice.order.discountAmount) > 0) {
        doc.text(`Discount:`, 320, doc.y, { width: 80, align: 'right' });
        doc.text(`-Rs. ${Number(invoice.order.discountAmount).toFixed(2)}`, 420, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
        doc.moveDown(0.3);
      }

      if (invoice.gstNumber) {
        if (Number(invoice.cgst) > 0) {
          doc.text(`CGST:`, 320, doc.y, { width: 80, align: 'right' });
          doc.text(`Rs. ${Number(invoice.cgst).toFixed(2)}`, 420, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
          doc.moveDown(0.3);
        }
        if (Number(invoice.sgst) > 0) {
          doc.text(`SGST:`, 320, doc.y, { width: 80, align: 'right' });
          doc.text(`Rs. ${Number(invoice.sgst).toFixed(2)}`, 420, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
          doc.moveDown(0.3);
        }
        if (Number(invoice.igst) > 0) {
          doc.text(`IGST:`, 320, doc.y, { width: 80, align: 'right' });
          doc.text(`Rs. ${Number(invoice.igst).toFixed(2)}`, 420, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
          doc.moveDown(0.3);
        }
      }

      doc.moveDown(0.3);
      doc.moveTo(320, doc.y).lineTo(500, doc.y).stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(`Grand Total:`, 320, doc.y, { width: 80, align: 'right' });
      doc.text(`Rs. ${Number(invoice.total).toFixed(2)}`, 420, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });

      // Footer
      doc.moveDown(3);
      doc.fontSize(8).font('Helvetica').text('Thank you for dining with us!', { align: 'center' });
      doc.text('Powered by DineBoard — dineboard.in', { align: 'center' });

      doc.end();
    });
  }

  /**
   * Send invoice to customer via WhatsApp
   */
  async sendInvoice(orderId, tenantId) {
    const genResult = await this.generateInvoice(orderId, tenantId);
    if (!genResult.success) return genResult;

    const { invoice } = genResult;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, assignedTable: true },
    });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!order || !order.customerPhone) {
      return { success: true, invoice, message: 'Invoice generated (no phone number to send WhatsApp).' };
    }

    const whatsappService = require('./whatsapp.service');
    const baseUrl = process.env.APP_URL || 'https://dineboard.in';
    const pdfUrl = invoice.pdfUrl ? `${baseUrl}${invoice.pdfUrl}` : `${baseUrl}/api/invoices/${invoice.id}/pdf`;

    const itemsList = order.orderItems
      .map((item) => `  • ${item.quantity}× ${item.itemName}: ₹${item.lineTotal}`)
      .join('\n');

    const message = `🎉 *Payment Received & Tax Invoice*\n\n` +
      `🍽️ *${tenant.name}*\n` +
      `🧾 Invoice No: *${invoice.invoiceNumber}*\n` +
      `📋 Order Code: *${order.orderCode}*\n\n` +
      `🛒 *Paid Items Summary:*\n${itemsList}\n\n` +
      `💵 *Grand Total Paid: ₹${order.total}*\n` +
      (order.assignedTable ? `🪑 Table: ${order.assignedTable.name}\n` : '') +
      `\n📄 *Click to Download Tax Invoice PDF:*\n${pdfUrl}\n\n` +
      `Thank you for dining with us! Have a wonderful day! 🎉😊`;

    await whatsappService.sendMessage(order.customerPhone, message, tenant.metaPhoneNumberId, tenant.metaAccessToken);

    return {
      success: true,
      invoice,
      pdfUrl,
      message: 'Invoice sent to customer on WhatsApp.',
    };
  }
}

module.exports = new InvoiceService();
