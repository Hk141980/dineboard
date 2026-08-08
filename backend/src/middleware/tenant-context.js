// ============================================
// DineBoard — Tenant Context Middleware
// Extracts tenant from JWT or URL slug
// ============================================

const { prisma } = require('../config/database');

/**
 * Extract tenant context from authenticated staff JWT
 * Sets req.tenant with full tenant details
 */
async function tenantFromAuth(req, res, next) {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context not found in token.',
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      include: { subscriptionPlan: true },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found.',
      });
    }

    if (tenant.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Restaurant account has been suspended. Contact support.',
      });
    }

    // Auto-expire trial if trialEndsAt has passed
    if (tenant.status === 'trial' && tenant.trialEndsAt && new Date() > new Date(tenant.trialEndsAt)) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'expired' },
      });
      tenant.status = 'expired';
    }

    if (tenant.status === 'expired') {
      return res.status(403).json({
        success: false,
        isExpired: true,
        message: 'Your 2-day free trial has expired. Please select a subscription plan to continue.',
      });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    next(error);
  }
}

async function tenantFromSlug(req, res, next) {
  try {
    let slug = req.params?.slug || req.query?.r || req.query?.slug;
    let tenant = null;

    if (slug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug },
        include: { subscriptionPlan: true },
      });
    }

    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: { status: { in: ['active', 'trial'] } },
        include: { subscriptionPlan: true },
      });
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found.',
      });
    }

    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      return res.status(403).json({
        success: false,
        message: 'This restaurant is currently unavailable.',
      });
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { tenantFromAuth, tenantFromSlug };
