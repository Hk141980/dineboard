// ============================================
// DineBoard — Authentication Middleware
// JWT verification + role-based access control
// ============================================

const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dineboard-secret-key';

/**
 * Generate JWT token for staff/owner login
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
}

/**
 * Verify JWT token and attach user to request
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
      type: decoded.type, // 'staff' or 'superadmin'
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
}

/**
 * Authorize specific roles
 * @param  {...string} roles - Allowed roles (owner, manager, waiter, chef, cashier)
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Super admin can access everything
    if (req.user.type === 'superadmin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
}

/**
 * Super admin only middleware
 */
function superAdminOnly(req, res, next) {
  if (!req.user || req.user.type !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required.',
    });
  }
  next();
}

module.exports = {
  generateToken,
  generateRefreshToken,
  authenticate,
  authorize,
  superAdminOnly,
};
