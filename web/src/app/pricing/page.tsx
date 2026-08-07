'use client';
import Link from 'next/link';

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter', price: '999', yearly: '9,999', commission: '5%', bookingComm: '3%',
      features: ['Menu Management', 'Order Management', 'Table Booking (10 tables)', 'WhatsApp Notifications', 'Basic Reports', '5 Staff Members', '50 Menu Items'],
      notIncluded: ['AI Chatbot', 'Promo Codes', 'Advanced Reports', 'Custom Branding', 'API Access'],
    },
    {
      name: 'Pro', price: '2,499', yearly: '24,999', commission: '3%', bookingComm: '2%', popular: true,
      features: ['Everything in Starter +', 'AI WhatsApp Chatbot', 'Staff Management (20)', 'Promo Codes & Discounts', 'Advanced Reports + PDF Export', '30 Tables', '200 Menu Items', 'WhatsApp Report Delivery'],
      notIncluded: ['Custom Branding', 'API Access', 'White Label'],
    },
    {
      name: 'Enterprise', price: '4,999', yearly: '49,999', commission: '1.5%', bookingComm: '1%',
      features: ['Everything in Pro +', 'Custom Branding (White Label)', 'API Access', 'Priority Support', '100 Tables', '500 Menu Items', '50 Staff Members', 'Dedicated Account Manager'],
      notIncluded: [],
    },
  ];

  const faqs = [
    { q: 'Is there a free trial?', a: 'Yes! Every plan comes with a 14-day free trial. No credit card required.' },
    { q: 'What are commissions?', a: 'DineBoard charges a small commission on every order and booking processed. This applies regardless of whether you use our Razorpay or your own.' },
    { q: 'Can I use my own Razorpay account?', a: 'Yes! You can add your own Razorpay keys. Commissions will be invoiced monthly instead of auto-deducted.' },
    { q: 'Can I change plans later?', a: 'Absolutely. Upgrade or downgrade anytime from your admin panel.' },
    { q: 'What happens after the trial?', a: 'Your selected plan will be charged via Razorpay subscription. If you don\'t add payment, your account enters a grace period.' },
  ];

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <nav style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🍽️</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>DineBoard</span>
        </Link>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/features" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Features</Link>
          <Link href="/register" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Start Free Trial</Link>
        </div>
      </nav>

      <div className="container section">
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="badge badge-primary">Pricing</span>
          <h1 className="section-title" style={{ marginTop: '16px' }}>
            Plans That Grow <span className="gradient-text">With You</span>
          </h1>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            Start free, scale as you grow. Transparent pricing with no hidden fees.
          </p>
        </div>

        <div className="grid-3" style={{ alignItems: 'stretch', maxWidth: '1100px', margin: '0 auto', marginBottom: '80px' }}>
          {plans.map((plan, i) => (
            <div key={i} className="card" style={{
              padding: '36px 28px', position: 'relative', overflow: 'hidden',
              border: plan.popular ? '2px solid var(--primary)' : undefined,
              boxShadow: plan.popular ? '0 0 40px rgba(255, 107, 53, 0.15)' : undefined,
            }}>
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: '16px', right: '-28px',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: 'white', padding: '4px 40px', fontSize: '0.72rem', fontWeight: 700,
                  transform: 'rotate(45deg)',
                }}>MOST POPULAR</div>
              )}
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, marginBottom: '4px' }}>{plan.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>₹{plan.price}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/mo</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>or ₹{plan.yearly}/year</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--primary)', padding: '6px 0', marginBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                {plan.commission} order · {plan.bookingComm} booking commission
              </div>
              <ul style={{ listStyle: 'none', marginBottom: '28px' }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', padding: '6px 0', display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--success)' }}>✓</span> {f}
                  </li>
                ))}
                {plan.notIncluded.map((f, j) => (
                  <li key={`no-${j}`} style={{ fontSize: '0.88rem', color: 'var(--text-muted)', padding: '6px 0', display: 'flex', gap: '8px', textDecoration: 'line-through' }}>
                    <span>✕</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}>Start Free Trial</Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, marginBottom: '32px', textAlign: 'center' }}>
            Frequently Asked Questions
          </h2>
          {faqs.map((faq, i) => (
            <div key={i} className="card" style={{ padding: '20px 24px', marginBottom: '12px' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>{faq.q}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
