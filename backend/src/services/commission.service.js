// ============================================
// DineBoard — Commission Service
// Platform revenue tracking & invoicing
// ============================================

const { prisma } = require('../config/database');
const { formatCurrency } = require('../utils/helpers');

class CommissionService {
  /**
   * Track commission for an order
   */
  async trackOrderCommission(tenantId, orderId, transactionAmount) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptionPlan: true },
    });

    // Commission is ONLY charged when restaurant uses DineBoard Razorpay gateway
    if (!tenant || !tenant.subscriptionPlan || tenant.usesOwnRazorpay) return null;

    const commissionRate = Number(tenant.subscriptionPlan.commissionRate);
    const commissionAmount = (transactionAmount * commissionRate) / 100;

    return prisma.platformCommission.create({
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

  /**
   * Track commission for a booking
   */
  async trackBookingCommission(tenantId, bookingId, transactionAmount) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptionPlan: true },
    });

    // Commission is ONLY charged when restaurant uses DineBoard Razorpay gateway
    if (!tenant || !tenant.subscriptionPlan || tenant.usesOwnRazorpay) return null;

    const commissionRate = Number(tenant.subscriptionPlan.bookingCommission);
    const commissionAmount = (transactionAmount * commissionRate) / 100;

    return prisma.platformCommission.create({
      data: {
        tenantId,
        bookingId,
        type: 'booking_commission',
        transactionAmount,
        commissionRate,
        commissionAmount,
        collectionMethod: 'razorpay_route',
        status: 'collected',
        collectedAt: new Date(),
      },
    });
  }

  /**
   * Get commission summary for a tenant
   */
  async getTenantCommissions(tenantId, { month, year, page = 1, limit = 20 }) {
    const where = { tenantId };

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const [commissions, total, summary] = await Promise.all([
      prisma.platformCommission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.platformCommission.count({ where }),
      prisma.platformCommission.aggregate({
        where,
        _sum: {
          commissionAmount: true,
          transactionAmount: true,
        },
      }),
    ]);

    return {
      commissions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalCommission: Number(summary._sum.commissionAmount || 0),
        totalTransactions: Number(summary._sum.transactionAmount || 0),
      },
    };
  }

  /**
   * Get platform-wide commission report (super admin)
   */
  async getPlatformCommissions({ month, year, status, page = 1, limit = 50 }) {
    const where = {};

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    if (status) where.status = status;

    const [commissions, total, summary] = await Promise.all([
      prisma.platformCommission.findMany({
        where,
        include: {
          tenant: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.platformCommission.count({ where }),
      prisma.platformCommission.aggregate({
        where,
        _sum: {
          commissionAmount: true,
          transactionAmount: true,
        },
      }),
    ]);

    return {
      commissions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalCommission: Number(summary._sum.commissionAmount || 0),
        totalTransactions: Number(summary._sum.transactionAmount || 0),
      },
    };
  }

  /**
   * Generate monthly commission invoice for restaurants using own Razorpay
   */
  async generateMonthlyInvoice(tenantId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const pendingCommissions = await prisma.platformCommission.findMany({
      where: {
        tenantId,
        status: 'pending',
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    if (pendingCommissions.length === 0) {
      return { success: false, message: 'No pending commissions for this period.' };
    }

    const totalCommission = pendingCommissions.reduce(
      (sum, c) => sum + Number(c.commissionAmount),
      0
    );

    // Mark all as invoiced
    await prisma.platformCommission.updateMany({
      where: {
        id: { in: pendingCommissions.map((c) => c.id) },
      },
      data: { status: 'invoiced' },
    });

    return {
      success: true,
      invoiceData: {
        tenantId,
        period: `${year}-${month.toString().padStart(2, '0')}`,
        totalCommission,
        transactionCount: pendingCommissions.length,
        commissions: pendingCommissions,
      },
    };
  }
}

module.exports = new CommissionService();
