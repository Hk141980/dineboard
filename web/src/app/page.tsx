'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ---- Navigation ----
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 24px', height: 'var(--nav-height)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? 'rgba(10, 10, 15, 0.85)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--border)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.8rem' }}>🍽️</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800,
          background: 'linear-gradient(135deg, var(--primary), var(--accent-light))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>DineBoard</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link href="/features" className="btn-ghost" style={{ color: 'var(--text-secondary)' }}>Features</Link>
        <Link href="/pricing" className="btn-ghost" style={{ color: 'var(--text-secondary)' }}>Pricing</Link>
        <Link href="/about" className="btn-ghost" style={{ color: 'var(--text-secondary)' }}>About</Link>
        <Link href="/contact" className="btn-ghost" style={{ color: 'var(--text-secondary)' }}>Contact</Link>
        <Link href="/login" className="btn btn-secondary" style={{ padding: '8px 20px', fontSize: '0.88rem' }}>Login</Link>
        <Link href="/register" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.88rem' }}>Start Free Trial</Link>
      </div>
    </nav>
  );
}

// ---- Hero Section ----
function HeroSection() {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', paddingTop: 'var(--nav-height)',
    }}>
      {/* Background Gradient Orbs */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(255, 107, 53, 0.12), transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-10%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1), transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)',
      }} />

      <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <span className="badge badge-primary" style={{ marginBottom: '24px' }}>
            🚀 Now with AI-Powered WhatsApp Chatbot
          </span>
        </div>

        <h1 className="animate-fade-in-up" style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em',
          marginBottom: '24px', animationDelay: '0.2s',
        }}>
          Your Restaurant,<br />
          <span className="gradient-text">Beautifully Managed</span>
        </h1>

        <p className="animate-fade-in-up" style={{
          fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '640px',
          margin: '0 auto 40px', lineHeight: 1.7, animationDelay: '0.3s',
        }}>
          DineBoard is the all-in-one SaaS platform for restaurant owners.
          AI-powered WhatsApp ordering, smart table booking, integrated payments,
          and real-time analytics — all in one beautiful dashboard.
        </p>

        <div className="animate-fade-in-up" style={{
          display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap',
          animationDelay: '0.4s',
        }}>
          <Link href="/register" className="btn btn-primary btn-lg">
            Start 14-Day Free Trial →
          </Link>
          <Link href="/demo" className="btn btn-secondary btn-lg">
            ▶ Watch Demo
          </Link>
        </div>

        <div className="animate-fade-in-up" style={{
          marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)',
          animationDelay: '0.5s',
        }}>
          No credit card required · Setup in 5 minutes · Cancel anytime
        </div>

        {/* Stats */}
        <div className="animate-fade-in-up" style={{
          display: 'flex', gap: '48px', justifyContent: 'center', marginTop: '80px',
          animationDelay: '0.6s',
        }}>
          {[
            { value: '500+', label: 'Restaurants' },
            { value: '1M+', label: 'Orders Processed' },
            { value: '50+', label: 'Cities' },
            { value: '4.9★', label: 'Rating' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800,
                background: 'linear-gradient(135deg, var(--text-primary), var(--primary-light))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{stat.value}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Features Section ----
function FeaturesSection() {
  const features = [
    {
      icon: '🤖',
      title: 'AI WhatsApp Chatbot',
      description: 'Customers order, book tables, and get bills — all via WhatsApp. Supports Hindi, English, and Hinglish.',
    },
    {
      icon: '📅',
      title: 'Smart Table Booking',
      description: 'Configurable time slots with auto table assignment, availability checks, and alternative suggestions.',
    },
    {
      icon: '💳',
      title: 'Razorpay Payments',
      description: 'Subscription billing + commission auto-splits. Use our Razorpay or bring your own keys.',
    },
    {
      icon: '🏢',
      title: 'Multi-Tenant',
      description: 'Each restaurant is fully isolated with their own admin panel, branding, and WhatsApp number.',
    },
    {
      icon: '📊',
      title: 'Real-Time Reports',
      description: 'Revenue, orders, bookings — filterable analytics. Export as PDF or get via WhatsApp.',
    },
    {
      icon: '🧾',
      title: 'GST Invoicing',
      description: 'Auto-generated invoices with CGST/SGST. Send to customers via WhatsApp or web.',
    },
    {
      icon: '👨‍🍳',
      title: 'Staff Management',
      description: 'Add waiter, manager, chef, cashier — each with role-based access to the admin panel.',
    },
    {
      icon: '🎫',
      title: 'Promo Codes',
      description: 'Create percentage or flat discounts with validity dates, usage limits, and minimum order amounts.',
    },
  ];

  return (
    <section className="section" id="features" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="badge badge-primary">Features</span>
          <h2 className="section-title" style={{ marginTop: '16px' }}>
            Everything You Need to<br /><span className="gradient-text">Run Your Restaurant</span>
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            From WhatsApp ordering to GST invoicing — DineBoard handles it all so you can focus on great food.
          </p>
        </div>

        <div className="grid-4" style={{ gap: '20px' }}>
          {features.map((feature, i) => (
            <div key={i} className="card" style={{
              textAlign: 'center', padding: '32px 24px',
              animationDelay: `${i * 0.05}s`,
            }}>
              <div style={{
                fontSize: '2.5rem', marginBottom: '16px',
                filter: 'drop-shadow(0 4px 12px rgba(255, 107, 53, 0.3))',
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                fontWeight: 700, marginBottom: '10px',
              }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Pricing Section ----
function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: '999',
      yearly: '9,999',
      commission: '5%',
      bookingComm: '3%',
      features: [
        'Menu Management',
        'Order Management',
        'Table Booking (10 tables)',
        'WhatsApp Notifications',
        'Basic Reports',
        '5 Staff Members',
      ],
      notIncluded: ['AI Chatbot', 'Promo Codes', 'Custom Branding'],
      popular: false,
    },
    {
      name: 'Pro',
      price: '2,499',
      yearly: '24,999',
      commission: '3%',
      bookingComm: '2%',
      features: [
        'Everything in Starter +',
        'AI WhatsApp Chatbot',
        'Staff Management (20)',
        'Promo Codes & Discounts',
        'Advanced Reports + PDF',
        '30 Tables',
        '200 Menu Items',
      ],
      notIncluded: ['Custom Branding', 'API Access'],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '4,999',
      yearly: '49,999',
      commission: '1.5%',
      bookingComm: '1%',
      features: [
        'Everything in Pro +',
        'Custom Branding (White Label)',
        'API Access',
        'Priority Support',
        '100 Tables',
        '500 Menu Items',
        '50 Staff Members',
      ],
      notIncluded: [],
      popular: false,
    },
  ];

  return (
    <section className="section" id="pricing">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="badge badge-primary">Pricing</span>
          <h2 className="section-title" style={{ marginTop: '16px' }}>
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            Start with a 14-day free trial. No credit card required. Upgrade as your restaurant grows.
          </p>
        </div>

        <div className="grid-3" style={{ alignItems: 'stretch', maxWidth: '1100px', margin: '0 auto' }}>
          {plans.map((plan, i) => (
            <div key={i} className="card" style={{
              padding: '36px 28px', position: 'relative', overflow: 'hidden',
              border: plan.popular ? '2px solid var(--primary)' : undefined,
              boxShadow: plan.popular ? 'var(--shadow-glow)' : undefined,
            }}>
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: '16px', right: '-28px',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: 'white', padding: '4px 40px', fontSize: '0.72rem', fontWeight: 700,
                  transform: 'rotate(45deg)', letterSpacing: '0.05em',
                }}>
                  POPULAR
                </div>
              )}

              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700,
                marginBottom: '4px',
              }}>
                {plan.name}
              </h3>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                  ₹{plan.price}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/month</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                or ₹{plan.yearly}/year (save 2 months)
              </div>
              <div style={{
                fontSize: '0.82rem', color: 'var(--primary)',
                padding: '6px 0', marginBottom: '20px',
                borderBottom: '1px solid var(--border)',
              }}>
                {plan.commission} order commission · {plan.bookingComm} booking commission
              </div>

              <ul style={{ listStyle: 'none', marginBottom: '28px' }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{
                    fontSize: '0.88rem', color: 'var(--text-secondary)',
                    padding: '6px 0', display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <span style={{ color: 'var(--success)' }}>✓</span> {f}
                  </li>
                ))}
                {plan.notIncluded.map((f, j) => (
                  <li key={`no-${j}`} style={{
                    fontSize: '0.88rem', color: 'var(--text-muted)',
                    padding: '6px 0', display: 'flex', alignItems: 'center', gap: '8px',
                    textDecoration: 'line-through',
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>✕</span> {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- How It Works Section ----
function HowItWorks() {
  const steps = [
    { step: '01', title: 'Register', desc: 'Sign up and set up your restaurant in 5 minutes. Add logo, menu, and tables.' },
    { step: '02', title: 'Go Live', desc: 'Your branded restaurant page and WhatsApp chatbot go live instantly.' },
    { step: '03', title: 'Accept Orders', desc: 'Customers order via web or WhatsApp. No app download or signup needed.' },
    { step: '04', title: 'Grow', desc: 'Track revenue, manage staff, and scale with real-time analytics.' },
  ];

  return (
    <section className="section" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="badge badge-primary">How It Works</span>
          <h2 className="section-title" style={{ marginTop: '16px' }}>
            Get Started in <span className="gradient-text">Minutes</span>
          </h2>
        </div>

        <div className="grid-4" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'var(--primary-glow)', border: '1px solid rgba(255, 107, 53, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800,
                color: 'var(--primary)',
              }}>
                {s.step}
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '8px' }}>
                {s.title}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- CTA Section ----
function CTASection() {
  return (
    <section className="section">
      <div className="container" style={{ textAlign: 'center' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(124, 58, 237, 0.1))',
          border: '1px solid rgba(255, 107, 53, 0.15)',
          borderRadius: '24px', padding: '80px 40px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-50%', right: '-20%', width: '500px', height: '500px',
            background: 'radial-gradient(circle, rgba(255, 107, 53, 0.08), transparent 70%)',
            borderRadius: '50%',
          }} />
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800,
            marginBottom: '16px', position: 'relative',
          }}>
            Ready to Transform Your<br /><span className="gradient-text">Restaurant Business?</span>
          </h2>
          <p style={{
            fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '500px',
            margin: '0 auto 32px', lineHeight: 1.7, position: 'relative',
          }}>
            Join 500+ restaurant owners who use DineBoard to manage their operations efficiently.
          </p>
          <Link href="/register" className="btn btn-primary btn-lg" style={{ position: 'relative' }}>
            Start Your Free Trial Today →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---- Footer ----
function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)', padding: '64px 0 32px',
      background: 'var(--bg-secondary)',
    }}>
      <div className="container">
        <div className="grid-4" style={{ marginBottom: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.5rem' }}>🍽️</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800,
              }}>DineBoard</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your restaurant, beautifully managed. The all-in-one SaaS platform for modern restaurants.
            </p>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '0.9rem' }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/features" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Features</Link>
              <Link href="/pricing" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Pricing</Link>
              <Link href="/demo" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Demo</Link>
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '0.9rem' }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/about" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>About Us</Link>
              <Link href="/contact" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Contact</Link>
              <Link href="/careers" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Careers</Link>
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '0.9rem' }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/privacy" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Privacy Policy</Link>
              <Link href="/terms" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Terms of Service</Link>
              <Link href="/refund" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Refund Policy</Link>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border)', paddingTop: '24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} DineBoard. All rights reserved.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Made with ❤️ in India
          </p>
        </div>
      </div>
    </footer>
  );
}

// ---- Main Page ----
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorks />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
