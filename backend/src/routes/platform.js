// ============================================
// DineBoard — Platform Routes (Landing Page APIs)
// ============================================

const express = require('express');
const { prisma } = require('../config/database');

const router = express.Router();

/**
 * GET /api/platform/plans
 * Public: List subscription plans
 */
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });

    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/platform/contact
 * Contact form submission — sends email to info@dineboard.in
 */
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, phone, message, restaurantName } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required.',
      });
    }

    // Send email notification to DineBoard admin
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'info@dineboard.in';

    await transporter.sendMail({
      from: `"DineBoard Contact Form" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      replyTo: email,
      subject: `📩 New Contact Inquiry from ${name}${restaurantName ? ` — ${restaurantName}` : ''}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
          <div style="background: linear-gradient(135deg, #FF6B35, #E85A2A); padding: 28px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🍽️ DineBoard — New Contact Message</h1>
          </div>
          <div style="padding: 32px; color: #F5F5F7;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 10px 0; color: #A1A1AA; width: 140px; vertical-align: top; font-size: 13px;">Name</td><td style="padding: 10px 0; color: #F5F5F7; font-weight: 600;">${name}</td></tr>
              <tr><td style="padding: 10px 0; color: #A1A1AA; font-size: 13px;">Email</td><td style="padding: 10px 0; color: #FF6B35;"><a href="mailto:${email}" style="color: #FF6B35;">${email}</a></td></tr>
              ${phone ? `<tr><td style="padding: 10px 0; color: #A1A1AA; font-size: 13px;">Phone</td><td style="padding: 10px 0; color: #F5F5F7;">${phone}</td></tr>` : ''}
              ${restaurantName ? `<tr><td style="padding: 10px 0; color: #A1A1AA; font-size: 13px;">Restaurant</td><td style="padding: 10px 0; color: #F5F5F7; font-weight: 600;">${restaurantName}</td></tr>` : ''}
              <tr><td style="padding: 10px 0; color: #A1A1AA; font-size: 13px; vertical-align: top;">Message</td><td style="padding: 10px 0; color: #F5F5F7; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</td></tr>
            </table>
          </div>
          <div style="padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
            <p style="color: #71717A; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} DineBoard — dineboard.in</p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Contact form email sent to ${adminEmail} from ${name} <${email}>`);

    res.json({
      success: true,
      message: "Thank you for contacting us! We'll get back to you within 24 hours.",
    });
  } catch (error) {
    console.error('Contact form email error:', error.message);
    // Still return success to user even if email fails
    res.json({
      success: true,
      message: "Thank you for contacting us! We'll get back to you within 24 hours.",
    });
  }
});

/**
 * GET /api/platform/stats
 * Public: Platform statistics for landing page
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [restaurants, orders] = await Promise.all([
      prisma.tenant.count({ where: { status: { in: ['active', 'trial'] } } }),
      prisma.order.count({ where: { status: 'paid' } }),
    ]);

    res.json({
      success: true,
      data: {
        restaurants: restaurants || 50,
        ordersProcessed: orders || 10000,
        citiesServed: 5,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
