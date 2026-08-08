// ============================================
// DineBoard — BullMQ Background Workers
// Handles reminders, table status, invoices,
// commissions, and AI context cleanup
// ============================================

require('dotenv').config();

const { Worker, Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { prisma } = require('../config/database');
const whatsappService = require('../services/whatsapp.service');
const invoiceService = require('../services/invoice.service');
const commissionService = require('../services/commission.service');
const { getIndianDateString } = require('../utils/helpers');

const connection = createRedisConnection();

// ---- Queues ----
const reminderQueue = new Queue('booking-reminders', { connection });
const tableStatusQueue = new Queue('table-status', { connection });
const invoiceQueue = new Queue('invoice-generation', { connection });
const commissionQueue = new Queue('commission-tracking', { connection });

// ============================================
// Worker 1: Booking Reminders
// Sends WhatsApp reminders 1hr and 30min before
// ============================================
const reminderWorker = new Worker('booking-reminders', async (job) => {
  const now = new Date();

  // 1. Check for 1-hour reminders (reminder1Sent = false)
  const bookings1Hr = await prisma.booking.findMany({
    where: {
      status: 'confirmed',
      reminder1Sent: false,
    },
    include: { tenant: true },
  });

  for (const booking of bookings1Hr) {
    try {
      const dateStr = getIndianDateString(booking.bookingDate);
      const timeStr = booking.bookingTime.length === 5 ? `${booking.bookingTime}:00` : booking.bookingTime;
      const bookingDateTime = new Date(`${dateStr}T${timeStr}`);
      const diffMin = (bookingDateTime.getTime() - now.getTime()) / 60000;

      if (diffMin <= 60 && diffMin > 30) {
        await whatsappService.sendBookingReminder(booking, booking.tenant, 60);
        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminder1Sent: true },
        });
        console.log(`✅ 1-hr reminder sent for booking ${booking.bookingCode}`);
      }
    } catch (e) {
      console.error(`❌ 1-hr reminder error for ${booking.bookingCode}:`, e.message);
    }
  }

  // 2. Check for 30-minute reminders (reminder2Sent = false)
  const bookings30Min = await prisma.booking.findMany({
    where: {
      status: 'confirmed',
      reminder2Sent: false,
    },
    include: { tenant: true },
  });

  for (const booking of bookings30Min) {
    try {
      const dateStr = getIndianDateString(booking.bookingDate);
      const timeStr = booking.bookingTime.length === 5 ? `${booking.bookingTime}:00` : booking.bookingTime;
      const bookingDateTime = new Date(`${dateStr}T${timeStr}`);
      const diffMin = (bookingDateTime.getTime() - now.getTime()) / 60000;

      if (diffMin <= 30 && diffMin > 0) {
        await whatsappService.sendBookingReminder(booking, booking.tenant, 30);
        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminder2Sent: true },
        });
        console.log(`✅ 30-min reminder sent for booking ${booking.bookingCode}`);
      }
    } catch (e) {
      console.error(`❌ 30-min reminder error for ${booking.bookingCode}:`, e.message);
    }
  }
}, { connection });

// ============================================
// Worker 2: Table Status Management
// Auto-transitions: occupied → cleaning → available
// ============================================
const tableStatusWorker = new Worker('table-status', async (job) => {
  const { tableId, tenantId, action } = job.data;

  switch (action) {
    case 'start-cleaning':
      await prisma.table.update({
        where: { id: tableId },
        data: { status: 'cleaning' },
      });
      console.log(`🧹 Table ${tableId} → cleaning`);

      // Schedule availability after cleaning_minutes
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const cleaningMs = (tenant.cleaningMinutes || 15) * 60 * 1000;

      await tableStatusQueue.add('mark-available', {
        tableId,
        tenantId,
        action: 'mark-available',
      }, { delay: cleaningMs });
      break;

    case 'mark-available':
      await prisma.table.update({
        where: { id: tableId },
        data: { status: 'available' },
      });
      console.log(`✅ Table ${tableId} → available`);
      break;
  }
}, { connection });

