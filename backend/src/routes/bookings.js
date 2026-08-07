// ============================================
// DineBoard — Booking Routes
// ============================================

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { tenantFromAuth, tenantFromSlug } = require('../middleware/tenant-context');
const bookingService = require('../services/booking.service');
const whatsappService = require('../services/whatsapp.service');

const router = express.Router();

/**
 * POST /api/bookings/check-availability
 * Public: Check table availability
 */
router.post('/check-availability', tenantFromSlug, async (req, res, next) => {
  try {
    const { date, time, guests } = req.body;
    if (!date || !time || !guests) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, and guest count are required.',
      });
    }

    const result = await bookingService.checkAvailability(req.tenant.id, { date, time, guests });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings/confirm
 * Public: Confirm booking (no login required)
 */
router.post('/confirm', tenantFromSlug, async (req, res, next) => {
  try {
    const { date, time, guests, customerName, customerPhone, customerEmail, note, source } = req.body;

    if (!date || !time || !guests || !customerName || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, guests, name, and phone are required.',
      });
    }

    const result = await bookingService.createBooking(req.tenant.id, {
      date, time, guests, customerName, customerPhone, customerEmail, note,
      source: source || 'website',
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Send WhatsApp confirmation
    try {
      await whatsappService.sendBookingConfirmation(result.booking, req.tenant);
    } catch (e) {
      console.error('WhatsApp confirmation error:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Booking confirmed! You\'ll receive a WhatsApp confirmation shortly.',
      data: result.booking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bookings
 * Admin: List all bookings
 */
router.get('/', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const result = await bookingService.getBookings(req.tenant.id, req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/bookings/:id/status
 * Admin: Update booking status
 */
router.put('/:id/status', authenticate, tenantFromAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['confirmed', 'cancelled', 'completed', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Use: ${validStatuses.join(', ')}`,
      });
    }

    if (status === 'cancelled') {
      const booking = await bookingService.cancelBooking(req.params.id, req.tenant.id);
      return res.json({ success: true, data: booking });
    }

    const { prisma } = require('../config/database');
    const booking = await prisma.booking.update({
      where: { id: req.params.id, tenantId: req.tenant.id },
      data: { status },
    });

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
