// ============================================
// DineBoard — Report Service
// Analytics & report generation
// ============================================

const { prisma } = require('../config/database');

class ReportService {
  /**
   * Get dashboard overview stats
   */
  async getDashboardStats(tenantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const [
      todayOrders,
      todayRevenue,
      todayBookings,
      monthOrders,
      monthRevenue,
      monthBookings,
      activeOrders,
      tableStats,
    ] = await Promise.all([
      // Today's orders count
      prisma.order.count({
        where: { tenantId, createdAt: { gte: today, lt: tomorrow } },
      }),
      // Today's revenue
      prisma.order.aggregate({
        where: {
          tenantId,
          status: 'paid',
          createdAt: { gte: today, lt: tomorrow },
        },
        _sum: { total: true },
      }),
      // Today's bookings
      prisma.booking.count({
        where: { tenantId, bookingDate: { gte: today, lt: tomorrow } },
      }),
      // This month's orders
      prisma.order.count({
        where: { tenantId, createdAt: { gte: thisMonth, lt: nextMonth } },
      }),
      // This month's revenue
      prisma.order.aggregate({
        where: {
          tenantId,
          status: 'paid',
          createdAt: { gte: thisMonth, lt: nextMonth },
        },
        _sum: { total: true },
      }),
      // This month's bookings
      prisma.booking.count({
        where: { tenantId, bookingDate: { gte: thisMonth, lt: nextMonth } },
      }),
      // Active orders (in progress)
      prisma.order.findMany({
        where: {
          tenantId,
          status: { in: ['pending', 'preparing', 'ready', 'served', 'billed'] },
        },
        include: {
          orderItems: true,
          assignedTable: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Table stats
      prisma.table.groupBy({
        by: ['status'],
        where: { tenantId, isActive: true },
        _count: true,
      }),
    ]);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    // Calculate Cash vs Razorpay breakdown for paid orders
    const paidOrders = await prisma.order.findMany({
      where: { tenantId, status: 'paid' },
      select: { total: true, paymentInfo: true },
    });

    let cashRevenue = 0, razorpayRevenue = 0, cashCount = 0, razorpayCount = 0;
    paidOrders.forEach((o) => {
      const info = (typeof o.paymentInfo === 'object' && o.paymentInfo) ? o.paymentInfo : {};
      const method = info.method || 'cash';
      const isOnlinePaid = (method.includes('razorpay') || !!info.paymentId) && method !== 'cash';

      if (isOnlinePaid) {
        razorpayRevenue += Number(o.total);
        razorpayCount++;
      } else {
        cashRevenue += Number(o.total);
        cashCount++;
      }
    });

    return {
      today: {
        orders: todayOrders,
        revenue: Number(todayRevenue._sum.total || 0),
        bookings: todayBookings,
      },
      month: {
        orders: monthOrders,
        revenue: Number(monthRevenue._sum.total || 0),
        bookings: monthBookings,
      },
      paymentBreakdown: {
        cashRevenue,
        razorpayRevenue,
        cashCount,
        razorpayCount,
        usesOwnRazorpay: !!tenant?.usesOwnRazorpay,
      },
      activeOrders,
      tables: tableStats.reduce((acc, t) => {
        acc[t.status] = t._count;
        return acc;
      }, {}),
    };
  }

  /**
   * Get order reports with date range filtering
   */
  async getOrderReport(tenantId, { startDate, endDate, groupBy = 'day' }) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
      },
      include: { orderItems: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const grouped = {};
    orders.forEach((order) => {
      const key = order.createdAt.toISOString().split('T')[0];
      if (!grouped[key]) {
        grouped[key] = { date: key, orders: 0, revenue: 0, items: 0 };
      }
      grouped[key].orders++;
      grouped[key].revenue += Number(order.total);
      grouped[key].items += order.orderItems.reduce((sum, i) => sum + i.quantity, 0);
    });

    const summary = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
      averageOrderValue:
        orders.length > 0
          ? orders.reduce((sum, o) => sum + Number(o.total), 0) / orders.length
          : 0,
      byStatus: {},
      bySource: {},
    };

    orders.forEach((o) => {
      summary.byStatus[o.status] = (summary.byStatus[o.status] || 0) + 1;
      summary.bySource[o.source] = (summary.bySource[o.source] || 0) + 1;
    });

    return {
      data: Object.values(grouped),
      summary,
    };
  }

  /**
   * Get revenue report
   */
  async getRevenueReport(tenantId, { startDate, endDate }) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    const [orders, commissions] = await Promise.all([
      prisma.order.findMany({
        where: {
          tenantId,
          status: 'paid',
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.platformCommission.findMany({
        where: {
          tenantId,
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalCommission = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    const totalGST = orders.reduce((sum, o) => sum + Number(o.gstAmount), 0);

    return {
      totalRevenue,
      totalCommission,
      netRevenue: totalRevenue - totalCommission,
      totalGST,
      orderCount: orders.length,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    };
  }

  /**
   * Get booking report
   */
  async getBookingReport(tenantId, { startDate, endDate }) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId,
        bookingDate: { gte: start, lte: end },
      },
    });

    const summary = {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      noShow: bookings.filter((b) => b.status === 'no-show').length,
      totalGuests: bookings.reduce((sum, b) => sum + b.guests, 0),
      bySource: {},
    };

    bookings.forEach((b) => {
      summary.bySource[b.source] = (summary.bySource[b.source] || 0) + 1;
    });

    return summary;
  }

  /**
   * Get platform-wide revenue report (super admin)
   */
  async getPlatformRevenueReport({ startDate, endDate }) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    const [tenants, commissions, subscriptions] = await Promise.all([
      prisma.tenant.count({ where: { status: { in: ['active', 'trial'] } } }),
      prisma.platformCommission.aggregate({
        where: { createdAt: { gte: start, lte: end } },
        _sum: { commissionAmount: true, transactionAmount: true },
        _count: true,
      }),
      prisma.tenant.count({
        where: {
          status: 'active',
          razorpaySubscriptionId: { not: null },
        },
      }),
    ]);

    return {
      activeTenants: tenants,
      activeSubscriptions: subscriptions,
      totalCommissionRevenue: Number(commissions._sum.commissionAmount || 0),
      totalTransactionVolume: Number(commissions._sum.transactionAmount || 0),
      transactionCount: commissions._count,
    };
  }
}

module.exports = new ReportService();
