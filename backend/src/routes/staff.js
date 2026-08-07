// ============================================
// DineBoard — Staff Routes
// ============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantFromAuth } = require('../middleware/tenant-context');

const router = express.Router();

/**
 * GET /api/staff
 * Owner: List all staff
 */
router.get('/', authenticate, authorize('owner', 'manager'), tenantFromAuth, async (req, res, next) => {
  try {
    const staff = await prisma.staff.findMany({
      where: { tenantId: req.tenant.id },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, isActive: true, createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Check plan limits
    const limit = req.tenant.subscriptionPlan?.maxStaff || 5;
    res.json({ success: true, data: { staff, limit, current: staff.length } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/staff
 * Owner: Add staff with role
 */
router.post('/', authenticate, authorize('owner'), tenantFromAuth, async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const validRoles = ['manager', 'waiter', 'chef', 'cashier'];

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Use: ${validRoles.join(', ')}` });
    }

    // Validate 10-digit phone
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    // Check plan limits
    const count = await prisma.staff.count({ where: { tenantId: req.tenant.id } });
    const limit = req.tenant.subscriptionPlan?.maxStaff || 5;
    if (count >= limit) {
      return res.status(403).json({ success: false, message: `Staff limit reached (${limit}). Upgrade your plan.` });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const staff = await prisma.staff.create({
      data: { tenantId: req.tenant.id, name, email, phone, passwordHash: hashedPassword, role },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
    });

    res.status(201).json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/staff/:id
 * Owner: Update staff
 */
router.put('/:id', authenticate, authorize('owner'), tenantFromAuth, async (req, res, next) => {
  try {
    const { name, phone, role, isActive, password } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

    const staff = await prisma.staff.update({
      where: { id: req.params.id, tenantId: req.tenant.id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/staff/:id
 * Owner: Remove staff
 */
router.delete('/:id', authenticate, authorize('owner'), tenantFromAuth, async (req, res, next) => {
  try {
    // Prevent deleting self
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }

    await prisma.staff.delete({ where: { id: req.params.id, tenantId: req.tenant.id } });
    res.json({ success: true, message: 'Staff member removed.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
