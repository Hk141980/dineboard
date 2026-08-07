// ============================================
// DineBoard — Order Service
// Order management with auto table assignment
// ============================================

const { prisma } = require('../config/database');
const { generateCode, calculateGST, formatCurrency } = require('../utils/helpers');

class OrderService {
  /**
   * Create a new order (from web or WhatsApp)
   */
  async createOrder(tenantId, data) {
    const orderCode = generateCode('ORD');
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    // Fetch menu items and validate
    const menuItemIds = data.items.map((i) => i.menuItemId);
    const uniqueIds = Array.from(new Set(menuItemIds));
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: uniqueIds }, tenantId, isAvailable: true },
    });

    if (menuItems.length !== uniqueIds.length) {
      return {
        success: false,
        message: 'Some menu items are unavailable or invalid.',
      };
    }

    // Calculate subtotal with Portion support (Half / Full)
    let subtotal = 0;
    const orderItemsData = data.items.map((item) => {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      const isHalf = (item.portion === 'Half' || item.portion === 'half') && menuItem.priceHalf;
      const unitPrice = isHalf ? Number(menuItem.priceHalf) : Number(menuItem.price);
      const portionLabel = isHalf ? 'Half' : 'Full';
      const itemName = isHalf ? `${menuItem.name} (Half)` : menuItem.name;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      return {
        menuItemId: menuItem.id,
        itemName,
        itemPrice: unitPrice,
        portion: portionLabel,
        quantity: item.quantity,
        lineTotal,
      };
    });

    // Apply promo code if provided
    let discountAmount = 0;
    if (data.promoCode) {
      const discount = await this.validatePromoCode(tenantId, data.promoCode, subtotal);
      if (discount.valid) {
        discountAmount = discount.amount;
      }
    }

    // Calculate GST if restaurant has GST number
    const gstResult = tenant.gstNumber
      ? calculateGST(subtotal - discountAmount)
      : { cgst: 0, sgst: 0, igst: 0, total: subtotal - discountAmount };

    // Auto-assign table if not specified, or use customer's selection / scanned QR table token
    let rawTableParam = data.tableId || data.tableToken || data.table;
    let targetTableId = rawTableParam;

    if (rawTableParam && typeof rawTableParam === 'string') {
      try {
        if (rawTableParam.startsWith('tbl_') || rawTableParam.startsWith('eyJ')) {
          const raw = Buffer.from(rawTableParam.replace(/^tbl_/, ''), 'base64url').toString('utf8');
          const parsed = JSON.parse(raw);
          if (parsed.id) targetTableId = parsed.id;
        }
      } catch (e) {}
    }

    let assignedTableId = null;
    let assignedBookingId = data.bookingId || null;

    if (targetTableId) {
      // Customer scanned QR code — find table by ID or Token
      const selectedTable = await prisma.table.findFirst({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { id: targetTableId },
            { id: rawTableParam },
          ],
        },
      });
      if (selectedTable) {
        assignedTableId = selectedTable.id;

        // Check if table currently has an active confirmed booking
        if (!assignedBookingId) {
          const activeBooking = await prisma.booking.findFirst({
            where: {
              tenantId,
              status: 'confirmed',
              bookingTables: {
                some: { tableId: selectedTable.id },
              },
            },
            orderBy: { createdAt: 'desc' },
          });
          if (activeBooking) {
            assignedBookingId = activeBooking.id;
          }
        }

        // Update table status to 'occupied' when order is placed
        await prisma.table.update({
          where: { id: selectedTable.id },
          data: { status: 'occupied' },
        });
      }
    }

    if (!assignedTableId) {
      const availableTable = await prisma.table.findFirst({
        where: { tenantId, status: 'available', isActive: true },
        orderBy: { capacity: 'asc' },
      });
      if (availableTable) {
        assignedTableId = availableTable.id;
        await prisma.table.update({
          where: { id: availableTable.id },
          data: { status: 'occupied' },
        });
      }
    }

    // Check if there is an existing ACTIVE (unpaid) order for this table
    let existingActiveOrder = null;
    if (assignedTableId) {
      existingActiveOrder = await prisma.order.findFirst({
        where: {
          tenantId,
          assignedTableId,
          status: { in: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'billed'] },
        },
        include: {
          orderItems: { include: { menuItem: true } },
          assignedTable: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (existingActiveOrder) {
      // Append new items to existing active order (mark as extra dining items)
      for (const item of orderItemsData) {
        await prisma.orderItem.create({
          data: {
            orderId: existingActiveOrder.id,
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            itemPrice: item.itemPrice,
            portion: item.portion,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            isExtra: true,
          },
        });
      }

      // Recalculate totals
      const newSubtotal = Number(existingActiveOrder.subtotal) + subtotal;
      const newDiscountAmount = Number(existingActiveOrder.discountAmount) + discountAmount;
      const newGstResult = tenant.gstNumber
        ? calculateGST(newSubtotal - newDiscountAmount)
        : { cgst: 0, sgst: 0, igst: 0, total: newSubtotal - newDiscountAmount };

      const updatedOrder = await prisma.order.update({
        where: { id: existingActiveOrder.id },
        data: {
          subtotal: newSubtotal,
          discountAmount: newDiscountAmount,
          gstAmount: newGstResult.cgst + newGstResult.sgst + newGstResult.igst,
          total: newGstResult.total,
          isRepeat: true,
          status: 'preparing', // Re-trigger kitchen preparation for newly added items
          paymentLinkId: null,  // Reset stale payment link so new bill reflects added items
          paymentLinkUrl: null,
          note: data.note ? (existingActiveOrder.note ? `${existingActiveOrder.note} | Extra: ${data.note}` : data.note) : existingActiveOrder.note,
        },
        include: {
          orderItems: { include: { menuItem: true } },
          assignedTable: true,
        },
      });

      return { success: true, isMerged: true, order: updatedOrder };
    }

    const order = await prisma.order.create({
      data: {
        tenantId,
        orderCode,
        bookingId: assignedBookingId || data.bookingId || null,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        note: data.note,
        source: data.source || 'website',
        status: 'pending',
        subtotal,
        discountAmount,
        gstAmount: gstResult.cgst + gstResult.sgst + gstResult.igst,
        total: gstResult.total,
        promoCodeUsed: data.promoCode,
        assignedTableId,
        orderItems: {
          create: orderItemsData,
        },
      },
      include: {
        orderItems: { include: { menuItem: true } },
        assignedTable: true,
      },
    });

    // Increment promo code usage
    if (data.promoCode && discountAmount > 0) {
      await prisma.promoCode.updateMany({
        where: { tenantId, code: data.promoCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    return { success: true, order };
  }

  /**
   * Add items to an existing order
   */
  async addItemsToOrder(orderId, tenantId, items) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: { orderItems: true },
    });

    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    if (['paid', 'billed'].includes(order.status)) {
      return { success: false, message: 'Cannot modify a paid/billed order.' };
    }

    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, tenantId, isAvailable: true },
    });

    let addedSubtotal = 0;
    const newItems = items.map((item) => {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      const lineTotal = Number(menuItem.price) * item.quantity;
      addedSubtotal += lineTotal;
      return {
        orderId,
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        itemPrice: menuItem.price,
        quantity: item.quantity,
        lineTotal,
      };
    });

    // Create new order items
    await prisma.orderItem.createMany({ data: newItems });

    // Update order totals
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const newSubtotal = Number(order.subtotal) + addedSubtotal;
    const gstResult = tenant.gstNumber
      ? calculateGST(newSubtotal - Number(order.discountAmount))
      : { cgst: 0, sgst: 0, igst: 0, total: newSubtotal - Number(order.discountAmount) };

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal: newSubtotal,
        gstAmount: gstResult.cgst + gstResult.sgst + gstResult.igst,
        total: gstResult.total,
      },
      include: {
        orderItems: { include: { menuItem: true } },
        assignedTable: true,
      },
    });

    return { success: true, order: updatedOrder, addedItems: newItems };
  }

  /**
   * Update order status with progression rules
   */
  async updateOrderStatus(orderId, tenantId, status, paymentMethod = null) {
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
    });

    if (!currentOrder) {
      throw new Error('Order not found.');
    }

    const STATUS_STAGES = {
      pending: 1,
      preparing: 2,
      ready: 3,
      served: 4,
      billed: 5,
      paid: 6,
      cancelled: 99,
    };

    if (currentOrder.status === 'paid' && status !== 'paid') {
      throw new Error('Paid orders are locked and cannot be moved back to a previous stage.');
    }

    const currentStage = STATUS_STAGES[currentOrder.status] || 0;
    const newStage = STATUS_STAGES[status] || 0;

    if (currentStage > newStage && status !== 'cancelled') {
      throw new Error(`Cannot regress order status from ${currentOrder.status} to ${status}.`);
    }

    const updateData = { status };
    if (status === 'paid') {
      if (!currentOrder.paidAt) updateData.paidAt = new Date();

      // Guarantee cash classification if paid at restaurant counter and no Razorpay paymentId exists
      const existingInfo = (typeof currentOrder.paymentInfo === 'object' && currentOrder.paymentInfo) ? currentOrder.paymentInfo : {};
      if (!existingInfo.paymentId) {
        updateData.paymentInfo = {
          ...existingInfo,
          method: paymentMethod || 'cash',
          paidAtCounter: true,
        };
      }
    }

    const order = await prisma.order.update({
      where: { id: orderId, tenantId },
      data: updateData,
      include: { orderItems: true, assignedTable: true },
    });

    // If order is paid or completed, free up the table (set to available)
    if (['paid', 'completed'].includes(status) && order.assignedTableId) {
      await prisma.table.update({
        where: { id: order.assignedTableId },
        data: { status: 'available' },
      }).catch(err => console.error('Table status update error:', err.message));
    }

    // Auto-generate & send WhatsApp Tax Invoice when order is paid
    if (status === 'paid') {
      const invoiceService = require('./invoice.service');
      invoiceService.sendInvoice(orderId, tenantId).catch((err) =>
        console.error('Auto invoice sending error:', err.message)
      );
    }

    // Auto-trigger WhatsApp notification for ALL status updates
    try {
      const whatsappService = require('./whatsapp.service');
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

      if (status === 'billed') {
        let link = order.paymentLinkUrl;
        if (!link) {
          const paymentService = require('./payment.service');
          const payRes = await paymentService.createPaymentLink(orderId, tenantId).catch(() => null);
          if (payRes?.success) link = payRes.paymentLink;
        }
        if (link) {
          await whatsappService.sendPaymentLink(order, link, tenant);
        } else {
          await whatsappService.sendOrderStatusUpdate(order, 'billed', tenant);
        }
      } else {
        await whatsappService.sendOrderStatusUpdate(order, status, tenant);
      }
    } catch (err) {
      console.error('Auto WhatsApp status notification error:', err.message);
    }

    return order;
  }

  /**
   * Consolidate/merge all unpaid orders for a specific table or customer phone into one unified order
   */
  async consolidateUnpaidOrders(tenantId, { tableId, customerPhone }) {
    const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
    const last10 = cleanPhone.slice(-10);

    const whereConditions = [];
    if (tableId) whereConditions.push({ assignedTableId: tableId });
    if (customerPhone) {
      whereConditions.push({ customerPhone });
      whereConditions.push({ customerPhone: cleanPhone });
      whereConditions.push({ customerPhone: `+${cleanPhone}` });
      if (last10) whereConditions.push({ customerPhone: { contains: last10 } });
    }

    if (whereConditions.length === 0) return null;

    const unpaidOrders = await prisma.order.findMany({
      where: {
        tenantId,
        status: { in: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'billed'] },
        OR: whereConditions,
      },
      include: { orderItems: true, assignedTable: true },
      orderBy: { createdAt: 'asc' },
    });

    if (unpaidOrders.length === 0) return null;

    // Target order is the latest created order
    const targetOrder = unpaidOrders[unpaidOrders.length - 1];

    if (unpaidOrders.length > 1) {
      for (let i = 0; i < unpaidOrders.length - 1; i++) {
        const sourceOrder = unpaidOrders[i];

        // Copy order items to targetOrder
        for (const item of sourceOrder.orderItems) {
          await prisma.orderItem.create({
            data: {
              orderId: targetOrder.id,
              menuItemId: item.menuItemId,
              itemName: item.itemName,
              itemPrice: item.itemPrice,
              portion: item.portion,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            },
          });
        }

        // Mark source order as cancelled (merged)
        await prisma.order.update({
          where: { id: sourceOrder.id },
          data: {
            status: 'cancelled',
            note: `Merged into ${targetOrder.orderCode}`,
          },
        });
      }

      // Recalculate grand totals for targetOrder
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const allItems = await prisma.orderItem.findMany({ where: { orderId: targetOrder.id } });
      const newSubtotal = allItems.reduce((acc, item) => acc + Number(item.lineTotal), 0);
      const gstResult = tenant.gstNumber
        ? calculateGST(newSubtotal)
        : { cgst: 0, sgst: 0, igst: 0, total: newSubtotal };

      const mergedOrder = await prisma.order.update({
        where: { id: targetOrder.id },
        data: {
          subtotal: newSubtotal,
          gstAmount: gstResult.cgst + gstResult.sgst + gstResult.igst,
          total: gstResult.total,
          status: 'billed',
          paymentLinkId: null,
          paymentLinkUrl: null,
        },
        include: { orderItems: { include: { menuItem: true } }, assignedTable: true },
      });

      return mergedOrder;
    }

    return targetOrder;
  }

  /**
   * Modify order (admin can change items, apply discounts)
   */
  async modifyOrder(orderId, tenantId, updates) {
    const order = await prisma.order.update({
      where: { id: orderId, tenantId },
      data: {
        discountAmount: updates.discountAmount,
        note: updates.note,
        status: updates.status,
      },
      include: { orderItems: { include: { menuItem: true } } },
    });

    // Recalculate total if discount changed
    if (updates.discountAmount !== undefined) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const gstResult = tenant.gstNumber
        ? calculateGST(Number(order.subtotal) - Number(updates.discountAmount))
        : { cgst: 0, sgst: 0, igst: 0, total: Number(order.subtotal) - Number(updates.discountAmount) };

      return prisma.order.update({
        where: { id: orderId },
        data: {
          gstAmount: gstResult.cgst + gstResult.sgst + gstResult.igst,
          total: gstResult.total,
        },
        include: { orderItems: { include: { menuItem: true } }, assignedTable: true },
      });
    }

    return order;
  }

  /**
   * Validate promo code
   */
  async validatePromoCode(tenantId, code, orderAmount) {
    const promo = await prisma.promoCode.findFirst({
      where: {
        tenantId,
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });

    if (!promo) {
      return { valid: false, message: 'Invalid or expired promo code.' };
    }

    if (promo.usedCount >= promo.maxUses) {
      return { valid: false, message: 'Promo code has reached its usage limit.' };
    }

    if (orderAmount < Number(promo.minOrderAmount)) {
      return {
        valid: false,
        message: `Minimum order amount is ${formatCurrency(promo.minOrderAmount)}.`,
      };
    }

    let amount;
    if (promo.discountType === 'percentage') {
      amount = (orderAmount * Number(promo.discountValue)) / 100;
    } else {
      amount = Number(promo.discountValue);
    }

    return { valid: true, amount: Math.min(amount, orderAmount), promo };
  }

  /**
   * Get orders with filters
   */
  async getOrders(tenantId, { status, source, date, page = 1, limit = 20 }) {
    const where = { tenantId };
    if (status === 'repeat') {
      where.isRepeat = true;
    } else if (status) {
      where.status = status;
    }
    if (source) where.source = source;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: { include: { menuItem: true } },
          assignedTable: true,
          booking: true,
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Auto-verify payment status for billed orders with payment link
    const billedOrders = orders.filter(o => (o.status === 'billed' || o.status === 'pending') && o.paymentLinkId);
    if (billedOrders.length > 0) {
      const paymentService = require('./payment.service');
      await Promise.all(billedOrders.map(async (o) => {
        try {
          const res = await paymentService.verifyOrderPayment(o.id, tenantId);
          if (res && res.paid && res.order) {
            o.status = 'paid';
          }
        } catch (e) {
          // silent fallback
        }
      }));
    }

    // Auto-generate invoice for any paid orders missing invoice record
    const invoiceService = require('./invoice.service');
    const paidMissingInvoices = orders.filter(o => o.status === 'paid' && !o.invoice);
    if (paidMissingInvoices.length > 0) {
      await Promise.all(paidMissingInvoices.map(async (o) => {
        try {
          const invRes = await invoiceService.generateInvoice(o.id, tenantId);
          if (invRes && invRes.invoice) {
            o.invoice = invRes.invoice;
          }
        } catch (e) {}
      }));
    }

    return { orders, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get order by code (for customers)
   */
  async getOrderByCode(tenantId, orderCode) {
    return prisma.order.findFirst({
      where: { tenantId, orderCode },
      include: {
        orderItems: { include: { menuItem: true } },
        assignedTable: true,
        invoice: true,
      },
    });
  }
}

module.exports = new OrderService();
