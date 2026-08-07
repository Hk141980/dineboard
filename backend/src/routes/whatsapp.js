// ============================================
// DineBoard — WhatsApp Routes
// Meta WhatsApp Cloud API & AI Chatbot
// ============================================

const express = require('express');
const whatsappService = require('../services/whatsapp.service');
const aiService = require('../services/ai.service');
const orderService = require('../services/order.service');
const bookingService = require('../services/booking.service');
const paymentService = require('../services/payment.service');
const { prisma } = require('../config/database');
const { normalizePhone } = require('../utils/helpers');

const router = express.Router();

/**
 * Meta Cloud API Verification Challenge Handler
 */
const verifyHandler = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.META_WA_VERIFY_TOKEN || 'dineboard-whatsapp-verify-token';

  if (mode && token === verifyToken) {
    console.log('Meta WhatsApp Webhook verified successfully!');
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ error: 'Verification token mismatch' });
};

router.get('/webhook', verifyHandler);
router.get('/whatsapp', verifyHandler);
router.get('/', verifyHandler);

const processedMsgIds = new Set();

/**
 * Incoming WhatsApp messages handler
 */
const postHandler = async (req, res, next) => {
  try {
    console.log('📬 [Incoming WhatsApp Webhook]:', JSON.stringify(req.body));
    let customerPhone = null;
    let text = null;
    let phoneNumberId = null;

    // Parse Meta Cloud API payload format
    if (req.body.entry && req.body.entry[0]?.changes[0]?.value) {
      const value = req.body.entry[0].changes[0].value;
      phoneNumberId = value.metadata?.phone_number_id;

      if (value.messages && value.messages[0]) {
        const msg = value.messages[0];
        if (msg.id) {
          if (processedMsgIds.has(msg.id)) {
            console.log(`[WhatsApp Webhook] Duplicate message ${msg.id} ignored.`);
            return res.status(200).json({ success: true, message: 'Duplicate message ignored.' });
          }
          processedMsgIds.add(msg.id);
          if (processedMsgIds.size > 2000) {
            const first = processedMsgIds.values().next().value;
            processedMsgIds.delete(first);
          }
        }
        customerPhone = normalizePhone(msg.from);
        text = msg.text?.body || msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
      }
    } else {
      // Direct flat payload format (testing / custom proxies)
      const { waId, text: bodyText, phoneNumberId: pId } = req.body;
      if (waId) customerPhone = normalizePhone(waId);
      text = bodyText;
      phoneNumberId = pId;
    }

    if (!customerPhone || !text) {
      return res.status(200).json({ success: true, message: 'Ignored — no message body.' });
    }

    // Identify restaurant from the receiving phone number / phone ID
    const tenant = await whatsappService.identifyRestaurant(phoneNumberId);

    if (!tenant) {
      console.warn(`No restaurant found for Meta Phone ID: ${phoneNumberId}`);
      return res.status(200).json({ success: true, message: 'Restaurant not found.' });
    }

    // Check if AI chatbot is enabled for this plan
    if (!tenant.subscriptionPlan?.features?.aiChatbot) {
      // Basic auto-reply without AI
      await whatsappService.sendMessage(
        customerPhone,
        `Welcome to ${tenant.name}! 🍽️\n\nFor table reservations or bill requests, please message us here or call us at: ${tenant.phone || ''}`,
        tenant.metaPhoneNumberId,
        tenant.metaAccessToken
      );
      return res.status(200).json({ success: true });
    }

    // Check if customer is confirming or declining a pending booking
    const cleanText = text.trim().toLowerCase();
    const isConfirmation = /^(yes|yeah|yep|ok|sure|haan|ha|haji|confirm|kar do|kar2|yes please|10 pm|10:00 pm|10 am|10:00 am|book kar do)$/i.test(cleanText);
    const isRejection = /^(no|nah|nope|nhi|nahi|na|cancel|mat kar|mat karo)$/i.test(cleanText);

    if (isConfirmation || isRejection) {
      try {
        const pendingDataStr = await redis.get(`pending_booking:${tenant.id}:${customerPhone}`);
        if (pendingDataStr) {
          await redis.del(`pending_booking:${tenant.id}:${customerPhone}`);
          if (isConfirmation) {
            const pending = JSON.parse(pendingDataStr);
            const result = await bookingService.createBooking(tenant.id, {
              date: pending.date,
              time: pending.time,
              guests: pending.guests || 2,
              customerName: customerPhone,
              customerPhone,
              source: 'whatsapp',
            });

            if (result.success) {
              await whatsappService.sendBookingConfirmation(result.booking, tenant);
              return res.status(200).json({ success: true });
            } else if (result.message) {
              await whatsappService.sendMessage(customerPhone, `⚠️ ${result.message}`, tenant.metaPhoneNumberId, tenant.metaAccessToken);
              return res.status(200).json({ success: true });
            }
          } else {
            // Rejection ("no")
            await whatsappService.sendMessage(
              customerPhone,
              `Understood! No table reservation was made. Please let us know if you'd like to choose another date or time! 🍽️`,
              tenant.metaPhoneNumberId,
              tenant.metaAccessToken
            );
            return res.status(200).json({ success: true });
          }
        }
      } catch (e) {
        console.error('Error handling pending booking confirmation/rejection:', e.message);
      }
    }

    // Process message with AI
    const aiResult = await aiService.processMessage(tenant.id, customerPhone, text);

    // Handle AI-detected intents
    switch (aiResult.intent) {
      case 'book_table':
        await handleBookingIntent(tenant, customerPhone, aiResult);
        break;

      case 'cancel_booking':
        await handleCancelBooking(tenant, customerPhone, aiResult);
        break;

      case 'request_bill':
        await handleBillRequest(tenant, customerPhone);
        break;

      case 'my_order':
        await handleMyOrderDetails(tenant, customerPhone);
        break;

      case 'restaurant_info':
      default:
        if (aiResult.buttons && aiResult.buttons.length > 0) {
          await whatsappService.sendButtonMessage(customerPhone, aiResult.response, aiResult.buttons, tenant.metaPhoneNumberId, tenant.metaAccessToken);
        } else {
          await whatsappService.sendMessage(customerPhone, aiResult.response, tenant.metaPhoneNumberId, tenant.metaAccessToken);
        }
        break;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(200).json({ success: true });
  }
};

router.post('/webhook', postHandler);
router.post('/whatsapp', postHandler);
router.post('/', postHandler);

/**
 * Handle order intent from AI
 */
async function handleOrderIntent(tenant, customerPhone, aiResult) {
  if (aiResult.action === 'confirm_order' && aiResult.entities?.items?.length > 0) {
    const menuItems = await prisma.menuItem.findMany({
      where: { tenantId: tenant.id, isAvailable: true },
    });

    const orderItems = [];
    for (const item of aiResult.entities.items) {
      const menuItem = menuItems.find(
        (m) => m.name.toLowerCase().includes(item.name.toLowerCase())
      );
      if (menuItem) {
        orderItems.push({ menuItemId: menuItem.id, quantity: item.qty || 1 });
      }
    }

    if (orderItems.length > 0) {
      const result = await orderService.createOrder(tenant.id, {
        customerName: customerPhone,
        customerPhone,
        items: orderItems,
        source: 'whatsapp',
      });

      if (result.success) {
        await whatsappService.sendOrderConfirmation(result.order, tenant);
        return;
      }
    }
  }

  if (aiResult.buttons && aiResult.buttons.length > 0) {
    await whatsappService.sendButtonMessage(customerPhone, aiResult.response, aiResult.buttons, tenant.metaPhoneNumberId, tenant.metaAccessToken);
  } else {
    await whatsappService.sendMessage(customerPhone, aiResult.response, tenant.metaPhoneNumberId, tenant.metaAccessToken);
  }
}

/**
 * Handle booking intent from AI
 */
async function handleBookingIntent(tenant, customerPhone, aiResult) {
  if (aiResult.action === 'confirm_booking' && aiResult.entities?.date && aiResult.entities?.time) {
    let bookingTime = aiResult.entities.time;

    // Safety adjustment: If time is outside operating hours (e.g. 05:00), check if adding 12 hours (17:00 or 22:00) fits
    const openTime = tenant.openingTime || '09:00';
    const closeTime = tenant.closingTime || '23:00';
    const timeToMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const reqMins = timeToMins(bookingTime);
    const openMins = timeToMins(openTime);
    const closeMins = timeToMins(closeTime);

    if (reqMins < openMins && (reqMins + 12 * 60) >= openMins && (reqMins + 12 * 60) <= closeMins) {
      const pmHour = Math.floor((reqMins + 12 * 60) / 60);
      const mins = (reqMins % 60).toString().padStart(2, '0');
      bookingTime = `${pmHour.toString().padStart(2, '0')}:${mins}`;
    }

    const result = await bookingService.createBooking(tenant.id, {
      date: aiResult.entities.date,
      time: bookingTime,
      guests: aiResult.entities.guests || 2,
      customerName: aiResult.entities.customerName || customerPhone,
      customerPhone,
      source: 'whatsapp',
    });

    if (result.success) {
      await whatsappService.sendBookingConfirmation(result.booking, tenant);
      return;
    } else {
      let msg = result.message ? `⚠️ ${result.message}\n\n` : `Sorry, no tables available at that time.\n\n`;
      if (result.alternatives?.length > 0) {
        msg += `Available times:\n`;
        result.alternatives.forEach((alt) => {
          msg += `🕐 ${alt.time}\n`;
        });
        msg += `\nWould you like to book any of these?`;
      } else if (!result.message) {
        msg += `Contact us at ${tenant.phone} for assistance.`;
      }
      await whatsappService.sendMessage(customerPhone, msg, tenant.metaPhoneNumberId, tenant.metaAccessToken);
      return;
    }
  }

  await whatsappService.sendMessage(customerPhone, aiResult.response, tenant.metaPhoneNumberId, tenant.metaAccessToken);
}

/**
 * Handle booking cancellation request from customer
 */
async function handleCancelBooking(tenant, customerPhone, aiResult) {
  const bookingCode = aiResult.entities?.bookingCode || null;
  const result = await bookingService.cancelBookingByCustomer(tenant.id, customerPhone, bookingCode);

  let responseMsg = result.message;
  if (result.success) {
    responseMsg = `❌ *Table Booking Cancelled*\n\n${result.message}\n\nWe hope to serve you another time soon! 🍽️`;
  }

  await whatsappService.sendMessage(customerPhone, responseMsg, tenant.metaPhoneNumberId, tenant.metaAccessToken);
}

/**
 * Handle bill request from customer
 */
async function handleBillRequest(tenant, customerPhone) {
  // Consolidate/merge all unpaid orders for this customer phone/table
  const order = await orderService.consolidateUnpaidOrders(tenant.id, { customerPhone });

  if (order) {
    let paymentLink = order.paymentLinkUrl;
    if (!paymentLink) {
      const result = await paymentService.createPaymentLink(order.id, tenant.id);
      if (result.success) paymentLink = result.paymentLink;
    }

    if (paymentLink) {
      await whatsappService.sendPaymentLink(order, paymentLink, tenant);
    } else {
      await whatsappService.sendOrderStatusUpdate(order, 'billed', tenant);
    }
  } else {
    await whatsappService.sendMessage(
      customerPhone,
      `No active order found for your phone number. If you are currently seated at a table, please ask your waiter or request your bill directly.`,
      tenant.metaPhoneNumberId,
      tenant.metaAccessToken
    );
  }
}

/**
 * Handle my order items list query from customer ("Order kya kya kiya tha meine")
 */
async function handleMyOrderDetails(tenant, customerPhone) {
  const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
  const last10 = cleanPhone.slice(-10);

  const order = await prisma.order.findFirst({
    where: {
      tenantId: tenant.id,
      status: { in: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'billed'] },
      OR: [
        { customerPhone },
        { customerPhone: cleanPhone },
        { customerPhone: `+${cleanPhone}` },
        ...(last10 ? [{ customerPhone: { contains: last10 } }] : []),
      ],
    },
    include: { orderItems: true, assignedTable: true },
    orderBy: { createdAt: 'desc' },
  });

  if (order && order.orderItems?.length > 0) {
    const itemsList = order.orderItems
      .map((item) => `  • ${item.quantity}× ${item.itemName} (₹${item.lineTotal})`)
      .join('\n');

    const statusTitle = {
      pending: 'Pending ⏳',
      confirmed: 'Confirmed ✅',
      preparing: 'Preparing in Kitchen 👨‍🍳',
      ready: 'Ready to Serve 🔔',
      served: 'Served 🍽️',
      billed: 'Bill Generated 🧾',
    }[order.status] || order.status;

    const message = `🛒 *Your Active Order Summary (#${order.orderCode})*\n\n` +
      `📋 *Items Ordered:*\n${itemsList}\n\n` +
      `💵 *Grand Total: ₹${order.total}*` +
      (order.assignedTable ? `\n🪑 Table: ${order.assignedTable.name}` : '') +
      `\n📊 Status: *${statusTitle}*\n\n` +
      `Need your bill? Just reply *Bill*! 😊`;

    await whatsappService.sendMessage(customerPhone, message, tenant.metaPhoneNumberId, tenant.metaAccessToken);
  } else {
    await whatsappService.sendMessage(
      customerPhone,
      `You don't have any active order right now. You can scan the QR code on your table to view our menu and order! 🍽️`,
      tenant.metaPhoneNumberId,
      tenant.metaAccessToken
    );
  }
}

