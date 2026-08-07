'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', monthlyPrice: '', yearlyPrice: '', commissionRate: '', bookingCommission: '',
    maxTables: '20', maxStaff: '10', maxMenuItems: '100', isActive: true,
  });

  useEffect(() => {
    api.getPlans().then((res) => {
      if (res.success) setPlans(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function openForm(plan?: any) {
    if (plan) {
      setEditing(plan);
      setForm({
        name: plan.name, monthlyPrice: String(plan.monthlyPrice), yearlyPrice: String(plan.yearlyPrice),
        commissionRate: String(plan.commissionRate), bookingCommission: String(plan.bookingCommission),
        maxTables: String(plan.maxTables), maxStaff: String(plan.maxStaff), maxMenuItems: String(plan.maxMenuItems),
        isActive: plan.isActive,
      });
    } else {
      setEditing(null);
      setForm({ name: '', monthlyPrice: '', yearlyPrice: '', commissionRate: '', bookingCommission: '', maxTables: '20', maxStaff: '10', maxMenuItems: '100', isActive: true });
    }
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form, monthlyPrice: parseFloat(form.monthlyPrice), yearlyPrice: parseFloat(form.yearlyPrice),
      commissionRate: parseFloat(form.commissionRate), bookingCommission: parseFloat(form.bookingCommission),
      maxTables: parseInt(form.maxTables), maxStaff: parseInt(form.maxStaff), maxMenuItems: parseInt(form.maxMenuItems),
    };
    try {
      if (editing) await api.updatePlan(editing.id, payload);
      else await api.createPlan(payload);
      setShowForm(false);
      const res = await api.getPlans();
      if (res.success) setPlans(res.data || []);
    } catch (e) { alert('Error saving plan'); }
  }

  const tierColors = ['#3b82f6', '#8b5cf6', '#f59e0b'];

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>📋 Subscription Plans</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage pricing and features</p>
        </div>
        <button className="btn-primary" onClick={() => openForm()}>+ Create Plan</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div className="grid-3" style={{ gap: '20px' }}>
          {plans.map((plan, i) => (
            <div key={plan.id} className="card" style={{ padding: '28px', borderTop: `4px solid ${tierColors[i % 3]}`, opacity: plan.isActive ? 1 : 0.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>{plan.name}</h3>
                <span className={`status ${plan.isActive ? 'status-active' : 'status-inactive'}`}>{plan.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                ₹{Number(plan.monthlyPrice).toLocaleString()}<span style={{ fontSize: '0.9rem', fontWeight: 400 }}>/mo</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                ₹{Number(plan.yearlyPrice).toLocaleString()}/year
              </div>
              <div style={{ display: 'grid', gap: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Order Commission</span><span style={{ fontWeight: 600 }}>{plan.commissionRate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Booking Commission</span><span style={{ fontWeight: 600 }}>{plan.bookingCommission}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Max Tables</span><span style={{ fontWeight: 600 }}>{plan.maxTables}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Max Staff</span><span style={{ fontWeight: 600 }}>{plan.maxStaff}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span>Max Menu Items</span><span style={{ fontWeight: 600 }}>{plan.maxMenuItems}</span>
                </div>
              </div>
              <button onClick={() => openForm(plan)} className="btn-sm" style={{ width: '100%' }}>Edit Plan</button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px' }}>{editing ? 'Edit Plan' : 'Create Plan'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Plan Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Starter, Pro, Enterprise" /></div>
              <div className="form-row">
                <div className="form-group"><label>Monthly Price (₹)</label><input type="number" value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })} required min="0" /></div>
                <div className="form-group"><label>Yearly Price (₹)</label><input type="number" value={form.yearlyPrice} onChange={(e) => setForm({ ...form, yearlyPrice: e.target.value })} required min="0" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Order Commission (%)</label><input type="number" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} required min="0" step="0.1" /></div>
                <div className="form-group"><label>Booking Commission (%)</label><input type="number" value={form.bookingCommission} onChange={(e) => setForm({ ...form, bookingCommission: e.target.value })} required min="0" step="0.1" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Max Tables</label><input type="number" value={form.maxTables} onChange={(e) => setForm({ ...form, maxTables: e.target.value })} min="1" /></div>
                <div className="form-group"><label>Max Staff</label><input type="number" value={form.maxStaff} onChange={(e) => setForm({ ...form, maxStaff: e.target.value })} min="1" /></div>
                <div className="form-group"><label>Max Menu Items</label><input type="number" value={form.maxMenuItems} onChange={(e) => setForm({ ...form, maxMenuItems: e.target.value })} min="1" /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create Plan'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
