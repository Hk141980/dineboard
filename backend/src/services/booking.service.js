// ============================================
// DineBoard — Booking Service
// Smart table booking with configurable slots
// ============================================

const { prisma } = require('../config/database');
const { generateCode, calculateEndTime, timeToMinutes, isWithinOperatingHours } = require('../utils/helpers');
const tableService = require('./table.service');

class BookingService {
  /**
   * Check table availability for a given date, time, and guest count
   */
  async checkAvailability(tenantId, { date, time, guests }) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const slotMinutes = tenant?.bookingSlotMinutes ? Number(tenant.bookingSlotMinutes) : 60;
    const endTime = calculateEndTime(time, slotMinutes);

    // Validate operating hours (openingTime & closingTime)
    const openTime = tenant?.openingTime || '09:00';
    const closeTime = tenant?.closingTime || '23:00';

    if (!isWithinOperatingHours(time, openTime, closeTime)) {
      return {
        available: false,
        message: `Restaurant is closed at ${time}. Operating hours are ${openTime} to ${closeTime}. Please choose a time during operating hours.`,
        alternatives: [],
      };
    }

    // Validate that booking date and time is NOT in the past
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const [reqHours, reqMins] = time.split(':').map(Number);
    const requestedLocalMs = new Date(year, month - 1, day, reqHours, reqMins, 0, 0).getTime();
    const nowMs = new Date().getTime();

    if (requestedLocalMs < nowMs - 5 * 60 * 1000) {
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      const tomDateStr = tom.toISOString().split('T')[0];

      return {
        available: false,
        isPastTime: true,
        tomorrowDate: tomDateStr,
        message: `${time} for today has already passed. Please select a future time slot or book for tomorrow!`,
        alternatives: [],
      };
    }

    // Get all active tables for this restaurant
    const allTables = await prisma.table.findMany({
      where: { tenantId, isActive: true },
      orderBy: { capacity: 'asc' },
    });

