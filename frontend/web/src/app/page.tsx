'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ---- Navigation ----
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 24px',
      background: scrolled || mobileMenuOpen ? 'rgba(10, 10, 15, 0.95)' : 'transparent',
      backdropFilter: scrolled || mobileMenuOpen ? 'blur(24px) saturate(180%)' : 'none',
      borderBottom: scrolled ? '1px solid var(--border)' : 'none',
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{
        maxWidth: '1400px', margin: '0 auto', height: 'var(--nav-height)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.8rem' }}>🍽️</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800,
            background: 'linear-gradient(135deg, var(--primary), var(--accent-light))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>DineBoard</span>
        </Link>

        {/* Desktop Nav */}
        <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} style={{
              color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500,
              transition: 'color 0.2s',
            }}>{item.label}</Link>
          ))}
          <Link href="/login" className="btn btn-secondary" style={{
            padding: '8px 22px', fontSize: '0.88rem', borderRadius: '8px',
          }}>Login</Link>
          <Link href="/register" className="btn btn-primary" style={{
            padding: '8px 22px', fontSize: '0.88rem', borderRadius: '8px',
          }}>Start Free Trial</Link>
        </div>

        {/* Mobile Hamburger */}
        <button className="mobile-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
          display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)',
          fontSize: '1.5rem', cursor: 'pointer', padding: '8px',
        }}>{mobileMenuOpen ? '✕' : '☰'}</button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '12px',
          borderTop: '1px solid var(--border)',
        }}>
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} style={{
              color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500,
              padding: '10px 0', borderBottom: '1px solid var(--border)',
            }}>{item.label}</Link>
          ))}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary" style={{
              flex: 1, justifyContent: 'center', padding: '12px', fontSize: '0.9rem', borderRadius: '10px',
            }}>Login</Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary" style={{
              flex: 1, justifyContent: 'center', padding: '12px', fontSize: '0.9rem', borderRadius: '10px',
            }}>Free Trial</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ---- Hero Section ----
