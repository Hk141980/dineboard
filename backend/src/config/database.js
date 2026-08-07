// ============================================
// DineBoard — Database Configuration
// Prisma Client with multi-tenant support
// ============================================

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  // In development, reuse the client to avoid too many connections
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.__prisma;
}

/**
 * Execute a callback with tenant context set via RLS
 * @param {string} tenantId - The tenant UUID
 * @param {Function} callback - Async function to execute with tenant context
 */
async function withTenantContext(tenantId, callback) {
  return prisma.$transaction(async (tx) => {
    // Set the tenant context for RLS
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_tenant = '${tenantId}'`
    );
    return callback(tx);
  });
}

module.exports = { prisma, withTenantContext };
