// ============================================
// DineBoard — AI Service
// Gemini-powered chatbot engine
// ============================================

const { geminiModel } = require('../config/gemini');
const { redis } = require('../config/redis');
const { prisma } = require('../config/database');
const { fuzzyContains } = require('../utils/helpers');

class AiService {
  /**
   * Process an incoming WhatsApp message with AI
   */
  async processMessage(tenantId, customerPhone, messageText) {
    // Load restaurant context
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptionPlan: true },
    });

    // Load menu for context
    const menuItems = await prisma.menuItem.findMany({
      where: { tenantId, isAvailable: true },
      orderBy: { category: 'asc' },
    });

    // Get conversation history from Redis
    const conversationKey = `chat:${tenantId}:${customerPhone}`;
    const history = await this.getConversationHistory(conversationKey);

    // Check if customer has an active order
    const activeOrder = await prisma.order.findFirst({
      where: {
        tenantId,
        customerPhone,
        status: { in: ['pending', 'preparing', 'ready', 'served', 'billed'] },
      },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });

    // Build the system prompt
    const systemPrompt = this.buildSystemPrompt(tenant, menuItems, activeOrder);

    // Build conversation messages
    const messages = [
      ...history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
      { role: 'user', parts: [{ text: messageText }] },
    ];

    try {
      // Send to Gemini
      const chat = geminiModel.startChat({
        history: messages.slice(0, -1),
        systemInstruction: { parts: [{ text: systemPrompt }] },
      });

      const result = await chat.sendMessage(messageText);
      const responseText = result.response.text();

      // Parse structured response from AI
      const parsed = this.parseAiResponse(responseText);

      // Save pending booking in Redis if AI asked for confirmation/clarification
      if (parsed.intent === 'book_table' && parsed.entities?.date && parsed.entities?.time) {
        try {
          await redis.setex(
            `pending_booking:${tenantId}:${customerPhone}`,
            600,
            JSON.stringify({
              date: parsed.entities.date,
              time: parsed.entities.time,
              guests: parsed.entities.guests || 2,
            })
          );
        } catch (e) {}
      }

      // Save to conversation history
      await this.saveToHistory(conversationKey, 'user', messageText);
      await this.saveToHistory(conversationKey, 'model', parsed.responseText || responseText);

      // Log the conversation
      await prisma.aiConversationLog.create({
        data: {
          tenantId,
          customerPhone,
          messageIn: messageText,
          messageOut: parsed.responseText || responseText,
          detectedIntent: parsed.intent || 'general_chat',
          confidenceScore: parsed.confidence || 0,
          context: { activeOrder: activeOrder?.orderCode },
        },
      });

      return {
        intent: parsed.intent || 'general_chat',
        response: parsed.responseText || responseText,
        entities: parsed.entities || {},
        action: parsed.action || null,
        confidence: parsed.confidence || 0,
        buttons: parsed.buttons || null,
      };
    } catch (error) {
      console.warn('Gemini API notice (using intelligent fallback parser):', error.message || error);
      const fallback = this.fallbackIntentParser(messageText, menuItems, tenant, customerPhone);
      return {
        intent: fallback.intent,
        response: fallback.response,
        entities: fallback.entities,
        action: fallback.action,
        confidence: fallback.confidence,
        confidenceScore: fallback.confidence,
        buttons: fallback.buttons || null,
      };
    }
  }

  /**
   * Fallback rule-based NLP parser when AI quota/network is busy
   */
  fallbackIntentParser(messageText, menuItems, tenant, customerPhone = null) {
    const text = messageText.toLowerCase();

    // 0. Booking Cancellation Detection
    if (fuzzyContains(text, 'cancel') && (fuzzyContains(text, 'book') || fuzzyContains(text, 'table') || fuzzyContains(text, 'reserve') || fuzzyContains(text, 'booking') || text.includes('bkg'))) {
      const codeMatch = text.match(/\b(bkg-[a-z0-9]{4})\b/i);
      const bookingCode = codeMatch ? codeMatch[1].toUpperCase() : null;
      return {
        intent: 'cancel_booking',
        action: 'cancel_booking',
        confidence: 0.95,
        entities: { bookingCode },
        response: `Processing your table booking cancellation request...`,
      };
    }

    // 1. Table Booking Detection
    if (fuzzyContains(text, 'book') || fuzzyContains(text, 'table') || fuzzyContains(text, 'reserve') || text.includes('bok') || text.includes('tabl')) {
      let guests = 2;
      const guestMatch = text.match(/(\d+)\s*(?:guest|people|person|seat|pax|logo|log|bande|bandey|members)/i)
                      || text.match(/for\s*(\d+)/i)
                      || text.match(/(\d+)\s*k[ea]/i);
      let guestNumStr = null;
      if (guestMatch) {
        guests = parseInt(guestMatch[1], 10);
        guestNumStr = guestMatch[1];
      }

      let time = '19:00';
      let timeMatch = text.match(/(?:at|around|by|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
                   || text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i)
                   || text.match(/(\d{1,2})\s*(am|pm)/i);

      if (!timeMatch) {
        const allMatches = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi)];
        for (const m of allMatches) {
          if (guestNumStr && m[1] === guestNumStr) continue;
          timeMatch = m;
          break;
        }
      }

      const isTomorrow = text.includes('tomorrow') || text.includes('tommorow') || text.includes('tomorow') || text.includes('tomro') || text.includes('kal');

      // If user simply clicked "Book Table" button or asked for table booking without full details, send direct Web Booking Link
      if (!timeMatch && !text.includes('today') && !text.includes('aaj') && !isTomorrow && !guestMatch) {
        const baseUrl = process.env.APP_URL || process.env.API_URL || 'http://localhost:3000';
        const bookingUrl = `${baseUrl}/booking.html?r=${tenant?.slug || 'restro'}`;

        return {
          intent: 'book_table',
          action: 'none',
          confidence: 0.9,
          entities: {},
          response: `📅 *Online Table Reservation*\n\nTo reserve your table at *${tenant?.name || 'our restaurant'}*, please tap the link below to select your date, time slot, and guest count:\n\n👉 *Book Table Online*:\n${bookingUrl}\n\nInstant reservation guaranteed! 🍽️✨`,
        };
      }

      let isAmbiguous = false;
      let rawH = 10;
      let rawM = '00';

      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        rawH = h;
        rawM = m.toString().padStart(2, '0');

        if (ampm === 'pm' && h < 12) h += 12;
        else if (ampm === 'am' && h === 12) h = 0;
        else if (!ampm && h >= 1 && h <= 11) {
          const openTime = tenant?.openingTime || '09:00';
          const closeTime = tenant?.closingTime || '23:00';
          const timeToMins = (t) => { const [th, tm] = t.split(':').map(Number); return th * 60 + tm; };

          const openMins = timeToMins(openTime);
          const closeMins = timeToMins(closeTime);
          const amMins = h * 60 + m;
          const pmMins = (h + 12) * 60 + m;

          const amValid = amMins >= openMins && amMins <= closeMins;
          const pmValid = pmMins >= openMins && pmMins <= closeMins;

          if (amValid && pmValid) {
            isAmbiguous = true;
          } else if (pmValid) {
            h += 12;
          }
        }
        time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }

      let date = new Date().toISOString().split('T')[0];
      if (isTomorrow) {
        const tom = new Date();
        tom.setDate(tom.getDate() + 1);
        date = tom.toISOString().split('T')[0];
      }

      let customerName = null;
      const nameMatch = text.match(/under\s+([a-zA-Z]+)/i) || text.match(/name\s+([a-zA-Z]+)/i);
      if (nameMatch) customerName = nameMatch[1];

      const hasExplicitDate = text.includes('today') || text.includes('aaj') || isTomorrow;
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const timeMins = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);

      if (!hasExplicitDate && date === now.toISOString().split('T')[0] && timeMins < nowMins - 15) {
        const tom = new Date(now);
        tom.setDate(now.getDate() + 1);
        const tomDateStr = tom.toISOString().split('T')[0];

        const ampmLabel = parseInt(time.split(':')[0]) >= 12 ? 'PM' : 'AM';

        // Save pending booking context into Redis
        if (tenant?.id && customerPhone) {
          try {
            redis.setex(
              `pending_booking:${tenant.id}:${customerPhone}`,
              600,
              JSON.stringify({ date: tomDateStr, time, guests })
            );
          } catch (e) {}
        }

        return {
          intent: 'book_table',
          action: 'none',
          confidence: 0.9,
          entities: { date: tomDateStr, time, guests, customerName },
          response: `*${rawH}:${rawM} ${ampmLabel}* for today has already passed. Would you like to book for *Tomorrow (${tomDateStr}) at ${rawH}:${rawM} ${ampmLabel}* for ${guests} guests?`,
          buttons: [
            { id: 'btn_confirm_tom', title: 'Yes, Book Tomorrow' },
            { id: 'btn_decline_tom', title: 'No, Cancel' },
          ],
        };
      }

      if (isAmbiguous) {
        return {
          intent: 'book_table',
          action: 'none',
          confidence: 0.9,
          entities: { date, guests, customerName },
          response: `Would you like to book your table for *${rawH}:${rawM} AM* (Morning) or *${rawH}:${rawM} PM* (Evening) for ${guests} guests on ${date}?`,
          buttons: [
            { id: 'btn_am_slot', title: `${rawH}:${rawM} AM (Morning)` },
            { id: 'btn_pm_slot', title: `${rawH}:${rawM} PM (Evening)` },
          ],
        };
      }

      return {
        intent: 'book_table',
        action: 'confirm_booking',
        confidence: 0.9,
        entities: { date, time, guests, customerName },
        response: `Confirming table booking for ${guests} guests on ${date} at ${time}.`,
      };
    }

    // 2. Bill Request Detection
    if (text.includes('bill') || text.includes('pay') || text.includes('check') || text.includes('invoice')) {
      return {
        intent: 'request_bill',
        action: 'send_bill',
        confidence: 0.9,
        entities: {},
        response: `Fetching your bill details...`,
      };
    }

    // 3. My Order Item List Query Detection (e.g. "kya kya order kiya", "my order", "items list")
    if (
      text.includes('kya kya') ||
      text.includes('kya order') ||
      text.includes('order list') ||
      text.includes('items') ||
      text.includes('my order') ||
      text.includes('what did i order') ||
      text.includes('kya mangwaya') ||
      text.includes('samana')
    ) {
      return {
        intent: 'my_order',
        action: 'get_order_details',
        confidence: 0.95,
        entities: {},
        response: `Fetching your order items list...`,
      };
    }

    // 5. Restaurant Info Detection (e.g. "tell me restaurant info", "address", "hours", "contact")
    if (
      fuzzyContains(text, 'info') ||
      fuzzyContains(text, 'information') ||
      text.includes('detail') ||
      text.includes('about') ||
      text.includes('address') ||
      text.includes('hour') ||
      text.includes('timing') ||
      text.includes('location') ||
      text.includes('contact')
    ) {
      let infoText = `🏪 *${tenant?.name || 'Our Restaurant'}*`;
      if (tenant?.tagline) infoText += `\n_${tenant.tagline}_`;
      if (tenant?.description) infoText += `\n\n📝 ${tenant.description}`;

      infoText += `\n\n📍 *Address*: ${tenant?.address || 'Modinagar, Delhi NCR'}`;
      infoText += `\n⏰ *Operating Hours*: ${tenant?.openingTime || '09:00'} to ${tenant?.closingTime || '23:00'}`;
      if (tenant?.phone) infoText += `\n📞 *Contact Phone*: ${tenant.phone}`;

      return {
        intent: 'restaurant_info',
        action: 'none',
        confidence: 0.95,
        entities: {},
        response: infoText,
        buttons: [
          { id: 'btn_book_tbl', title: '📅 Book Table' },
          { id: 'btn_req_bill', title: '🧾 Request Bill' },
        ],
      };
    }

    // 6. Greetings / Casual Chat Detection
    if (
      text === 'hi' ||
      text === 'hello' ||
      text === 'hey' ||
      text === 'namaste' ||
      text.startsWith('hi ') ||
      text.startsWith('hello ') ||
      text.startsWith('hey ') ||
      text.includes('good morning') ||
      text.includes('good evening') ||
      text.includes('good afternoon')
    ) {
      return {
        intent: 'general_chat',
        action: 'none',
        confidence: 0.9,
        entities: {},
        response: `Namaste & Welcome to *${tenant?.name || 'our restaurant'}*! 🍽️✨\n\nHow can I help you today?`,
        buttons: [
          { id: 'btn_book_tbl', title: '📅 Book Table' },
          { id: 'btn_req_bill', title: '🧾 Request Bill' },
          { id: 'btn_rest_info', title: '📍 Info & Address' },
        ],
      };
    }

    // 7. Compliments & Thank You Detection
    if (
      text.includes('thank') ||
      text.includes('thanks') ||
      text.includes('dhanyawad') ||
      text.includes('shukriya') ||
      text.includes('awesome') ||
      text.includes('great') ||
      text.includes('nice') ||
      text.includes('perfect')
    ) {
      return {
        intent: 'general_chat',
        action: 'none',
        confidence: 0.9,
        entities: {},
        response: `You are most welcome! 🙏✨ It is our absolute pleasure to serve you. Please let us know if you need any further assistance! 🍽️`,
      };
    }

    return {
      intent: 'general_chat',
      action: 'none',
      confidence: 0.5,
      entities: {},
      response: `Welcome to *${tenant?.name || 'our restaurant'}*! 🍽️\n\nHow can I assist you today?`,
      buttons: [
        { id: 'btn_book_tbl', title: '📅 Book Table' },
        { id: 'btn_req_bill', title: '🧾 Request Bill' },
        { id: 'btn_rest_info', title: '📍 Info & Address' },
      ],
    };
  }

  /**
   * Build system prompt with restaurant context
   */
  buildSystemPrompt(tenant, menuItems, activeOrder) {
    let activeOrderText = '';
    if (activeOrder) {
      const items = activeOrder.orderItems
        .map((i) => `${i.quantity}× ${i.itemName} (₹${i.lineTotal})`)
        .join(', ');
      activeOrderText = `\n\nACTIVE ORDER: ${activeOrder.orderCode}\nItems: ${items}\nTotal: ₹${activeOrder.total}\nStatus: ${activeOrder.status}`;
    }

    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    const tomorrowDateStr = tom.toISOString().split('T')[0];

    return `You are "DineBoard Assistant", a warm, hospitable human restaurant host for "${tenant.name}".
${tenant.tagline ? `Tagline: ${tenant.tagline}` : ''}
${tenant.description ? `About: ${tenant.description}` : ''}
Address: ${tenant.address || 'Not provided'}
Phone: ${tenant.phone || 'Not provided'}
Hours: ${tenant.openingTime || '09:00'} - ${tenant.closingTime || '23:00'}
CURRENT SYSTEM TODAY DATE: ${currentDateStr}
SYSTEM TOMORROW DATE: ${tomorrowDateStr}
${activeOrderText}

CONVERSATIONAL PERSONA & INSTRUCTIONS:
1. Speak like a warm, polite human host. Support English, Hindi, and Hinglish naturally based on the customer's language.
2. If the user asks for restaurant info, location, directions, opening hours, or contact details, respond warmly with the full restaurant details (Address: ${tenant.address || 'Delhi NCR'}, Hours: ${tenant.openingTime || '09:00'} to ${tenant.closingTime || '23:00'}, Phone: ${tenant.phone || ''}).
3. For Table Reservations ("book_table"):
   - If the customer simply clicks "📅 Book Table" or asks to book a table without specific date/time/guests, provide the direct online web booking link: "📅 Online Table Reservation\n\nTo reserve your table, please tap the link below:\n\n👉 Book Table Online:\n${process.env.APP_URL || 'http://localhost:3000'}/booking.html?r=${tenant.slug}".
   - Support all phrasing: party size ("5 people", "5 pax", "5logo", "2 seats", "table for 4"), date ("today", "aaj", "tomorrow", "tommorow", "kal", "this Friday"), and time ("at 4", "4:00 pm", "4 bje", "evening at 8").
   - If the requested time for today HAS ALREADY PASSED (e.g. asking for 4 PM at 11 PM) without mentioning a date, DO NOT set action to "confirm_booking". Set action to "none" and ask warmly: "*4:00 PM* for today has already passed. Would you like me to book a table for *Tomorrow (${tomorrowDateStr}) at 4:00 PM* for X guests?".
   - If the user provides an ambiguous hour like "10" or "9" without specifying AM or PM, and BOTH AM and PM fall within restaurant operating hours (${tenant.openingTime || '09:00'} - ${tenant.closingTime || '23:00'}), set action to "none" and ask: "Would you like me to book for *10:00 AM* in the morning or *10:00 PM* in the evening?".
   - If all details (date, valid future time, guest count) are present, set action to "confirm_booking".
4. For Table Cancellations ("cancel_booking"):
   - If the customer wants to cancel a booking ("cancel my reservation", "cancel booking", "bkg cancel kar do"), set intent="cancel_booking", action="cancel_booking".
5. For Bill Requests ("request_bill"):
   - If user asks for bill ("bill please", "check", "hisab", "payment link"), set intent="request_bill", action="send_bill".
6. For Order Items / Status ("my_order" / "order_status"):
   - If user asks what items they ordered ("what did I order", "kya kya mangwaya"), set intent="my_order".
   - If user asks when food will arrive ("kitna time lagega", "where is my food"), set intent="order_status".
7. For Greetings & Thanks ("general_chat"):
   - Reply warmly to "hi", "hello", "namaste", "thank you", "dhanyawad", "great food".
8. Format response ONLY as a JSON object:
{
  "intent": "book_table|cancel_booking|request_bill|my_order|order_status|restaurant_info|general_chat",
  "confidence": 0.0 to 1.0,
  "entities": {
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "guests": 4,
    "customerName": "name"
  },
  "response_text": "Your warm, natural response to the customer",
  "action": "confirm_booking|cancel_booking|send_bill|none"
}`;
  }

  /**
   * Parse AI response (extract JSON from response)
   */
  parseAiResponse(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || 'general_chat',
          confidence: parsed.confidence || 0.5,
          entities: parsed.entities || {},
          responseText: parsed.response_text || responseText,
          action: parsed.action || 'none',
        };
      }
    } catch (e) {
      // If JSON parsing fails, return raw text
    }

    return {
      intent: 'general_chat',
      confidence: 0.3,
      entities: {},
      responseText: responseText,
      action: 'none',
    };
  }

  /**
   * Get conversation history from Redis
   */
  async getConversationHistory(key) {
    const history = await redis.lrange(key, 0, 19); // Last 10 pairs (20 messages)
    return history.map((msg) => JSON.parse(msg));
  }

  /**
   * Save message to conversation history
   */
  async saveToHistory(key, role, text) {
    await redis.rpush(key, JSON.stringify({ role, text }));
    await redis.ltrim(key, -20, -1); // Keep last 20 messages
    await redis.expire(key, 3600); // 1 hour expiry
  }

  /**
   * Get food recommendations
   */
  async getRecommendations(tenantId, preferences = {}) {
    const menuItems = await prisma.menuItem.findMany({
      where: {
        tenantId,
        isAvailable: true,
        ...(preferences.isVeg !== undefined && { isVeg: preferences.isVeg }),
        ...(preferences.category && { category: preferences.category }),
      },
      orderBy: { sortOrder: 'asc' },
      take: 5,
    });

    return menuItems;
  }
}

module.exports = new AiService();
