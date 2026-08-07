'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', restaurantName: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/platform/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } catch (err) {}
    setSubmitted(true);
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <nav style={{
        padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🍽️</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>DineBoard</span>
        </Link>
        <Link href="/login" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Login</Link>
      </nav>

      <div className="container section" style={{ maxWidth: '600px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span className="badge badge-primary">Contact</span>
          <h1 className="section-title" style={{ marginTop: '16px' }}>Get In Touch</h1>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond within 24 hours.
          </p>
        </div>

        {submitted ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px' }}>Thank You!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>We&apos;ll get back to you within 24 hours.</p>
            <Link href="/" className="btn btn-primary" style={{ marginTop: '24px' }}>Back to Home</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card" style={{ padding: '32px' }}>
            <div className="grid-2">
              <div className="input-group">
                <label>Your Name</label>
                <input placeholder="Full name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input type="email" placeholder="you@email.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Phone</label>
                <input type="tel" placeholder="+91 98765 43210" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Restaurant Name</label>
                <input placeholder="Your restaurant" value={form.restaurantName}
                  onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} />
              </div>
            </div>
            <div className="input-group">
              <label>Message</label>
              <textarea rows={5} placeholder="How can we help?" value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })} required
                style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Send Message
            </button>
          </form>
        )}

        <div className="grid-3" style={{ marginTop: '48px', gap: '16px' }}>
          {[
            { icon: '📧', label: 'Email', value: 'hello@dineboard.in' },
            { icon: '📞', label: 'Phone', value: '+91 98765 43210' },
            { icon: '📍', label: 'Office', value: 'Bangalore, India' },
          ].map((c, i) => (
            <div key={i} className="card" style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{c.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem' }}>{c.label}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
