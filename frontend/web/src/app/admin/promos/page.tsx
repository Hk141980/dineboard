'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function PromosManagement() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '0',
    validFrom: new Date().toISOString().slice(0, 10), validUntil: '', maxUses: '100', isActive: true,
  });

  useEffect(() => { loadPromos(); }, []);

  async function loadPromos() {
    try {
      const res = await api.getPromos();
      if (res.success) setPromos(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function openForm(p?: any) {
    if (p) {
      setEditing(p);
      setForm({
        code: p.code, discountType: p.discountType, discountValue: String(p.discountValue),
        minOrderAmount: String(p.minOrderAmount), validFrom: new Date(p.validFrom).toISOString().slice(0, 10),
        validUntil: new Date(p.validUntil).toISOString().slice(0, 10), maxUses: String(p.maxUses), isActive: p.isActive,
      });
    } else {
      setEditing(null);
      setForm({ code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '0', validFrom: new Date().toISOString().slice(0, 10), validUntil: '', maxUses: '100', isActive: true });
    }
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form, discountValue: parseFloat(form.discountValue), minOrderAmount: parseFloat(form.minOrderAmount), maxUses: parseInt(form.maxUses),
    };
    try {
      if (editing) { await api.updatePromo(editing.id, payload); }
      else { await api.createPromo(payload); }
      setShowForm(false);
      loadPromos();
    } catch (e) { alert('Error saving promo'); }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>🎫 Promo Codes</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{promos.length} promo codes</p>
        </div>
        <button className="btn-primary" onClick={() => openForm()}>+ Create Promo</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading promos...</div>
      ) : promos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          No promo codes created yet. Click + to create one!
        </div>
      ) : (
        <div className="grid-3" style={{ gap: '16px' }}>
          {promos.map((p) => (
            <div key={p.id} className="card" style={{ padding: '20px', opacity: p.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800,
                  padding: '4px 12px', borderRadius: '6px', background: 'var(--primary-glow)', color: 'var(--primary)',
                  letterSpacing: '0.05em',
                }}>{p.code}</span>
                <span className={`status ${p.isActive ? 'status-active' : 'status-inactive'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>
                {p.discountType === 'percentage' ? `${p.discountValue}% OFF` : `₹${p.discountValue} OFF`}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Min order: ₹{p.minOrderAmount}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Used: {p.usedCount} / {p.maxUses}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Valid: {new Date(p.validFrom).toLocaleDateString()} — {new Date(p.validUntil).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => openForm(p)} className="btn-sm" style={{ flex: 1 }}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px' }}>{editing ? 'Edit Promo' : 'Create Promo Code'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Promo Code *</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="e.g. WELCOME20" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Discount Type</label>
                  <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount Value *</label>
                  <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} required min="0" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Order (₹)</label>
                  <input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} min="0" />
                </div>
                <div className="form-group">
                  <label>Max Uses</label>
                  <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} min="1" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Valid From *</label>
                  <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Valid Until *</label>
                  <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  Active
                </label>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
