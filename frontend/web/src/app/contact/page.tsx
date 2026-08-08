'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', restaurantName: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      const { hostname } = window.location;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return '/api';
      }
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${getApiUrl()}/platform/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } catch (err) {}
    setSubmitted(true);
  };


  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', paddingTop: '100px' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px',
        background: scrolled ? 'rgba(10, 10, 15, 0.95)' : 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid var(--border)',
        transition: 'all 0.4s ease',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto', height: '80px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span style={{ fontSize: '1.8rem' }}>🍽️</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800,
              background: 'linear-gradient(135deg, var(--primary), var(--accent-light))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>DineBoard</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>Home</Link>
            <Link href="/features" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>Features</Link>
            <Link href="/pricing" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>Pricing</Link>
            <Link href="/contact" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}>Contact</Link>
            <Link href="/login" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem', textDecoration: 'none' }}>Login</Link>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div style={{ maxWidth: '850px', margin: '0 auto', padding: '40px 24px 80px' }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span className="badge badge-primary">Contact</span>
          <h1 className="section-title" style={{ marginTop: '16px', fontSize: '2.5rem' }}>Get In Touch</h1>
          <p className="section-subtitle" style={{ margin: '12px auto 0', maxWidth: '550px', color: 'var(--text-secondary)' }}>
            Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond within 24 hours.
          </p>
        </div>

        {/* Contact Form */}
        {submitted ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px', borderRadius: '16px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px' }}>Thank You!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>We&apos;ll get back to you within 24 hours.</p>
            <Link href="/" className="btn btn-primary" style={{ marginTop: '24px', display: 'inline-block' }}>Back to Home</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card" style={{ padding: '36px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div className="grid-2" style={{ gap: '20px' }}>
              <div className="input-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Your Name</label>
                <input placeholder="Full name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Email</label>
                <input type="email" placeholder="you@email.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
            
            <div className="grid-2" style={{ gap: '20px', marginTop: '16px' }}>
              <div className="input-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Phone</label>
                <input type="tel" placeholder="+91 98897 76828" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Restaurant Name</label>
                <input placeholder="Your restaurant" value={form.restaurantName}
                  onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} />
              </div>
            </div>

            <div className="input-group" style={{ marginTop: '16px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Message</label>
              <textarea rows={4} placeholder="How can we help?" value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })} required
                style={{ resize: 'vertical' }} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '24px', padding: '14px', fontSize: '0.95rem', fontWeight: 700 }}>
              Send Message
            </button>
          </form>
        )}

        {/* 3 Contact Cards at Bottom */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginTop: '48px',
        }}>
          {/* Email */}
          <div className="card" style={{
            padding: '24px 16px',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(255, 107, 53, 0.1)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', marginBottom: '12px',
            }}>📧</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>Email</div>
            <a href="mailto:info@dineboard.in" style={{
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              wordBreak: 'break-all',
              textDecoration: 'none',
            }}>
              info@dineboard.in
            </a>
          </div>

          {/* Phone */}
          <div className="card" style={{
            padding: '24px 16px',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', marginBottom: '12px',
            }}>📞</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>Phone</div>
            <a href="tel:+919889776828" style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}>
              +91 98897 76828
            </a>
          </div>

          {/* Office */}
          <div className="card" style={{
            padding: '24px 16px',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(236, 72, 153, 0.1)', color: '#EC4899',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', marginBottom: '12px',
            }}>📍</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>Office</div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
            }}>
              Gurgaon, India
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '40px 24px',
        background: 'var(--bg-secondary)',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
      }}>
        © 2026 DineBoard. Made with ❤️ in India.
      </footer>
    </div>
  );
}
