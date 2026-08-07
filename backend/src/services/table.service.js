// ============================================
// DineBoard — Table Service
// Table management with status tracking
// ============================================

const { prisma } = require('../config/database');

class TableService {
  /**
   * Dynamic real-time table status calculation
   */
  async refreshTableStatuses(tenantId) {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMins = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMins}`;

      // Auto-complete expired bookings whose end time has passed
      await prisma.booking.updateMany({
        where: {
          tenantId,
          status: 'confirmed',
          OR: [
            { bookingDate: { lt: startOfDay } },
            {
              bookingDate: { gte: startOfDay, lte: endOfDay },
              endTime: { lte: currentTimeStr },
            },
          ],
        },
        data: { status: 'completed' },
      });

      const tables = await prisma.table.findMany({
        where: { tenantId, isActive: true },
      });

      // Get all confirmed bookings for TODAY where end time has not passed
      const activeBookings = await prisma.booking.findMany({
        where: {
          tenantId,
          status: 'confirmed',
          bookingDate: { gte: startOfDay, lte: endOfDay },
          endTime: { gt: currentTimeStr },
        },
        include: { bookingTables: true },
      });

      const currentlyReservedTableIds = new Set();
      activeBookings.forEach((b) => {
        b.bookingTables.forEach((bt) => currentlyReservedTableIds.add(bt.tableId));
      });

      // Get active orders currently placed on tables (billed orders keep table occupied until paid)
      const activeOrders = await prisma.order.findMany({
        where: {
          tenantId,
          status: { in: ['pending', 'preparing', 'ready', 'served', 'billed'] },
          assignedTableId: { not: null },
        },
      });

      const currentlyOccupiedTableIds = new Set(
        activeOrders.map((o) => o.assignedTableId)
      );

      // Update table statuses dynamically in database
      for (const table of tables) {
        let targetStatus = 'available';

        if (currentlyOccupiedTableIds.has(table.id)) {
          targetStatus = 'occupied';
        } else if (currentlyReservedTableIds.has(table.id)) {
          targetStatus = 'reserved';
        } else if (table.status === 'cleaning') {
          targetStatus = 'cleaning';
        }

        if (table.status !== targetStatus) {
          await prisma.table.update({
            where: { id: table.id },
            data: { status: targetStatus },
          });
        }
      }
    } catch (err) {
      console.error('Error refreshing table statuses:', err.message);
    }
  }

  /**
   * Get all tables for a tenant with real-time dynamic status
   */
  async getTables(tenantId, { section, status } = {}) {
    await this.refreshTableStatuses(tenantId);

    const where = { tenantId };
    if (section) where.section = section;
    if (status) where.status = status;

    return prisma.table.findMany({
      where,
      orderBy: [{ section: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Create a new table
   */
  async createTable(tenantId, data) {
    const normalizedName = data.name ? data.name.trim() : '';
    if (!normalizedName) {
      return { success: false, message: 'Table name is required.' };
    }

    // Check unique name per tenant
    const existingName = await prisma.table.findFirst({
      where: {
        tenantId,
        name: { equals: normalizedName, mode: 'insensitive' },
      },
    });
    if (existingName) {
      return { success: false, message: `Table "${normalizedName}" already exists.` };
    }

    // Check plan limits
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptionPlan: true },
    });

    const currentCount = await prisma.table.count({ where: { tenantId } });
    if (tenant.subscriptionPlan && currentCount >= tenant.subscriptionPlan.maxTables) {
      return {
        success: false,
        message: `Table limit reached (${tenant.subscriptionPlan.maxTables}). Upgrade your plan.`,
      };
    }

    const table = await prisma.table.create({
      data: {
        tenantId,
        name: normalizedName,
        capacity: data.capacity,
        section: data.section || 'Indoor',
      },
    });

    return { success: true, table };
  }

  /**
   * Update table details
   */
  async updateTable(tableId, tenantId, data) {
    const normalizedName = data.name ? data.name.trim() : '';
    if (!normalizedName) {
      return { success: false, message: 'Table name is required.' };
    }

    // Check unique name per tenant for other tables
    const existingName = await prisma.table.findFirst({
      where: {
        tenantId,
        id: { not: tableId },
        name: { equals: normalizedName, mode: 'insensitive' },
      },
    });
    if (existingName) {
      return { success: false, message: `Table "${normalizedName}" already exists.` };
    }

    const table = await prisma.table.update({
      where: { id: tableId, tenantId },
      data: {
        name: normalizedName,
        capacity: data.capacity,
        section: data.section,
        isActive: data.isActive,
      },
    });

    return { success: true, table };
  }

  /**
   * Manually toggle table status
   */
  async updateTableStatus(tableId, tenantId, status) {
    const updatedTable = await prisma.table.update({
      where: { id: tableId, tenantId },
      data: { status },
    });

    // If admin manually sets status to 'available', 'occupied', or 'cleaning', sync bookings & orders
    if (status === 'available' || status === 'cleaning') {
      await prisma.order.updateMany({
        where: {
          tenantId,
          assignedTableId: tableId,
          status: { in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
        },
        data: { status: 'completed' },
      });

      // Complete active bookings for this table
      const tableBookings = await prisma.bookingTable.findMany({
        where: { tableId },
        select: { bookingId: true },
      });
      if (tableBookings.length > 0) {
        await prisma.booking.updateMany({
          where: {
            id: { in: tableBookings.map((tb) => tb.bookingId) },
            tenantId,
            status: 'confirmed',
          },
          data: { status: 'completed' },
        });
      }
    } else if (status === 'occupied') {
      // Mark confirmed bookings as completed (seated) when table becomes occupied
      const tableBookings = await prisma.bookingTable.findMany({
        where: { tableId },
        select: { bookingId: true },
      });
      if (tableBookings.length > 0) {
        await prisma.booking.updateMany({
          where: {
            id: { in: tableBookings.map((tb) => tb.bookingId) },
            tenantId,
            status: 'confirmed',
          },
          data: { status: 'completed' },
        });
      }
    }

    // Auto-transition cleaning tables to available after 40 seconds
    if (status === 'cleaning') {
      setTimeout(async () => {
        try {
          await prisma.table.updateMany({
            where: { id: tableId, status: 'cleaning' },
            data: { status: 'available' },
          });
        } catch (e) {}
      }, 40 * 1000);
    }

    return updatedTable;
  }

  /**
   * Update seating combination (merge/split tables)
   */
  async updateSeatingCombination(tenantId, { tableIds, newCapacity, combinedName }) {
    // Mark individual tables as part of a combination
    for (const id of tableIds) {
      await prisma.table.update({
        where: { id, tenantId },
        data: { isActive: false },
      });
    }

    // Create a new combined table
    const combinedTable = await prisma.table.create({
      data: {
        tenantId,
        name: combinedName || `Combined (${tableIds.length} tables)`,
        capacity: newCapacity,
        section: 'Combined',
      },
    });

    return combinedTable;
  }

  /**
   * Get table utilization stats
   */
  async getTableStats(tenantId) {
    const tables = await prisma.table.findMany({
      where: { tenantId, isActive: true },
    });

    const stats = {
      total: tables.length,
      available: tables.filter((t) => t.status === 'available').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
      reserved: tables.filter((t) => t.status === 'reserved').length,
      cleaning: tables.filter((t) => t.status === 'cleaning').length,
      totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0),
      sections: {},
    };

    // Group by section
    tables.forEach((t) => {
      if (!stats.sections[t.section]) {
        stats.sections[t.section] = { total: 0, available: 0 };
      }
      stats.sections[t.section].total++;
      if (t.status === 'available') stats.sections[t.section].available++;
    });

    return stats;
  }
}

module.exports = new TableService();
