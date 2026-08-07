// ============================================
// DineBoard — Utility Helpers
// ============================================

const crypto = require('crypto');

/**
 * Generate a unique order/booking code
 * Format: ORD-X7K2 or BKG-A3M9
 */
function generateCode(prefix = 'ORD') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,0,1 for readability
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

/**
 * Generate invoice number
 * Format: INV-20240115-001
 */
function generateInvoiceNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  const nano = Date.now().toString().slice(-3);
  return `INV-${dateStr}-${random}${nano}`;
}

/**
 * Slugify a restaurant name
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Calculate time slot end time
 * @param {string} startTime - "19:00"
 * @param {number} slotMinutes - Total slot duration in minutes
 * @returns {string} End time like "20:00"
 */
function calculateEndTime(startTime, slotMinutes = 120) {
  const duration = slotMinutes || 120;
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  if (totalMinutes >= 23 * 60 + 59) {
    return '23:59';
  }
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

/**
 * Check if a time is within restaurant operating hours
 */
function isWithinOperatingHours(time, openingTime, closingTime) {
  const timeMinutes = timeToMinutes(time);
  const openMinutes = timeToMinutes(openingTime);
  const closeMinutes = timeToMinutes(closingTime);

  // Handle overnight hours (e.g., 10:00 to 02:00)
  if (closeMinutes < openMinutes) {
    return timeMinutes >= openMinutes || timeMinutes <= closeMinutes;
  }
  return timeMinutes >= openMinutes && timeMinutes <= closeMinutes;
}

/**
 * Convert time string to minutes
 */
function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate GST components
 * @param {number} subtotal
 * @param {number} gstRate - Total GST rate (e.g., 5 for 5%)
 * @param {boolean} isInterstate - If true, apply IGST; else split into CGST + SGST
 */
function calculateGST(subtotal, gstRate = 5, isInterstate = false) {
  const gstAmount = (subtotal * gstRate) / 100;

  if (isInterstate) {
    return { cgst: 0, sgst: 0, igst: gstAmount, total: subtotal + gstAmount };
  }

  const halfGst = gstAmount / 2;
  return {
    cgst: Math.round(halfGst * 100) / 100,
    sgst: Math.round(halfGst * 100) / 100,
    igst: 0,
    total: Math.round((subtotal + gstAmount) * 100) / 100,
  };
}

/**
 * Format currency (INR)
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validate phone number (Indian format)
 */
function isValidPhone(phone) {
  const cleaned = phone.replace(/[\s-()]/g, '');
  return /^(\+91)?[6-9]\d{9}$/.test(cleaned);
}

/**
 * Normalize phone number to +91XXXXXXXXXX format
 */
function normalizePhone(phone) {
  const cleaned = phone.replace(/[\s-()]/g, '');
  if (cleaned.startsWith('+91')) return cleaned;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return cleaned;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Check if text contains a word fuzzy matching target (allows typos)
 */
function fuzzyContains(text, target, maxDistance = 2) {
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (word === target) return true;
    if (word.length >= 3 && Math.abs(word.length - target.length) <= maxDistance) {
      if (levenshteinDistance(word, target) <= maxDistance) return true;
    }
  }
  return false;
}

module.exports = {
  generateCode,
  generateInvoiceNumber,
  slugify,
  calculateEndTime,
  isWithinOperatingHours,
  timeToMinutes,
  calculateGST,
  formatCurrency,
  isValidPhone,
  normalizePhone,
  levenshteinDistance,
  fuzzyContains,
};
