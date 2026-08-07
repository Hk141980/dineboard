// ============================================
// DineBoard — Rate Limiter Middleware
// Protects API from abuse
// ============================================

const rateLimit = require('express-rate-limit');

// Helper to skip rate limiting for local development
const isLocal = (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || process.env.NODE_ENV === 'development';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 requests per window
  skip: isLocal,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login attempts per window
  skip: isLocal,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// WhatsApp webhook rate limiter (higher limit)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 messages per minute
  message: {
    success: false,
    message: 'Rate limit exceeded.',
  },
});

module.exports = { apiLimiter, authLimiter, webhookLimiter };
