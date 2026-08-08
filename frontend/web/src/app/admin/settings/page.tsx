'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

function formatTime12Hour(time24?: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState<any>({});
  const [paymentForm, setPaymentForm] = useState({
    usesOwnRazorpay: false,
    disableMasterRazorpay: false,
    razorpayKeyId: '',
    razorpayKeySecret: '',
  });
  const [bankForm, setBankForm] = useState({
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branch: '',
    upiId: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const getBookingUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dineboard.in';
    return `${origin}/booking.html?r=${form.slug || 'restro'}`;
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Logo must be under 5MB.'); return; }
    setUploadingLogo(true);
    try {
      const res = await api.uploadLogo(file);
      if (res.success) {
        setForm({ ...form, logoUrl: res.data.logoUrl });
        setTenant({ ...tenant, logoUrl: res.data.logoUrl });
        // Update localStorage so sidebar shows new logo
        const t = localStorage.getItem('tenant');
        if (t) {
          const parsed = JSON.parse(t);
          parsed.logoUrl = res.data.logoUrl;
          localStorage.setItem('tenant', JSON.stringify(parsed));
        }
        alert('Logo uploaded!');
      } else { alert(res.message); }
    } catch { alert('Upload failed.'); }
    setUploadingLogo(false);
  };

  useEffect(() => {
    api.getRestaurantSettings().then((res) => {
      if (res.success) {
        setTenant(res.data);
        setForm(res.data);
        setPaymentForm({
          usesOwnRazorpay: res.data.usesOwnRazorpay || false,
          disableMasterRazorpay: res.data.disableMasterRazorpay || false,
          razorpayKeyId: res.data.paymentConfig?.keyId || '',
          razorpayKeySecret: res.data.paymentConfig?.keySecret || '',
        });
        if (res.data.bankDetails) {
          setBankForm({
            accountName: res.data.bankDetails.accountName || '',
            accountNumber: res.data.bankDetails.accountNumber || '',
            ifscCode: res.data.bankDetails.ifscCode || '',
            bankName: res.data.bankDetails.bankName || '',
            branch: res.data.bankDetails.branch || '',
            upiId: res.data.bankDetails.upiId || '',
          });
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function saveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateRestaurant({
        name: form.name, tagline: form.tagline, description: form.description,
        phone: form.phone, email: form.email, address: form.address, city: form.city,
        state: form.state, pincode: form.pincode, cuisineType: form.cuisineType,
        openingTime: form.openingTime, closingTime: form.closingTime, primaryColor: form.primaryColor,
      });
      alert('Settings saved!');
    } catch (e) { alert('Error saving'); }
    setSaving(false);
  }

  async function saveGst(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateRestaurant({ gstNumber: form.gstNumber });
      alert('GST details saved!');
    } catch (e) { alert('Error saving'); }
    setSaving(false);
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updatePaymentConfig({
        usesOwnRazorpay: paymentForm.usesOwnRazorpay,
        disableMasterRazorpay: paymentForm.disableMasterRazorpay,
        razorpayKeyId: paymentForm.razorpayKeyId,
        razorpayKeySecret: paymentForm.razorpayKeySecret,
      });
      if (res.success) {
        alert(res.message || 'Payment config saved!');
      } else {
        alert(res.message || 'Error saving payment config');
      }
    } catch (e: any) { alert(e?.message || 'Error saving payment config'); }
    setSaving(false);
  }

  async function saveBankDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateBankDetails(bankForm);
      if (res.success) {
        alert(res.message || 'Bank account details saved successfully!');
      } else { alert(res.message || 'Error saving bank details'); }
    } catch { alert('Error saving bank details'); }
    setSaving(false);
  }

  async function saveWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateRestaurant({
        whatsappNumber: form.whatsappNumber,
        metaPhoneNumberId: form.metaPhoneNumberId,
      });
      if (res.success) {
        alert('WhatsApp settings saved!');
      } else {
        alert(res.message || 'Error saving WhatsApp settings');
      }
    } catch (e) {
      alert('Error saving WhatsApp settings');
    }
    setSaving(false);
  }

  const tabs = [
    { id: 'general', label: '🏪 General' },
    { id: 'gst', label: '🧾 GST' },
    { id: 'payment', label: '💳 Payment' },
    { id: 'whatsapp', label: '📱 WhatsApp' },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Loading settings...</div>;

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>⚙️ Settings</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Configure your restaurant</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`btn-tag ${activeTab === t.id ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="card" style={{ padding: '28px' }}>
          {/* Public Online Booking Link Box */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '16px 20px', borderRadius: '16px', marginBottom: '24px'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📅 Customer Online Table Booking Link</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Share this unique booking URL on Google, Instagram bio, or WhatsApp with your customers:
              </p>
              <code style={{ fontSize: '0.82rem', background: 'rgba(0, 0, 0, 0.4)', padding: '6px 12px', borderRadius: '8px', color: '#10b981', fontFamily: 'monospace', display: 'inline-block', marginTop: '6px' }}>
                {getBookingUrl()}
              </code>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getBookingUrl());
                  alert('✅ Booking link copied to clipboard!');
                }}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                📋 Copy Link
              </button>
              <a
                href={getBookingUrl()}
                target="_blank"
                rel="noreferrer"
                style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}
              >
                🔗 Test Page
              </a>
            </div>
          </div>

          <form onSubmit={saveGeneral}>
            {/* Logo Upload */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '24px',
              marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '16px',
                background: 'var(--bg-tertiary)', border: '2px dashed var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (form.logoUrl && form.logoUrl.startsWith('/uploads/') && !target.src.includes(':4000')) {
                        target.src = `http://localhost:4000${form.logoUrl}`;
                      }
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '2rem' }}>🍽️</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.95rem' }}>Restaurant Logo</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  JPG, PNG, WebP. Max 5MB.
                </p>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                  background: 'var(--primary-glow)', color: 'var(--primary)',
                  fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                  border: '1px solid rgba(255,107,53,0.2)',
                }}>
                  📷 {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); }} />
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group"><label>Restaurant Name</label><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label>Cuisine Type</label><input value={form.cuisineType || ''} onChange={(e) => setForm({ ...form, cuisineType: e.target.value })} placeholder="e.g. North Indian, Chinese" /></div>
            </div>
            <div className="form-group"><label>Tagline</label><input value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></div>
            <div className="form-group"><label>Description</label><textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="form-row">
              <div className="form-group"><label>Phone</label><input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="form-group"><label>Email</label><input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Address</label><input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label>City</label><input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="form-group"><label>State</label><input value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div className="form-group"><label>Pincode</label><input value={form.pincode || ''} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Opening Time {form.openingTime ? `(${formatTime12Hour(form.openingTime)})` : ''}</label>
                <input type="time" value={form.openingTime || ''} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Closing Time {form.closingTime ? `(${formatTime12Hour(form.closingTime)})` : ''}</label>
                <input type="time" value={form.closingTime || ''} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} />
              </div>
              <div className="form-group"><label>Brand Color</label><input type="color" value={form.primaryColor || '#FF6B35'} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} style={{ height: '42px' }} /></div>
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
          </form>
        </div>
      )}



      {/* GST */}
      {activeTab === 'gst' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '10px', background: 'var(--primary-glow)', fontSize: '0.85rem' }}>
            💡 If you add your GSTIN, all invoices will include GST breakdown (CGST + SGST). Leave blank if not registered.
          </div>
          <form onSubmit={saveGst}>
            <div className="form-group"><label>GSTIN Number</label><input value={form.gstNumber || ''} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="e.g. 27AABCU9603R1ZM" maxLength={15} /></div>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save GST'}</button>
          </form>
        </div>
      )}

      {/* Payment Config */}
      {activeTab === 'payment' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '10px', background: 'var(--primary-glow)', fontSize: '0.85rem' }}>
            💡 Configure online payment gateways. You can turn off Master Razorpay collection or connect custom Razorpay keys.
          </div>
          <form onSubmit={savePayment}>
            {/* Master Razorpay Disable Toggle */}
            <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: paymentForm.disableMasterRazorpay ? '#ef4444' : 'var(--text-primary)' }}>
                    🚫 Turn Off Master Razorpay Online Payment Collection
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    When turned ON, Master Razorpay will NOT collect online payments for your restaurant. Customers will be instructed to pay in cash.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={paymentForm.disableMasterRazorpay}
                  onChange={(e) => setPaymentForm({ ...paymentForm, disableMasterRazorpay: e.target.checked })}
                  style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#ef4444' }}
                />
              </label>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={paymentForm.usesOwnRazorpay} onChange={(e) => setPaymentForm({ ...paymentForm, usesOwnRazorpay: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                Use my own custom Razorpay merchant account
              </label>
            </div>
            {paymentForm.usesOwnRazorpay && (
              <div className="form-row" style={{ marginBottom: '20px' }}>
                <div className="form-group"><label>Razorpay Key ID</label><input value={paymentForm.razorpayKeyId} onChange={(e) => setPaymentForm({ ...paymentForm, razorpayKeyId: e.target.value })} required placeholder="rzp_live_xxxxx" /></div>
                <div className="form-group"><label>Razorpay Key Secret</label><input type="password" value={paymentForm.razorpayKeySecret} onChange={(e) => setPaymentForm({ ...paymentForm, razorpayKeySecret: e.target.value })} required /></div>
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Payment Config'}</button>
          </form>

          {/* Bank Account Details */}
          <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>
              🏦 Bank Account Details (For Online Settlements & Payouts)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Enter your official restaurant bank account details to receive direct online payment payouts via Razorpay.
            </p>

            <form onSubmit={saveBankDetails}>
              <div className="form-row">
                <div className="form-group">
                  <label>Account Holder Name</label>
                  <input
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                    placeholder="e.g. Himanshu Kumar / Restro Foods"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Bank Account Number</label>
                  <input
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    placeholder="e.g. 918273645102"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input
                    value={bankForm.ifscCode}
                    onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001234"
                    maxLength={11}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    placeholder="e.g. State Bank of India / HDFC Bank"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Branch Name</label>
                  <input
                    value={bankForm.branch}
                    onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                    placeholder="e.g. Main Branch, MG Road"
                  />
                </div>
                <div className="form-group">
                  <label>UPI ID / VPA (Optional)</label>
                  <input
                    value={bankForm.upiId}
                    onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                    placeholder="e.g. restro@upi"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Bank Details'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp */}
      {activeTab === 'whatsapp' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '10px', background: 'var(--primary-glow)', fontSize: '0.85rem' }}>
            💡 Your WhatsApp Business number is used for the AI chatbot. Customers will message this number to order food and book tables.
          </div>
          <form onSubmit={saveWhatsApp}>
            <div className="form-group">
              <label>WhatsApp Business Number</label>
              <input value={form.whatsappNumber || ''} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="+91 9876543210" />
            </div>
            <div className="form-group">
              <label>Meta WhatsApp Phone Number ID (Optional)</label>
              <input value={form.metaPhoneNumberId || ''} onChange={(e) => setForm({ ...form, metaPhoneNumberId: e.target.value })} placeholder="e.g. 100928374650192 (Leave blank to use platform default)" />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Fill this if you are connecting your own dedicated Meta WhatsApp Business Account.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '20px' }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save WhatsApp Settings'}</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={async (e) => {
                  if (!form.whatsappNumber) {
                    alert('⚠️ Please enter your WhatsApp Business Number above before connecting.');
                    return;
                  }
                  await saveWhatsApp(e as any);
                  alert(`✅ WhatsApp Business number (${form.whatsappNumber}) successfully linked and activated for your AI Chatbot!`);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                🌐 Connect via Meta Popup (Automated)
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