// ============================================
// Worker 3: Invoice Generation
// ============================================
const invoiceWorker = new Worker('invoice-generation', async (job) => {
  const { orderId, tenantId } = job.data;

  try {
    const result = await invoiceService.generateInvoice(orderId, tenantId);
    if (result.success) {
      console.log(`📄 Invoice generated: ${result.invoice.invoiceNumber}`);
    }
  } catch (e) {
    console.error(`❌ Invoice error for order ${orderId}:`, e.message);
  }
}, { connection });

// ============================================
// Worker 4: Commission Tracking
// ============================================
const commissionWorker = new Worker('commission-tracking', async (job) => {
  const { tenantId, orderId, bookingId, amount, type } = job.data;

  try {
    if (type === 'order') {
      await commissionService.trackOrderCommission(tenantId, orderId, amount);
      console.log(`💰 Order commission tracked for tenant ${tenantId}`);
    } else if (type === 'booking') {
      await commissionService.trackBookingCommission(tenantId, bookingId, amount);
      console.log(`💰 Booking commission tracked for tenant ${tenantId}`);
    }
  } catch (e) {
    console.error(`❌ Commission error:`, e.message);
  }
}, { connection });

// ============================================
// Cron-style recurring checks
// ============================================

// Check for booking reminders every 5 minutes
setInterval(async () => {
  try {
    await reminderQueue.add('check-reminders', {}, { removeOnComplete: true });
  } catch (e) {
    console.error('Reminder cron error:', e.message);
  }
}, 5 * 60 * 1000);

// AI context cleanup — every hour
setInterval(async () => {
  try {
    const { redis } = require('../config/redis');
    const keys = await redis.keys('chat:*');
    let cleaned = 0;
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        await redis.expire(key, 3600);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} stale AI conversation contexts`);
    }
  } catch (e) {
    console.error('AI cleanup error:', e.message);
  }
}, 60 * 60 * 1000);

// Trial Expiration Check — runs every 15 minutes
setInterval(async () => {
  try {
    const res = await prisma.tenant.updateMany({
      where: {
        status: 'trial',
        trialEndsAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
    if (res.count > 0) {
      console.log(`⏰ Updated ${res.count} expired trial accounts to 'expired' status`);
    }
  } catch (e) {
    console.error('Trial expiration cron error:', e.message);
  }
}, 15 * 60 * 1000);

// Monthly commission invoice check — daily at midnight
setInterval(async () => {
  const now = new Date();
  if (now.getDate() === 1 && now.getHours() === 0) {
    try {
      const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      const ownRazorpayTenants = await prisma.tenant.findMany({
        where: { usesOwnRazorpay: true, status: 'active' },
      });

      for (const tenant of ownRazorpayTenants) {
        await commissionService.generateMonthlyInvoice(tenant.id, lastMonth, year);
        console.log(`📄 Monthly commission invoice generated for ${tenant.name}`);
      }
    } catch (e) {
      console.error('Monthly invoice error:', e.message);
    }
  }
}, 24 * 60 * 60 * 1000);
// Schedule booking reminder check every 60 seconds
setInterval(async () => {
  try {
    await reminderQueue.add('check-reminders', {}, { removeOnComplete: true, removeOnFail: true });
  } catch (e) {
    console.error('Failed to queue reminder check:', e.message);
  }
}, 60 * 1000);

// Immediate check on worker startup
reminderQueue.add('check-reminders', {}, { removeOnComplete: true, removeOnFail: true }).catch(() => {});

// ---- Worker Event Listeners ----
[reminderWorker, tableStatusWorker, invoiceWorker, commissionWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.name} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.name} failed:`, err.message);
  });
});

console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🍽️  DineBoard Worker Service            ║
║   Workers: reminders, tables,             ║
║            invoices, commissions          ║
║                                           ║
╚═══════════════════════════════════════════╝
`);

// Export queues for use in routes
module.exports = {
  reminderQueue,
  tableStatusQueue,
  invoiceQueue,
  commissionQueue,
};
