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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  const API = getApiUrl();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('tenant', JSON.stringify(data.data.tenant));
        window.location.href = '/admin/dashboard';
      } else if (data.requiresVerification) {
        // Email not verified — show OTP input
        setNeedsVerification(true);
        setError('');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.token) localStorage.setItem('token', data.data.token);
        if (data.data?.user) localStorage.setItem('user', JSON.stringify(data.data.user));
        if (data.data?.tenant) localStorage.setItem('tenant', JSON.stringify(data.data.tenant));
        window.location.href = '/admin/dashboard';
      } else {
        setError(data.message);
      }
    } catch { setError('Connection error.'); }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    try {
      await fetch(`${API}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      alert('A new OTP has been sent to your email!');
    } catch { alert('Failed to resend OTP.'); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden', padding: '20px',
    }}>
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(255, 107, 53, 0.08), transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)',
      }} />

      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <span style={{ fontSize: '2rem' }}>🍽️</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800,
              background: 'linear-gradient(135deg, var(--primary), var(--accent-light))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>DineBoard</span>
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
            {needsVerification ? 'Verify Your Email' : 'Welcome Back'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {needsVerification
              ? `We sent an OTP to ${email}`
              : 'Sign in to manage your restaurant'}
          </p>
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
            }}>{error}</div>
          )}

          {!needsVerification ? (
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input id="email" type="email" placeholder="you@restaurant.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" placeholder="Enter your password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px',
              }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer',
                }}>
                  <input type="checkbox" /> Remember me
                </label>
                <Link href="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
                  Forgot password?
                </Link>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '14px', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📧</div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Please verify your email to continue. A new OTP has been sent.
                </p>
              </div>
              <div className="input-group">
                <label>Enter OTP</label>
                <input type="text" placeholder="000000" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 700 }} />
              </div>
              <button className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                onClick={handleVerifyOTP}>
                {loading ? 'Verifying...' : 'Verify Email →'}
              </button>
              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Didn&apos;t receive the OTP?{' '}
                <span onClick={handleResendOTP} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                  Resend
                </span>
              </p>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Start Free Trial</Link>
        </p>
      </div>
    </div>
  );
}
