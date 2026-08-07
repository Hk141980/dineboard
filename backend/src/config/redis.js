// ============================================
// DineBoard — Redis Configuration
// Used for caching, BullMQ queues, and AI context
// ============================================

const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

/**
 * Create a new Redis connection for BullMQ
 * BullMQ requires separate connections for worker and queue
 */
function createRedisConnection() {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

module.exports = { redis, createRedisConnection };
