import Link from 'next/link';

export const metadata = { title: 'Terms & Conditions — DineBoard' };

export default function TermsPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <nav style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'fit-content' }}>
          <span style={{ fontSize: '1.5rem' }}>🍽️</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>DineBoard</span>
        </Link>
      </nav>
      <div className="container section" style={{ maxWidth: '800px' }}>
        <h1 className="section-title">Terms &amp; Conditions</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Last updated: July 2026</p>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>1. Service Agreement</h2>
          <p>By using DineBoard, you agree to these terms. DineBoard provides a SaaS platform for restaurant management including ordering, booking, payments, and AI chatbot services.</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>2. Subscription & Billing</h2>
          <p>Subscriptions are billed monthly or annually via Razorpay. A 14-day free trial is provided. After the trial, the selected plan will be charged automatically. Commissions apply to all orders and bookings as per the selected plan.</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>3. Commission Structure</h2>
          <p>DineBoard charges a commission on every order and booking processed through the platform, regardless of whether the restaurant uses the platform&apos;s Razorpay or their own. Commission rates vary by plan (Starter: 5%, Pro: 3%, Enterprise: 1.5%).</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>4. Data Ownership</h2>
          <p>Restaurant data (menu, orders, bookings, customer info) belongs to the restaurant owner. Upon account termination, data can be exported within 30 days.</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>5. Service Availability</h2>
          <p>DineBoard targets 99.9% uptime. Scheduled maintenance will be communicated 48 hours in advance. We are not liable for downtime caused by third-party services (Razorpay, Wati, AWS).</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>6. Termination</h2>
          <p>Either party may terminate the service with 30 days notice. Upon termination, the restaurant&apos;s subdomain and data will be retained for 30 days for export.</p>
        </div>
      </div>
    </div>
  );
}
