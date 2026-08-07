'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const API = (() => {
    if (typeof window !== 'undefined') {
      const { hostname } = window.location;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') return '/api';
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  })();

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || 'Reset OTP sent successfully!');
        if (data.data?.devOtp) {
          setMessage(`Reset OTP sent! (Dev Mode OTP: ${data.data.devOtp})`);
        }
        setStep('otp');
      } else {
        setError(data.message || 'No account found with this email address.');
      }
    } catch { setError('Connection error. Please try again.'); }
    setLoading(false);
  };

  // Step 2: Verify OTP & Reset
  const handleReset = async () => {
    if (!otp) { setError('Please enter the OTP.'); return; }
    if (!newPassword || newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep('done');
      } else {
        setError(data.message || 'Invalid or expired OTP.');
      }
    } catch { setError('Connection error. Please try again.'); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden', padding: '20px',
    }}>
      <div style={{
        position: 'absolute', top: '-20%', left: '40%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(255, 107, 53, 0.06), transparent 70%)',
        borderRadius: '50%', filter: 'blur(80px)',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
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
            {step === 'done' ? 'Password Reset!' : 'Reset Password'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {step === 'email' && 'Enter your registered email to receive a reset OTP.'}
            {step === 'otp' && 'Enter the OTP sent to your email and your new password.'}
            {step === 'done' && 'Your password has been updated successfully.'}
          </p>
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '32px', backdropFilter: 'blur(12px)',
        }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
              color: '#EF4444', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
              {error.includes('No account found') && (
                <Link href="/register" style={{
                  color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline', fontSize: '0.85rem', marginTop: '4px', display: 'inline-block'
                }}>
                  Click here to Register for a new account →
                </Link>
              )}
            </div>
          )}
          {message && !error && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
              color: '#22C55E', fontSize: '0.88rem', fontWeight: 500,
            }}>{message}</div>
          )}

          {step === 'email' && (
            <>
              <div className="input-group">
                <label>Email Address</label>
                <input type="email" placeholder="you@restaurant.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                onClick={handleSendOTP}>
                {loading ? 'Sending...' : 'Send Reset OTP →'}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="input-group">
                <label>OTP Code (6 digits)</label>
                <input type="text" placeholder="Enter 6-digit OTP" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6} style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '6px', fontWeight: 700 }} />
              </div>
              <div className="input-group">
                <label>New Password</label>
                <input type="password" placeholder="Min 8 characters" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Confirm Password</label>
                <input type="password" placeholder="Confirm new password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                onClick={handleReset}>
                {loading ? 'Resetting...' : 'Reset Password →'}
              </button>
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Link href="/login" className="btn btn-primary"
                style={{ display: 'inline-flex', justifyContent: 'center', padding: '14px 32px' }}>
                Go to Login →
              </Link>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Remember your password?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