    // Get bookings that overlap with the requested time slot
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        tenantId,
        bookingDate: new Date(date),
        status: { in: ['confirmed', 'completed'] },
        OR: [
          {
            AND: [
              { bookingTime: { lte: time } },
              { endTime: { gt: time } },
            ],
          },
          {
            AND: [
              { bookingTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { bookingTime: { gte: time } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
      include: { bookingTables: true },
    });

    // Get IDs of tables already booked during this slot
    const bookedTableIds = new Set();
    overlappingBookings.forEach((booking) => {
      booking.bookingTables.forEach((bt) => bookedTableIds.add(bt.tableId));
    });

    // Find available tables
    const availableTables = allTables.filter((t) => !bookedTableIds.has(t.id));

    // Find best table combination for the guest count
    const suggestion = this.findBestTableCombination(availableTables, guests);

    if (suggestion.length > 0) {
      return {
        available: true,
        tables: suggestion,
        slotStart: time,
        slotEnd: endTime,
        diningMinutes: tenant.diningMinutes,
        cleaningMinutes: tenant.cleaningMinutes,
      };
    }

    // No tables available — suggest alternative times
    const alternatives = await this.suggestAlternativeTimes(
      tenantId, date, guests, tenant, time
    );

    return {
      available: false,
      message: 'No tables available for the requested time.',
      alternatives,
      restaurantPhone: tenant.phone,
    };
  }

  /**
   * Find the best combination of tables to seat guests
   */
  findBestTableCombination(tables, guests) {
    // First, try to find a single table that fits
    const singleTable = tables.find((t) => t.capacity >= guests);
    if (singleTable) return [singleTable];

    // If no single table, try combining tables
    const sorted = [...tables].sort((a, b) => b.capacity - a.capacity);
    const combination = [];
    let remaining = guests;

    for (const table of sorted) {
      if (remaining <= 0) break;
      combination.push(table);
      remaining -= table.capacity;
    }

    if (remaining <= 0) return combination;
    return []; // Cannot accommodate
  }

  /**
   * Suggest alternative available times for the same date
   */
  async suggestAlternativeTimes(tenantId, date, guests, tenant, requestedTime = '19:00') {
    const alternatives = [];
    const openMinutes = timeToMinutes(tenant.openingTime || '09:00');
    let closeMinutes = timeToMinutes(tenant.closingTime || '23:00');

    if (closeMinutes <= openMinutes || (closeMinutes - openMinutes) < 120) {
      closeMinutes = 23 * 60; // Fallback to 23:00
    }

    const slotMinutes = tenant?.bookingSlotMinutes ? Number(tenant.bookingSlotMinutes) : 60;
    const reqMins = timeToMinutes(requestedTime);

    // Candidates: offsets from requested time (-2h, -1h, +1h, +2h, +3h, +4h)
    const offsets = [-120, -60, 60, 120, 180, 240];
    const candidateMinutes = [];

    offsets.forEach((offset) => {
      const targetM = reqMins + offset;
      if (targetM >= openMinutes && targetM <= closeMinutes - slotMinutes) {
        candidateMinutes.push(targetM);
      }
    });

    // Fallback: check every hour from open to close
    for (let m = openMinutes; m <= closeMinutes - slotMinutes; m += 60) {
      if (!candidateMinutes.includes(m)) candidateMinutes.push(m);
    }

    const allTables = await prisma.table.findMany({
      where: { tenantId, isActive: true },
      orderBy: { capacity: 'asc' },
    });

    for (const m of candidateMinutes) {
      const hours = Math.floor(m / 60);
      const mins = m % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      const endTime = calculateEndTime(timeStr, slotMinutes);

      const overlappingBookings = await prisma.booking.findMany({
        where: {
          tenantId,
          bookingDate: new Date(date),
          status: { in: ['confirmed', 'completed'] },
          OR: [
            { AND: [{ bookingTime: { lte: timeStr } }, { endTime: { gt: timeStr } }] },
            { AND: [{ bookingTime: { lt: endTime } }, { endTime: { gte: endTime } }] },
            { AND: [{ bookingTime: { gte: timeStr } }, { endTime: { lte: endTime } }] },
          ],
        },
        include: { bookingTables: true },
      });

      const bookedTableIds = new Set();
      overlappingBookings.forEach((b) => b.bookingTables.forEach((bt) => bookedTableIds.add(bt.tableId)));

      const availableTables = allTables.filter((t) => !bookedTableIds.has(t.id));
      const combination = this.findBestTableCombination(availableTables, guests);

      if (combination.length > 0) {
        alternatives.push({
          time: timeStr,
          tables: combination.map((t) => ({ name: t.name, capacity: t.capacity, section: t.section })),
        });
        if (alternatives.length >= 4) break;
      }
    }

    return alternatives;
  }

  /**
   * Create a confirmed booking
   */
  async createBooking(tenantId, data) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const slotMinutes = tenant?.bookingSlotMinutes ? Number(tenant.bookingSlotMinutes) : 60;
    const endTime = calculateEndTime(data.time, slotMinutes);

    // Check availability first
    const availability = await this.checkAvailability(tenantId, {
      date: data.date,
      time: data.time,
      guests: data.guests,
    });

    if (!availability.available) {
      return { success: false, ...availability };
    }

    const bookingCode = generateCode('BKG');

    const booking = await prisma.booking.create({
      data: {
        tenantId,
        bookingCode,
        bookingDate: new Date(data.date),
        bookingTime: data.time,
        endTime,
        guests: data.guests,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        note: data.note,
        source: data.source || 'website',
        status: 'confirmed',
        bookingTables: {
          create: availability.tables.map((t) => ({
            tableId: t.id,
          })),
        },
      },
      include: {
        bookingTables: {
          include: { table: true },
        },
      },
    });

    // Refresh dynamic table status based on current active time
    await tableService.refreshTableStatuses(tenantId);

    // Auto-send WhatsApp booking confirmation
    try {
      const whatsappService = require('./whatsapp.service');
      await whatsappService.sendBookingConfirmation(booking, tenant);
    } catch (e) {
      console.error('Auto WhatsApp booking confirmation error:', e.message);
    }

    return { success: true, booking };
  }

  /**
   * Cancel an active booking by phone number or booking code
   */
  async cancelBookingByCustomer(tenantId, customerPhone, bookingCode = null) {
    const whereClause = {
      tenantId,
      customerPhone,
      status: 'confirmed',
    };
    if (bookingCode) {
      whereClause.bookingCode = bookingCode.toUpperCase();
    }

    const booking = await prisma.booking.findFirst({
      where: whereClause,
      include: { bookingTables: { include: { table: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!booking) {
      return {
        success: false,
        message: bookingCode
          ? `No active confirmed reservation found with code ${bookingCode}.`
          : `No active confirmed table reservation found for your phone number.`,
      };
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });

    // Free up assigned tables
    if (booking.bookingTables && booking.bookingTables.length > 0) {
      for (const bt of booking.bookingTables) {
        await prisma.table.update({
          where: { id: bt.tableId },
          data: { status: 'available' },
        });
      }
    }

    const formattedDate = new Date(booking.bookingDate).toISOString().split('T')[0];
    return {
      success: true,
      booking,
      message: `Your table reservation (${booking.bookingCode}) for ${booking.guests} guests on ${formattedDate} at ${booking.bookingTime} has been cancelled.`,
    };
  }

  /**
   * Cancel a booking by ID
   */
  async cancelBooking(bookingId, tenantId) {
    const booking = await prisma.booking.update({
      where: { id: bookingId, tenantId },
      data: { status: 'cancelled' },
      include: { bookingTables: true },
    });

    // Free up the tables
    for (const bt of booking.bookingTables) {
      await prisma.table.update({
        where: { id: bt.tableId },
        data: { status: 'available' },
      });
    }

    return booking;
  }

  /**
   * Get all bookings for a tenant with filters
   */
  async getBookings(tenantId, { date, status, page = 1, limit = 20 }) {
    const where = { tenantId };
    if (date) where.bookingDate = new Date(date);
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          bookingTables: { include: { table: true } },
        },
        orderBy: { bookingDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, total, page, totalPages: Math.ceil(total / limit) };
  }
}

module.exports = new BookingService();
