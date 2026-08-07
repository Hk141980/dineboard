'use client';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{
        padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🍽️</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>DineBoard</span>
        </Link>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link href="/features" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Features</Link>
          <Link href="/pricing" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Pricing</Link>
          <Link href="/contact" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Contact</Link>
          <Link href="/login" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Login</Link>
        </div>
      </nav>

      <div className="container section" style={{ maxWidth: '800px' }}>
        <span className="badge badge-primary">About Us</span>
        <h1 className="section-title" style={{ marginTop: '16px' }}>
          Building the Future of<br /><span className="gradient-text">Restaurant Technology</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '40px' }}>
          DineBoard was born from a simple observation — restaurant owners in India spend too much time
          managing operations and not enough time creating great food experiences. We set out to change that.
        </p>

        <div className="grid-2" style={{ gap: '24px', marginBottom: '48px' }}>
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '12px' }}>🎯 Our Mission</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
              To empower every restaurant owner — from street food stalls to fine dining — with enterprise-grade
              technology that&apos;s affordable, beautiful, and effortless to use.
            </p>
          </div>
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '12px' }}>🔮 Our Vision</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
              A world where every restaurant has access to AI-powered tools, seamless payments,
              and data-driven insights — regardless of size or budget.
            </p>
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>
          Why DineBoard?
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}>
          {[
            { icon: '🇮🇳', title: 'Built for India', desc: 'Razorpay, GST, Hindi/Hinglish support, WhatsApp-first — designed ground-up for Indian restaurants.' },
            { icon: '🤖', title: 'AI-First Approach', desc: 'Our Gemini-powered chatbot understands natural language, handles orders, and works 24/7 on WhatsApp.' },
            { icon: '💰', title: 'Fair Pricing', desc: 'Start at ₹999/month. No hardware required. Transparent commission structure.' },
            { icon: '🔒', title: 'Enterprise Security', desc: 'PostgreSQL RLS for data isolation, encrypted payments, and AWS infrastructure for 99.9% uptime.' },
          ].map((item, i) => (
            <div key={i} className="card" style={{ display: 'flex', gap: '16px', padding: '20px 24px' }}>
              <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: '4px' }}>{item.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/register" className="btn btn-primary btn-lg">Start Your Free Trial →</Link>
        </div>
      </div>
    </div>
  );
}
