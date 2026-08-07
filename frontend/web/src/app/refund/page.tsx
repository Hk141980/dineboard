import Link from 'next/link';

export const metadata = { title: 'Refund Policy — DineBoard' };

export default function RefundPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <nav style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'fit-content' }}>
          <span style={{ fontSize: '1.5rem' }}>🍽️</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>DineBoard</span>
        </Link>
      </nav>
      <div className="container section" style={{ maxWidth: '800px' }}>
        <h1 className="section-title">Refund Policy</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Last updated: July 2026</p>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>Subscription Refunds</h2>
          <p>If you are not satisfied with DineBoard, you may request a full refund within 7 days of your first paid subscription. After 7 days, refunds are prorated for the unused portion of the billing period.</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>Commission Refunds</h2>
          <p>Commissions on cancelled or refunded orders will be credited back to the restaurant&apos;s commission balance within 7 business days.</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', margin: '32px 0 12px' }}>How to Request a Refund</h2>
          <p>Email <strong>billing@dineboard.in</strong> with your restaurant name and reason for refund. Refunds are processed within 5-7 business days via the original payment method.</p>
        </div>
      </div>
    </div>
  );
}