function HeroSection() {
  return (
    <section style={{
      position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px',
      overflow: 'hidden',
    }}>
      {/* Background gradient orbs */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '1360px', width: '100%', margin: '0 auto' }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '8px 20px', borderRadius: '999px', marginBottom: '32px',
          background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)',
          fontSize: '0.88rem', color: 'var(--primary-light)', fontWeight: 500,
        }}>
          <span style={{ animation: 'pulse 2s infinite' }}>🚀</span>
          Now with AI-Powered WhatsApp Chatbot
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem, 6.5vw, 5rem)',
          fontWeight: 900, lineHeight: 1.1, marginBottom: '24px',
          background: 'linear-gradient(135deg, #FFFFFF 30%, var(--primary-light) 70%, var(--accent-light))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
        }}>
          Your Restaurant, Beautifully Managed
        </h1>

        <p style={{
          fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '820px',
          margin: '0 auto 40px', lineHeight: 1.7,
        }}>
          The all-in-one SaaS platform for restaurant owners. AI-powered WhatsApp ordering,
          smart table booking, integrated Razorpay payments, and real-time analytics.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '24px' }}>
          <Link href="/register" className="btn btn-primary" style={{
            padding: '14px 36px', fontSize: '1rem', borderRadius: '12px',
          }}>
            Start 14-Day Free Trial →
          </Link>
          <Link href="/features" className="btn btn-secondary" style={{
            padding: '14px 36px', fontSize: '1rem', borderRadius: '12px',
          }}>
            ▶ Watch Demo
          </Link>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No credit card required · Setup in 5 minutes · Cancel anytime
        </p>

        {/* Hero Image */}
        <div style={{
          marginTop: '60px', borderRadius: '16px', overflow: 'hidden',
          border: '1px solid var(--border-light)', boxShadow: '0 20px 80px rgba(255,107,53,0.15), 0 0 0 1px rgba(255,255,255,0.05)',
        }}>
          <img src="/images/hero-dashboard.png" alt="DineBoard Dashboard"
            style={{ width: '100%', display: 'block', borderRadius: '16px' }} />
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px',
          marginTop: '60px',
        }}>
          {[
            { value: '500+', label: 'Restaurants' },
            { value: '1M+', label: 'Orders Processed' },
            { value: '50+', label: 'Cities' },
            { value: '4.9★', label: 'Rating' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{stat.value}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{stat.label}</div>
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
    { icon: '🤖', title: 'AI WhatsApp Chatbot', desc: 'Customers order food, book tables, and request bills via WhatsApp in Hindi, English, or Hinglish. Powered by Google Gemini AI.', color: '#25D366' },
    { icon: '🪑', title: 'Smart Table Booking', desc: 'Configurable dining + cleaning slots, automatic table combinations, alternative time suggestions, and WhatsApp reminders.', color: '#3B82F6' },
    { icon: '💳', title: 'Razorpay Payments', desc: 'Use platform Razorpay (auto-commission) or your own keys (monthly invoice). Payment links via WhatsApp for seamless checkout.', color: '#6366F1' },
    { icon: '🏢', title: 'Multi-Tenant SaaS', desc: 'Each restaurant gets its own branded page, WhatsApp number, and admin panel. Complete data isolation guaranteed.', color: '#8B5CF6' },
    { icon: '📊', title: 'Real-Time Reports', desc: 'Revenue analytics, top-selling items, table utilization, order source breakdown, and exportable PDF reports.', color: '#F59E0B' },
    { icon: '🧾', title: 'GST Invoicing', desc: 'Auto-generated invoices with CGST + SGST breakdown. PDF download and instant WhatsApp delivery to customers.', color: '#EF4444' },
    { icon: '👨‍🍳', title: 'Staff Management', desc: 'Role-based access for owners, managers, waiters, chefs, and cashiers. Each role sees only what they need.', color: '#06B6D4' },
    { icon: '🎫', title: 'Promo Codes', desc: 'Create percentage or flat discounts with validity dates, min order amounts, and usage limits. Track redemptions in real-time.', color: '#EC4899' },
  ];

  return (
    <section style={{
      padding: '100px 24px', maxWidth: '1400px', margin: '0 auto',
      position: 'relative',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 800,
          marginBottom: '16px',
          background: 'linear-gradient(135deg, var(--text-primary) 40%, var(--primary-light))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Everything You Need</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          One platform to manage orders, bookings, staff, payments, and customer engagement.
        </p>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px',
      }}>
        {features.map((f, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '28px', transition: 'all 0.3s ease',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = f.color;
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
            (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${f.color}20`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: `${f.color}15`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.5rem', marginBottom: '16px',
            }}>{f.icon}</div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700,
              marginBottom: '8px', color: 'var(--text-primary)',
            }}>{f.title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Showcase Section ----
function ShowcaseSection() {
  return (
    <section style={{
      padding: '80px 24px', maxWidth: '1400px', margin: '0 auto',
    }}>
      {/* WhatsApp AI Showcase */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center',
        marginBottom: '100px',
      }}>
        <div>
          <div style={{
            display: 'inline-flex', padding: '6px 14px', borderRadius: '999px',
            background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)',
            fontSize: '0.8rem', color: '#25D366', fontWeight: 600, marginBottom: '20px',
          }}>🤖 AI-POWERED</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800,
            marginBottom: '16px', lineHeight: 1.2,
          }}>WhatsApp Ordering<br />That Speaks Your Language</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.7 }}>
            Customers simply message your restaurant&apos;s WhatsApp number. Our Gemini AI understands
            Hindi, English, and Hinglish naturally — no rigid menus or bots.
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            {['Order food in natural language', 'Book tables with date & time', 'Request bill & pay online', 'Get personalized recommendations'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
                  color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
                }}>✓</span>
                <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{
          borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(37,211,102,0.1)',
        }}>
          <img src="/images/feature-whatsapp.png" alt="WhatsApp AI Chatbot"
            style={{ width: '100%', display: 'block' }} />
        </div>
      </div>

      {/* Table Booking Showcase */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center',
      }}>
        <div style={{
          borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(59,130,246,0.1)',
        }}>
          <img src="/images/feature-booking.png" alt="Smart Table Booking"
            style={{ width: '100%', display: 'block' }} />
        </div>
        <div>
          <div style={{
            display: 'inline-flex', padding: '6px 14px', borderRadius: '999px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
            fontSize: '0.8rem', color: '#3B82F6', fontWeight: 600, marginBottom: '20px',
          }}>🪑 SMART BOOKING</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800,
            marginBottom: '16px', lineHeight: 1.2,
          }}>Intelligent Table<br />Management System</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.7 }}>
            Configure dining + cleaning times, auto-combine tables for large groups,
            and get smart alternative suggestions when slots are full.
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            {['Configurable slot durations', 'Auto table combination for groups', 'Alternative time suggestions', 'WhatsApp reminders (1hr + 30min)'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)',
                  color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
                }}>✓</span>
                <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- How It Works ----
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Register', desc: 'Sign up in 2 minutes. Choose your plan and set up your restaurant profile.', icon: '📝' },
    { num: '02', title: 'Configure', desc: 'Add your menu, tables, staff, and connect WhatsApp. We handle the rest.', icon: '⚙️' },
    { num: '03', title: 'Go Live', desc: 'Share your branded restaurant page. Start accepting orders and bookings.', icon: '🚀' },
    { num: '04', title: 'Grow', desc: 'Use AI insights, analytics, and promos to grow your business every day.', icon: '📈' },
  ];

  return (
    <section style={{
      padding: '100px 24px', maxWidth: '1400px', margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 800,
          marginBottom: '16px',
          background: 'linear-gradient(135deg, var(--text-primary), var(--accent-light))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Get Started in Minutes</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Four simple steps to transform your restaurant</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '28px', textAlign: 'center',
            position: 'relative', transition: 'all 0.3s',
          }}>
            <div style={{
              fontSize: '2rem', marginBottom: '12px',
            }}>{step.icon}</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 800,
              color: 'var(--primary)', marginBottom: '8px', letterSpacing: '0.1em',
            }}>STEP {step.num}</div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700,
              marginBottom: '8px',
            }}>{step.title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Pricing Section ----
function PricingSection() {
  const plans = [
    {
      name: 'Starter', price: '999', period: '/month', badge: '',
      features: ['Up to 10 tables', '5 staff members', '100 menu items', 'WhatsApp ordering', 'Basic reports', '5% order commission'],
      cta: 'Start Free Trial', highlighted: false, color: '#3B82F6',
    },
    {
      name: 'Pro', price: '2,499', period: '/month', badge: 'POPULAR',
      features: ['Up to 30 tables', '15 staff members', '500 menu items', 'AI chatbot + WhatsApp', 'Advanced analytics', '3% order commission', 'GST invoicing', 'Priority support'],
      cta: 'Start Free Trial', highlighted: true, color: 'var(--primary)',
    },
    {
      name: 'Enterprise', price: '4,999', period: '/month', badge: '',
      features: ['Unlimited tables', 'Unlimited staff', 'Unlimited menu', 'Custom AI training', 'White-label branding', '2% order commission', 'API access', 'Dedicated support'],
      cta: 'Contact Sales', highlighted: false, color: '#8B5CF6',
    },
  ];

  return (
    <section style={{
      padding: '100px 24px', maxWidth: '1400px', margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 800,
          marginBottom: '16px',
          background: 'linear-gradient(135deg, var(--text-primary), var(--primary-light))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Simple, Transparent Pricing</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Start free. Scale as you grow. No hidden fees.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {plans.map((plan, i) => (
          <div key={i} style={{
            background: plan.highlighted ? 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(245,158,11,0.05))' : 'var(--bg-card)',
            border: `1px solid ${plan.highlighted ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '20px', padding: '36px', position: 'relative',
            boxShadow: plan.highlighted ? '0 0 60px rgba(255,107,53,0.1)' : 'none',
            transform: plan.highlighted ? 'scale(1.04)' : 'none',
          }}>
            {plan.badge && (
              <div style={{
                position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                padding: '4px 16px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff',
                letterSpacing: '0.08em',
              }}>{plan.badge}</div>
            )}
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>{plan.name}</h3>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 900 }}>₹{plan.price}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{plan.period}</span>
            </div>
            <div style={{ display: 'grid', gap: '10px', marginBottom: '28px' }}>
              {plan.features.map((f, fi) => (
                <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: plan.highlighted ? 'var(--primary)' : 'var(--success)', fontSize: '0.8rem' }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
            <Link href="/register" className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '10px' }}>
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- CTA Section ----
function CTASection() {
  return (
    <section style={{
      padding: '100px 24px', maxWidth: '1360px', margin: '0 auto', textAlign: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,107,53,0.1), rgba(245,158,11,0.05))',
        border: '1px solid rgba(255,107,53,0.2)', borderRadius: '24px', padding: '60px 40px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800,
          marginBottom: '16px',
        }}>Ready to Transform Your Restaurant?</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
          Join 500+ restaurants already using DineBoard. Start your free trial today.
        </p>
        <Link href="/register" className="btn btn-primary" style={{
          padding: '16px 40px', fontSize: '1.05rem', borderRadius: '12px',
        }}>
          Start 14-Day Free Trial →
        </Link>
      </div>
    </section>
  );
}

// ---- Footer ----
function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)', padding: '60px 48px 40px',
      background: 'var(--bg-secondary)',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.5rem' }}>🍽️</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800,
              background: 'linear-gradient(135deg, var(--primary), var(--accent-light))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>DineBoard</span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '300px', lineHeight: 1.7 }}>
            Multi-tenant SaaS restaurant management platform with AI-powered WhatsApp chatbot.
          </p>
        </div>
        {[
          { title: 'Product', links: [{ l: 'Features', h: '/features' }, { l: 'Pricing', h: '/pricing' }, { l: 'Register', h: '/register' }] },
          { title: 'Company', links: [{ l: 'About Us', h: '/about' }, { l: 'Contact', h: '/contact' }] },
          { title: 'Legal', links: [{ l: 'Privacy', h: '/privacy' }, { l: 'Terms', h: '/terms' }, { l: 'Refund', h: '/refund' }] },
        ].map((col) => (
          <div key={col.title}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '16px', fontSize: '0.9rem' }}>{col.title}</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {col.links.map((link) => (
                <Link key={link.h} href={link.h} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', transition: 'color 0.2s' }}>{link.l}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        maxWidth: '1400px', margin: '40px auto 0', paddingTop: '24px',
        borderTop: '1px solid var(--border)', textAlign: 'center',
        fontSize: '0.82rem', color: 'var(--text-muted)',
      }}>
        © 2026 DineBoard. Made with ❤️ in India.
      </div>
    </footer>
  );
}

// ---- Main Page ----
export default function HomePage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ShowcaseSection />
      <HowItWorks />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}