/**
 * Handle add-to-order intent
 */
async function handleAddToOrder(tenant, customerPhone, aiResult) {
  const order = await prisma.order.findFirst({
    where: {
      tenantId: tenant.id,
      customerPhone,
      status: { notIn: ['paid', 'cancelled', 'billed'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (order && aiResult.entities?.items?.length > 0) {
    const menuItems = await prisma.menuItem.findMany({
      where: { tenantId: tenant.id, isAvailable: true },
    });

    const newItems = [];
    for (const item of aiResult.entities.items) {
      const menuItem = menuItems.find(
        (m) => m.name.toLowerCase().includes(item.name.toLowerCase())
      );
      if (menuItem) {
        newItems.push({ menuItemId: menuItem.id, quantity: item.qty || 1 });
      }
    }

    if (newItems.length > 0) {
      const result = await orderService.addItemsToOrder(order.id, tenant.id, newItems);
      if (result.success) {
        const addedList = result.addedItems.map((i) => `${i.quantity}× ${i.itemName}: ₹${i.lineTotal}`).join('\n');
        await whatsappService.sendMessage(
          customerPhone,
          `✅ Added to order ${order.orderCode}!\n\n${addedList}\n\n💵 New total: ₹${result.order.total}`,
          tenant.metaPhoneNumberId,
          tenant.metaAccessToken
        );
        return;
      }
    }
  }

  await whatsappService.sendMessage(customerPhone, aiResult.response, tenant.metaPhoneNumberId, tenant.metaAccessToken);
}

module.exports = router;
