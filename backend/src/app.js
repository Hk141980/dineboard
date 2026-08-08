// ============================================
// DineBoard — Express Application Entry Point
// Multi-Tenant SaaS Restaurant Management API
// ============================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/error-handler');
const { apiLimiter, authLimiter, webhookLimiter } = require('./middleware/rate-limiter');

const app = express();
const PORT = process.env.PORT || 4000;

// ---- Global Middleware ----
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.APP_URL || 'http://localhost:3000']
    : true, // Allow all origins in development
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (logos, etc.)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
const customerPath = path.join(process.cwd(), 'frontend/customer');
app.use(express.static(customerPath));
app.get('/customer.html', (req, res) => {
  res.sendFile(path.join(customerPath, 'index.html'));
});

// ---- Health Check ----
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DineBoard API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ---- API Routes ----
// Auth (stricter rate limit)
app.use('/api/auth', authLimiter, require('./routes/auth'));

// Platform (public landing page APIs)
app.use('/api/platform', apiLimiter, require('./routes/platform'));

// Restaurants (public + admin)
app.use('/api/restaurants', apiLimiter, require('./routes/restaurants'));
app.use('/api/tenants', apiLimiter, require('./routes/restaurants'));

// Menu (public + admin)
app.use('/api/menu', apiLimiter, require('./routes/menu'));

// Tables (admin)
app.use('/api/tables', apiLimiter, require('./routes/tables'));

// Bookings (public + admin)
app.use('/api/bookings', apiLimiter, require('./routes/bookings'));

// Orders (public + admin)
app.use('/api/orders', apiLimiter, require('./routes/orders'));

// Staff (admin)
app.use('/api/staff', apiLimiter, require('./routes/staff'));

// Promo Codes (admin + public validation)
app.use('/api/promos', apiLimiter, require('./routes/promos'));

// Invoices (admin)
app.use('/api/invoices', apiLimiter, require('./routes/invoices'));

// Reports (admin)
app.use('/api/reports', apiLimiter, require('./routes/reports'));

// Payment Settlements (admin)
app.use('/api/settlements', apiLimiter, require('./routes/settlements'));

// Payments (admin + webhooks)
app.use('/api/payments', apiLimiter, require('./routes/payments'));

// WhatsApp (webhooks — higher rate limit)
app.use('/api/whatsapp', webhookLimiter, require('./routes/whatsapp'));
app.use('/webhooks/whatsapp', webhookLimiter, require('./routes/whatsapp'));

// AI (public + admin)
app.use('/api/ai', apiLimiter, require('./routes/ai'));

// Super Admin (platform management)
app.use('/api/superadmin', apiLimiter, require('./routes/superadmin'));

// ---- S3 File Proxy (public, for logos etc.) ----
app.get('/api/uploads/s3/*', async (req, res, next) => {
  try {
    const key = req.params[0]; // everything after /api/uploads/s3/
    if (!key) return res.status(400).json({ success: false, message: 'No key specified.' });

    const bucket = process.env.AWS_S3_BUCKET;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      return res.status(404).json({ success: false, message: 'S3 not configured.' });
    }

    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: { accessKeyId, secretAccessKey },
    });

    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (result.ContentType) res.setHeader('Content-Type', result.ContentType);
    if (result.ContentLength) res.setHeader('Content-Length', String(result.ContentLength));

    result.Body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey') return res.status(404).send('Not found');
    next(error);
  }
});

// (Static uploads already mounted at line 32)

// ---- Error Handling ----
app.use(notFound);
app.use(errorHandler);

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🍽️  DineBoard API Server                ║
  ║   Running on port ${PORT}                   ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}            ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
  `);

  // ---- Auto Table Release Job (every 10 seconds) ----
  setInterval(async () => {
    try {
      const { prisma } = require('./config/database');
      // Release tables that have been in 'cleaning' status for 40 seconds
      const cleaningCutoff = new Date(Date.now() - 40 * 1000);

      const result = await prisma.table.updateMany({
        where: {
          status: 'cleaning',
          updatedAt: { lte: cleaningCutoff },
        },
        data: { status: 'available' },
      });

      if (result.count > 0) {
        console.log(`🧹 Auto-released ${result.count} table(s) from 'cleaning' → 'available' after 40s`);
      }

      // Also release occupied tables from completed/paid orders older than 60 min
      const occupiedCutoff = new Date(Date.now() - 60 * 60 * 1000);
      const staleOrders = await prisma.order.findMany({
        where: {
          assignedTableId: { not: null },
          status: { in: ['paid', 'served', 'billed'] },
          updatedAt: { lte: occupiedCutoff },
        },
        select: { assignedTableId: true },
      });

      const staleTableIds = [...new Set(staleOrders.map(o => o.assignedTableId).filter(Boolean))];
      if (staleTableIds.length > 0) {
        const released = await prisma.table.updateMany({
          where: { id: { in: staleTableIds }, status: { in: ['occupied', 'cleaning'] } },
          data: { status: 'available' },
        });
        if (released.count > 0) {
          console.log(`🪑 Force-released ${released.count} stale occupied table(s) → 'available'`);
        }
      }
    } catch (e) {
      console.error('Table auto-release error:', e.message);
    }
  }, 10 * 1000); // Every 10 seconds
});

module.exports = app;
