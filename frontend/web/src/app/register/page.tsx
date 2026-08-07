'use client';

import { useState } from 'react';
import Link from 'next/link';

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '/api';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    ownerName: '', email: '', phone: '', password: '',
    restaurantName: '', address: '', city: '', state: '', pincode: '', cuisineType: '',
    planId: 'pro',
  });

  const API = getApiUrl();

  const update = (field: string, value: string) => {
    if (field === 'phone') {
      value = value.replace(/\D/g, '').replace(/^91/, '').slice(0, 10);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.ownerName || !formData.email || !formData.phone || !formData.password) {
      setError('Please fill in all fields.');
      return false;
    }
    if (formData.phone.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return false;
    }
    setError('');
    return true;
  };

  const [devOtpMessage, setDevOtpMessage] = useState('');

  const handleSendRegisterOTP = async () => {
    if (!validateStep1()) return;
    setLoading(true);
    setError('');
    setDevOtpMessage('');
    try {
      const res = await fetch(`${API}/auth/send-register-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, phone: formData.phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'An account with this email address already exists.');
        setLoading(false);
        return;
      }
      if (data.data?.devOtp) {
        setDevOtpMessage(`Dev Mode OTP: ${data.data.devOtp}`);
      }
      setStep(15); // Step 1B (OTP Verification)
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegisterOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/verify-register-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setError('');
        setStep(2); // Advance to Restaurant Details!
      } else {
        setError(data.message || 'Invalid or expired OTP code.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.data?.token) {
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
          localStorage.setItem('tenant', JSON.stringify(data.data.tenant));
        }
        window.location.href = '/admin/dashboard';
      } else {
        setError(data.message || 'Registration failed. Please try again.');
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
          {[1, 2, 3].map((s) => {
            const activeStep = step === 15 ? 1 : step;
            return (
              <div key={s} style={{
                width: s === activeStep ? '40px' : '12px', height: '4px', borderRadius: '4px',
                background: s <= activeStep ? 'var(--primary)' : 'var(--border)',
                transition: 'all 0.3s ease',
              }} />
            );
          })}
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '32px', backdropFilter: 'blur(12px)',
        }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
              color: '#EF4444', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
              {error.includes('already exists') && (
                <Link href="/login" style={{
                  color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline', fontSize: '0.85rem',
                  marginTop: '4px', display: 'inline-block',
                }}>
                  Click here to Sign In with this account →
                </Link>
              )}
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
                <label>Phone Number (10 digits)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>+91</span>
                  <input type="tel" placeholder="9876543210" value={formData.phone}
                    onChange={(e) => update('phone', e.target.value)} required
                    maxLength={10} pattern="[0-9]{10}" />
                </div>
              </div>
              <div className="input-group">
                <label>Password</label>
                <input type="password" placeholder="Min 8 characters" value={formData.password}
                  onChange={(e) => update('password', e.target.value)} required />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
                onClick={handleSendRegisterOTP}>
                {loading ? 'Sending OTP...' : 'Send OTP & Continue →'}
              </button>
            </>
          )}

          {/* Step 1B: Verify Email OTP */}
          {step === 15 && (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>
                ✉️ Verify Your Email Address
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                We sent a 6-digit verification code to <strong style={{ color: 'var(--text-primary)' }}>{formData.email}</strong>. Please enter it below.
              </p>

              {devOtpMessage && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '10px', padding: '10px 14px', marginBottom: '20px',
                  color: '#60A5FA', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center',
                }}>
                  {devOtpMessage}
                </div>
              )}

              <div className="input-group">
                <label>OTP Code (6 digits)</label>
                <input type="text" placeholder="Enter 6-digit OTP" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '6px', fontWeight: 700 }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { setStep(1); setError(''); setOtp(''); }}>
                  ← Edit Email
                </button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}
                  disabled={loading || otp.length !== 6}
                  onClick={handleVerifyRegisterOTP}>
                  {loading ? 'Verifying...' : 'Verify OTP →'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button onClick={handleSendRegisterOTP} disabled={loading} style={{
                  background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer',
                  fontSize: '0.82rem', textDecoration: 'underline',
                }}>
                  Resend OTP Code
                </button>
              </div>
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
                  <select value={formData.state} onChange={(e) => update('state', e.target.value)}>
                    <option value="">Select State</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                  </select>
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
                14-day free trial · No payment required now · Cancel anytime
              </p>
            </>
          )}

          {/* Step 4: Email Verification OTP */}
          {step === 4 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📧</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
                  Verify Your Email
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  We sent a 6-digit OTP to <strong style={{ color: 'var(--primary)' }}>{formData.email}</strong>
                </p>
              </div>
              <div className="input-group">
                <label>Enter OTP</label>
                <input
                  type="text" placeholder="000000" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 700 }}
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading} onClick={handleVerifyOTP}>
                {loading ? 'Verifying...' : 'Verify Email →'}
              </button>
              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Didn&apos;t receive the OTP?{' '}
                <span onClick={handleResendOTP} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                  Resend
                </span>
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                OTP expires in 10 minutes · Check your spam folder
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
