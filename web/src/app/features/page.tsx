'use client';
import Link from 'next/link';

export default function FeaturesPage() {
  const categories = [
    {
      title: '🤖 AI WhatsApp Chatbot',
      features: [
        { name: 'Natural Language Ordering', desc: 'Customers say "2 butter chicken bhej do" and the AI understands it instantly.' },
        { name: 'Multilingual Support', desc: 'Hindi, English, Hinglish — the chatbot handles all languages naturally.' },
        { name: 'Smart Recommendations', desc: 'AI suggests popular items based on menu and customer preferences.' },
        { name: 'Context Memory', desc: 'Remembers conversation context — "usse hata do" works perfectly.' },
      ],
    },
    {
      title: '📅 Smart Table Booking',
      features: [
        { name: 'Configurable Time Slots', desc: 'Default 45 min dining + 15 min cleaning. Fully customizable by owner.' },
        { name: 'Auto Table Assignment', desc: 'System finds the best table combination for your guest count.' },
        { name: 'Alternative Suggestions', desc: 'If a slot is full, suggest available times with contact details.' },
        { name: 'WhatsApp Reminders', desc: 'Automatic reminders sent 1 hour and 30 minutes before booking.' },
      ],
    },
    {
      title: '💳 Payments & Billing',
      features: [
        { name: 'Razorpay Integration', desc: 'Built-in payments or bring your own Razorpay keys.' },
        { name: 'Auto Payment Links', desc: 'Customer requests bill → payment link sent via WhatsApp instantly.' },
        { name: 'Commission Auto-Split', desc: 'Platform commission auto-deducted via Razorpay Route.' },
        { name: 'GST Invoicing', desc: 'Auto-generated invoices with CGST/SGST breakdown.' },
      ],
    },
    {
      title: '📊 Analytics & Reports',
      features: [
        { name: 'Real-Time Dashboard', desc: 'Today\'s orders, revenue, bookings at a glance.' },
        { name: 'Revenue Reports', desc: 'Filterable by date, exportable as PDF.' },
        { name: 'WhatsApp Reports', desc: 'Restaurant owners can request reports via WhatsApp message.' },
        { name: 'Table Utilization', desc: 'Track which tables are most/least used.' },
      ],
    },
  ];

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <nav style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🍽️</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>DineBoard</span>
        </Link>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/pricing" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Pricing</Link>
          <Link href="/about" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>About</Link>
          <Link href="/register" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Start Free Trial</Link>
        </div>
      </nav>

      <div className="container section">
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="badge badge-primary">Features</span>
          <h1 className="section-title" style={{ marginTop: '16px' }}>
            Powerful Features for<br /><span className="gradient-text">Modern Restaurants</span>
          </h1>
        </div>

        {categories.map((cat, i) => (
          <div key={i} style={{ marginBottom: '64px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, marginBottom: '24px' }}>
              {cat.title}
            </h2>
            <div className="grid-2" style={{ gap: '16px' }}>
              {cat.features.map((f, j) => (
                <div key={j} className="card" style={{ padding: '24px' }}>
                  <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>{f.name}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Link href="/register" className="btn btn-primary btn-lg">Start Your Free Trial →</Link>
        </div>
      </div>
    </div>
  );
}
