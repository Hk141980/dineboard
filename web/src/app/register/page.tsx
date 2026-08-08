'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    ownerName: '', email: '', phone: '', password: '',
    restaurantName: '', address: '', city: '', state: '', pincode: '', cuisineType: '',
    planId: 'pro',
  });

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('tenant', JSON.stringify(data.data.tenant));
        window.location.href = '/admin/dashboard';
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '40px 20px', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.08), transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)',
      }} />

      <div style={{ width: '100%', maxWidth: '520px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <span style={{ fontSize: '2rem' }}>🍽️</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800,
              background: 'linear-gradient(135deg, var(--primary), var(--accent-light))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>DineBoard</span>
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
            Start Your Free Trial
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            14 days free · No credit card required
          </p>
        </div>

        {/* Step Indicator */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px',
        }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              width: s === step ? '40px' : '12px', height: '4px', borderRadius: '4px',
              background: s <= step ? 'var(--primary)' : 'var(--border)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '32px', backdropFilter: 'blur(12px)',
        }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
              color: 'var(--error)', fontSize: '0.88rem',
            }}>
              {error}
            </div>
          )}

          {/* Step 1: Owner Details */}
          {step === 1 && (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px' }}>
                👤 Owner Details
              </h2>
              <div className="input-group">
                <label>Full Name</label>
                <input placeholder="Your full name" value={formData.ownerName}
                  onChange={(e) => update('ownerName', e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Email Address</label>
                <input type="email" placeholder="you@email.com" value={formData.email}
                  onChange={(e) => update('email', e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input type="tel" placeholder="+91 98765 43210" value={formData.phone}
                  onChange={(e) => update('phone', e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input type="password" placeholder="Min 8 characters" value={formData.password}
                  onChange={(e) => update('password', e.target.value)} required />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setStep(2)}>
                Continue →
              </button>
            </>
          )}

          {/* Step 2: Restaurant Details */}
          {step === 2 && (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px' }}>
                🍽️ Restaurant Details
              </h2>
              <div className="input-group">
                <label>Restaurant Name</label>
                <input placeholder="e.g., Tina's Fusion Kitchen" value={formData.restaurantName}
                  onChange={(e) => update('restaurantName', e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Cuisine Type</label>
                <select value={formData.cuisineType} onChange={(e) => update('cuisineType', e.target.value)}>
                  <option value="">Select cuisine type</option>
                  <option value="North Indian">North Indian</option>
                  <option value="South Indian">South Indian</option>
                  <option value="Multi-Cuisine">Multi-Cuisine</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Italian">Italian</option>
                  <option value="Fast Food">Fast Food</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="input-group">
                <label>Address</label>
                <input placeholder="Full address" value={formData.address}
                  onChange={(e) => update('address', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label>City</label>
                  <input placeholder="City" value={formData.city}
                    onChange={(e) => update('city', e.target.value)} />
                </div>
                <div className="input-group">
                  <label>State</label>
                  <input placeholder="State" value={formData.state}
                    onChange={(e) => update('state', e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Pincode</label>
                  <input placeholder="PIN" value={formData.pincode}
                    onChange={(e) => update('pincode', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}
                  onClick={() => setStep(3)}>
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* Step 3: Choose Plan */}
          {step === 3 && (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px' }}>
                📋 Choose Your Plan
              </h2>
              {[
                { id: 'starter', name: 'Starter', price: '₹999/mo', desc: 'Basic features, 5% commission' },
                { id: 'pro', name: 'Pro', price: '₹2,499/mo', desc: 'AI Chatbot, Staff Mgmt, 3% commission', popular: true },
                { id: 'enterprise', name: 'Enterprise', price: '₹4,999/mo', desc: 'Everything + Custom Branding, 1.5% commission' },
              ].map((plan) => (
                <div key={plan.id} onClick={() => update('planId', plan.id)} style={{
                  padding: '16px 20px', borderRadius: '12px', marginBottom: '12px', cursor: 'pointer',
                  border: formData.planId === plan.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: formData.planId === plan.id ? 'var(--primary-glow)' : 'var(--bg-tertiary)',
                  transition: 'all 0.2s ease', position: 'relative',
                }}>
                  {plan.popular && (
                    <span style={{
                      position: 'absolute', top: '-8px', right: '12px',
                      background: 'var(--primary)', color: 'white',
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 10px',
                      borderRadius: '100px',
                    }}>RECOMMENDED</span>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '4px' }}>{plan.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{plan.desc}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--primary)' }}>
                      {plan.price}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}
                  disabled={loading} onClick={handleRegister}>
                  {loading ? 'Creating...' : 'Create Restaurant →'}
                </button>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
                2-day free trial · No payment required now · Cancel anytime
              </p>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
