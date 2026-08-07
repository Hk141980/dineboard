// ============================================
// DineBoard — WhatsApp Service
// Meta WhatsApp Cloud API Integration
// ============================================

const axios = require('axios');
const { prisma } = require('../config/database');

const META_WA_API_URL = process.env.META_WA_API_URL || 'https://graph.facebook.com/v18.0';
const META_WA_SYSTEM_TOKEN = process.env.META_WA_SYSTEM_TOKEN;

class WhatsAppService {
  /**
   * Send a text message via Meta WhatsApp Cloud API
   */
  async sendMessage(phoneNumber, message, metaPhoneNumberId = null, metaAccessToken = null) {
    try {
      const phoneId = metaPhoneNumberId || process.env.META_DEFAULT_PHONE_ID;
      const token = metaAccessToken || META_WA_SYSTEM_TOKEN;

      if (!phoneId || !token) {
        console.log(`[Mock WhatsApp Outbound] To: ${phoneNumber} | Msg: ${message.slice(0, 60)}...`);
        return { success: true, mock: true };
      }

      const formattedPhone = phoneNumber.replace(/\D/g, '');

      const response = await axios.post(
        `${META_WA_API_URL}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { preview_url: false, body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Meta WhatsApp Cloud API send error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Interactive Quick Reply Buttons via Meta WhatsApp API
   * @param {string} phoneNumber
   * @param {string} bodyText
   * @param {Array<{id: string, title: string}>} buttons (Max 3 buttons per message)
   */
  async sendButtonMessage(phoneNumber, bodyText, buttons, metaPhoneNumberId = null, metaAccessToken = null) {
    try {
      const phoneId = metaPhoneNumberId || process.env.META_DEFAULT_PHONE_ID;
      const token = metaAccessToken || META_WA_SYSTEM_TOKEN;

      if (!buttons || buttons.length === 0) {
        return this.sendMessage(phoneNumber, bodyText, metaPhoneNumberId, metaAccessToken);
      }

      if (!phoneId || !token) {
        console.log(`[Mock WhatsApp Outbound Buttons] To: ${phoneNumber} | Body: ${bodyText.slice(0, 50)}... | Buttons: ${buttons.map(b => b.title).join(', ')}`);
        return { success: true, mock: true, buttons };
      }

      const formattedPhone = phoneNumber.replace(/\D/g, '');

      const response = await axios.post(
        `${META_WA_API_URL}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
              buttons: buttons.slice(0, 3).map((b, idx) => ({
                type: 'reply',
                reply: {
                  id: b.id || `btn_${idx}`,
                  title: b.title.slice(0, 20),
                },
              })),
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Meta WhatsApp Cloud API button error:', error.response?.data || error.message);
      return this.sendMessage(phoneNumber, bodyText, metaPhoneNumberId, metaAccessToken);
    }
  }

  /**
   * Send booking confirmation via WhatsApp
   */
  async sendBookingConfirmation(booking, tenant) {
    const message = `✅ *Booking Confirmed!*\n\n` +
      `🍽️ *${tenant.name}*\n` +
      `📋 Booking Code: *${booking.bookingCode}*\n` +
      `📅 Date: ${new Date(booking.bookingDate).toLocaleDateString('en-IN')}\n` +
      `🕐 Time: ${booking.bookingTime} - ${booking.endTime}\n` +
      `👥 Guests: ${booking.guests}\n` +
      `🪑 Table: ${booking.bookingTables?.map((bt) => bt.table.name).join(', ') || 'TBD'}\n\n` +
      `📍 ${tenant.address || ''}\n` +
      `📞 ${tenant.phone || ''}\n\n` +
      `Thank you for choosing ${tenant.name}! 😊`;

    return this.sendMessage(booking.customerPhone, message, tenant.metaPhoneNumberId, tenant.metaAccessToken);
  }

  /**
   * Send order confirmation via WhatsApp
   */
  async sendOrderConfirmation(order, tenant) {
    const itemsList = order.orderItems
      .map((item) => `  ${item.quantity}× ${item.itemName}: ₹${item.lineTotal}`)
      .join('\n');

    const message = `✅ *Order Placed!*\n\n` +
      `🍽️ *${tenant.name}*\n` +
      `📋 Order Code: *${order.orderCode}*\n\n` +
      `🛒 *Items:*\n${itemsList}\n\n` +
      `💰 Subtotal: ₹${order.subtotal}\n` +
      (Number(order.discountAmount) > 0 ? `🎫 Discount: -₹${order.discountAmount}\n` : '') +
      (Number(order.gstAmount) > 0 ? `📋 GST: ₹${order.gstAmount}\n` : '') +
      `💵 *Total: ₹${order.total}*\n` +
      (order.assignedTable ? `\n🪑 Table: ${order.assignedTable.name}` : '') +
      `\n\nWant to add more items? Just send a message! 😊`;

    return this.sendMessage(order.customerPhone, message, tenant.metaPhoneNumberId, tenant.metaAccessToken);
  }

  /**
   * Send payment link / bill via WhatsApp
   */
  async sendPaymentLink(order, paymentUrl, tenant) {
    const message = `🧾 *Bill Generated - ${tenant.name}*\n\n` +
      `📋 Order Code: *${order.orderCode}*\n` +
      `💵 Total: *₹${order.total}*\n\n` +
      `💳 Click to view bill & pay online:\n${paymentUrl}\n\n` +
      `Thank you for dining with us! 🎉`;

    return this.sendMessage(order.customerPhone, message, tenant.metaPhoneNumberId, tenant.metaAccessToken);
  }

  /**
   * Send real-time order status updates via WhatsApp (preparing, ready, served, billed, paid)
   */
  async sendOrderStatusUpdate(order, newStatus, tenant) {
    const statusMap = {
      confirmed: '✅ *Order Confirmed!*',
      preparing: '👨‍🍳 *Order is Preparing!*\nThe kitchen team has started preparing your food.',
      ready: '🔔 *Order is Ready!*\nYour delicious food is hot and ready!',
      served: '🍽️ *Order Served!*\nEnjoy your meal!',
      billed: '🧾 *Bill Generated!*\nYour bill is ready.',
      paid: '🎉 *Payment Received!*\nThank you for dining with us! See you again soon! 😊',
    };

    const header = statusMap[newStatus] || `📋 *Order Status: ${newStatus}*`;

    let message = `${header}\n\n` +
      `🍽️ *${tenant.name}*\n` +
      `📋 Order Code: *${order.orderCode}*\n` +
      `💵 Total Amount: *₹${order.total}*`;

    if (order.assignedTable) {
      message += `\n🪑 Table: ${order.assignedTable.name}`;
    }

    return this.sendMessage(order.customerPhone, message, tenant.metaPhoneNumberId, tenant.metaAccessToken);
  }

  /**
   * Send booking reminder
   */
  async sendBookingReminder(booking, tenant, minutesBefore) {
    const message = `⏰ *Booking Reminder*\n\n` +
      `Hi ${booking.customerName}! 👋\n\n` +
      `Your table at *${tenant.name}* is in *${minutesBefore} minutes*!\n\n` +
      `📅 ${new Date(booking.bookingDate).toLocaleDateString('en-IN')}\n` +
      `🕐 ${booking.bookingTime}\n` +
      `👥 ${booking.guests} guests\n` +
      `📋 Code: ${booking.bookingCode}\n\n` +
      `📍 ${tenant.address || ''}\n` +
      `See you soon! 😊`;

    return this.sendMessage(booking.customerPhone, message, tenant.metaPhoneNumberId, tenant.metaAccessToken);
  }

  /**
   * Send report PDF via WhatsApp
   */
  async sendReportPdf(phoneNumber, reportUrl, reportType, tenant) {
    const message = `📊 *${reportType} Report*\n\n` +
      `🍽️ ${tenant.name}\n` +
      `📄 Download: ${reportUrl}\n\n` +
      `Generated at: ${new Date().toLocaleString('en-IN')}`;

    return this.sendMessage(phoneNumber, message, tenant.metaPhoneNumberId, tenant.metaAccessToken);
  }

  /**
   * Identify restaurant from incoming WhatsApp number ID or phone number
   */
  async identifyRestaurant(toPhoneNumber) {
    if (!toPhoneNumber) {
      return prisma.tenant.findFirst({ where: { status: { in: ['active', 'trial'] } }, include: { subscriptionPlan: true } });
    }

    const cleanPhone = String(toPhoneNumber).replace(/\D/g, '');
    const last10 = cleanPhone.slice(-10);

    const found = await prisma.tenant.findFirst({
      where: {
        OR: [
          { metaPhoneNumberId: String(toPhoneNumber) },
          { metaPhoneNumberId: cleanPhone },
          { whatsappNumber: String(toPhoneNumber) },
          { whatsappNumber: cleanPhone },
          { whatsappNumber: { contains: last10 } },
          { phone: { contains: last10 } },
        ],
        status: { in: ['active', 'trial'] },
      },
      include: {
        subscriptionPlan: true,
      },
    });

    if (found) return found;

    // Fallback: Default to first active tenant so testing always works
    return prisma.tenant.findFirst({
      where: { status: { in: ['active', 'trial'] } },
      include: { subscriptionPlan: true },
    });
  }
}

module.exports = new WhatsAppService();
