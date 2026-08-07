import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — DineBoard' };

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <nav style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'fit-content' }}>
          <span style={{ fontSize: '1.5rem' }}>🍽️</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>DineBoard</span>
        </Link>
      </nav>
      <div className="container section" style={{ maxWidth: '800px' }}>
        <h1 className="section-title">Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Last updated: July 2026</p>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>1. Information We Collect</h2>
          <p>We collect information you provide when registering a restaurant, including business name, owner details, contact information, and payment configuration. For customers placing orders, we collect name and phone number only — no registration required.</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>2. How We Use Your Information</h2>
          <p>Your information is used to provide restaurant management services, process payments via Razorpay, send WhatsApp notifications, and improve our AI chatbot. We do not sell your data to third parties.</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>3. Data Storage & Security</h2>
          <p>All data is stored on AWS infrastructure in India (ap-south-1 region). We use PostgreSQL Row-Level Security for multi-tenant data isolation, ensuring restaurants cannot access each other&apos;s data.</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>4. WhatsApp Data</h2>
          <p>WhatsApp conversation logs are stored for AI chatbot improvement and are accessible to restaurant owners via their admin panel. Conversation context is automatically cleared after 1 hour of inactivity.</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>5. Payment Information</h2>
          <p>Payment processing is handled by Razorpay. We do not store credit card or bank details. Restaurant owners who use their own Razorpay keys have their API keys encrypted at rest.</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>6. Contact Us</h2>
          <p>For privacy concerns, contact us at <strong>privacy@dineboard.in</strong></p>
        </div>
      </div>
    </div>
  );
}
