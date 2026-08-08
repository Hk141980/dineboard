// ============================================
// DineBoard — Payment Service
// Razorpay integration for subscriptions & orders
// ============================================

const { razorpay, getRazorpayForTenant } = require('../config/razorpay');
const { prisma } = require('../config/database');
const crypto = require('crypto');

class PaymentService {
  /**
   * Create a Razorpay subscription for a new restaurant
   */
  async createSubscription(tenantId, planId) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return { success: false, message: 'Plan not found.' };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    // Create Razorpay plan (if not already created)
    // In production, plans would be pre-created in Razorpay dashboard
    const subscription = await razorpay.subscriptions.create({
      plan_id: `plan_${planId}`, // Map to Razorpay plan ID
      customer_notify: 1,
      quantity: 1,
      total_count: 12, // 12 months
      notes: {
        tenant_id: tenantId,
        tenant_name: tenant.name,
      },
    });

    // Update tenant with subscription info
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        razorpaySubscriptionId: subscription.id,
        subscriptionPlanId: planId,
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      },
    });

    return { success: true, subscription };
  }

  /**
   * Create a payment link for customer bill
   */
  async createPaymentLink(orderId, tenantId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: { orderItems: true },
    });

    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    // Check if restaurant owner turned off Master Razorpay online collection
    if (tenant.disableMasterRazorpay && !tenant.usesOwnRazorpay) {
      return {
        success: false,
        message: 'Master Razorpay online payment collection is turned OFF by restaurant owner. Please collect payment in Cash.',
        paymentDisabled: true,
      };
    }

    const rzp = getRazorpayForTenant(tenant);

    // Format contact phone for Razorpay SMS delivery (+91XXXXXXXXXX)
    let formattedPhone = (order.customerPhone || '').replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = `+91${formattedPhone}`;
    } else if (formattedPhone.length > 10 && !formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }

    const paymentLink = await rzp.paymentLink.create({
      amount: Math.round(Number(order.total) * 100), // Razorpay uses paise
      currency: 'INR',
      description: `Bill for Order ${order.orderCode} at ${tenant.name}`,
      customer: {
        name: order.customerName || 'Customer',
        contact: formattedPhone,
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      notes: {
        order_id: order.id,
        order_code: order.orderCode,
        tenant_id: tenantId,
      },
      callback_url: `${process.env.API_URL}/api/payments/callback`,
      callback_method: 'get',
    });

    // Store payment link in order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.short_url,
        status: 'billed',
      },
    });

    return {
      success: true,
      paymentLink: paymentLink.short_url,
      paymentLinkId: paymentLink.id,
    };
  }

  /**
   * Handle Razorpay payment webhook
   */
  async handlePaymentWebhook(body, signature) {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return { success: false, message: 'Invalid webhook signature.' };
    }

    const event = body.event;
    const payload = body.payload;

    switch (event) {
      case 'payment.captured':
        return this.handlePaymentCaptured(payload);
      case 'subscription.charged':
        return this.handleSubscriptionCharged(payload);
      case 'subscription.halted':
        return this.handleSubscriptionHalted(payload);
      default:
        return { success: true, message: `Unhandled event: ${event}` };
    }
  }

  /**
   * Helper to mark order as paid, trigger table status change to cleaning, and track commission
   */
  async markOrderAsPaid(orderId, tenantId, paymentInfo = {}) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: 'Order not found.' };

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paymentInfo,
      },
      include: { assignedTable: true },
    });

    // Update table status to available
    if (updatedOrder.assignedTableId) {
      await prisma.table.update({
        where: { id: updatedOrder.assignedTableId },
        data: { status: 'available' },
      }).catch(err => console.error('Table status update error:', err.message));
    }

    // Auto-generate & send WhatsApp Tax Invoice when order is paid
    const invoiceService = require('./invoice.service');
    invoiceService.sendInvoice(orderId, tenantId).catch((err) =>
      console.error('Auto invoice sending error:', err.message)
    );

    // Track commission if not already tracked
    try {
      const existingCommission = await prisma.platformCommission.findFirst({ where: { orderId } });
      if (!existingCommission) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          include: { subscriptionPlan: true },
        });

        if (tenant && tenant.subscriptionPlan && !tenant.usesOwnRazorpay) {
          const commissionRate = Number(tenant.subscriptionPlan.commissionRate);
          const transactionAmount = Number(updatedOrder.total);
          const commissionAmount = (transactionAmount * commissionRate) / 100;

          await prisma.platformCommission.create({
            data: {
              tenantId,
              orderId,
              type: 'order_commission',
              transactionAmount,
              commissionRate,
              commissionAmount,
              collectionMethod: 'razorpay_route',
              status: 'collected',
              collectedAt: new Date(),
            },
          });
        }
      }
    } catch (err) {
      console.error('Commission error:', err.message);
    }

    return { success: true, paid: true, order: updatedOrder };
  }

  /**
   * Check and auto-confirm payment status for an order
   */
  async verifyOrderPayment(orderId, tenantId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: { assignedTable: true },
    });

    if (!order) return { success: false, message: 'Order not found.' };

    if (order.status === 'paid') {
      return { success: true, paid: true, order };
    }

    // If order has paymentLinkId, check status with Razorpay
    if (order.paymentLinkId) {
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        const rzp = getRazorpayForTenant(tenant);
        const link = await rzp.paymentLink.fetch(order.paymentLinkId);

        if (link && (link.status === 'paid' || (link.amount_paid > 0 && link.amount_paid >= link.amount))) {
          return await this.markOrderAsPaid(order.id, tenantId, {
            paymentId: link.payment_id || `plink_${link.id}`,
            method: 'razorpay_link',
            amount: (link.amount_paid || link.amount) / 100,
          });
        }
      } catch (err) {
        console.error('Error fetching payment link status:', err.message);
      }
    }

    return { success: true, paid: false, order };
  }

  /**
   * Handle successful payment capture
   */
  async handlePaymentCaptured(payload) {
    const payment = payload.payment.entity;
    const orderId = payment.notes?.order_id;
    const tenantId = payment.notes?.tenant_id;

    if (!orderId || !tenantId) {
      return { success: false, message: 'Missing order/tenant info in payment notes.' };
    }

    return this.markOrderAsPaid(orderId, tenantId, {
      paymentId: payment.id,
      method: payment.method,
      amount: payment.amount / 100,
    });
  }

  /**
   * Handle subscription charged
   */
  async handleSubscriptionCharged(payload) {
    const subscription = payload.subscription.entity;
    const tenantId = subscription.notes?.tenant_id;

    if (tenantId) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'active' },
      });
    }

    return { success: true };
  }

  /**
   * Handle subscription halted (payment failed)
   */
  async handleSubscriptionHalted(payload) {
    const subscription = payload.subscription.entity;
    const tenantId = subscription.notes?.tenant_id;

    if (tenantId) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'expired' },
      });
    }

    return { success: true };
  }
}

module.exports = new PaymentService();
