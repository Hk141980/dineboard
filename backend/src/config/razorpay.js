// ============================================
// DineBoard — Razorpay Configuration
// Platform payments, subscriptions & Route splits
// ============================================

const Razorpay = require('razorpay');

// Platform's Razorpay instance (for subscriptions & commission collection)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay instance for a tenant using their own keys
 * @param {Object} paymentConfig - { keyId, keySecret }
 */
function createTenantRazorpay(paymentConfig) {
  if (!paymentConfig || !paymentConfig.keyId || !paymentConfig.keySecret) {
    throw new Error('Invalid tenant payment config');
  }
  return new Razorpay({
    key_id: paymentConfig.keyId,
    key_secret: paymentConfig.keySecret,
  });
}

/**
 * Get Razorpay instance for a tenant
 * Returns tenant's own Razorpay if configured, else platform's
 * @param {Object} tenant - Tenant object from DB
 */
function getRazorpayForTenant(tenant) {
  if (tenant.usesOwnRazorpay && tenant.paymentConfig) {
    return createTenantRazorpay(tenant.paymentConfig);
  }
  return razorpay;
}

module.exports = { razorpay, createTenantRazorpay, getRazorpayForTenant };
