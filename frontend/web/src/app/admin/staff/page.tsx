'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'waiter', isActive: true });

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    try {
      const res = await api.getStaff();
      if (res.success) {
        const staffData = Array.isArray(res.data) ? res.data : (res.data?.staff || res.data?.data || []);
        setStaff(staffData);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function openForm(s?: any) {
    if (s) {
      setEditing(s);
      setForm({ name: s.name, email: s.email, phone: s.phone || '', password: '', role: s.role, isActive: s.isActive });
    } else {
      setEditing(null);
      setForm({ name: '', email: '', phone: '', password: '', role: 'waiter', isActive: true });
    }
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        const payload: any = { name: form.name, email: form.email, phone: form.phone, role: form.role, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        await api.updateStaff(editing.id, payload);
      } else {
        await api.createStaff(form);
      }
      setShowForm(false);
      loadStaff();
    } catch (e) { alert('Error saving staff'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this staff member?')) return;
    await api.deleteStaff(id);
    loadStaff();
  }

  const roleIcons: Record<string, string> = { owner: '👑', manager: '📋', waiter: '🍽️', chef: '👨‍🍳', cashier: '💰' };
  const roleColors: Record<string, string> = { owner: '#f59e0b', manager: '#6366f1', waiter: '#22c55e', chef: '#ef4444', cashier: '#3b82f6' };

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>👨‍🍳 Staff Management</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{staff.length} staff members</p>
        </div>
        <button className="btn-primary" onClick={() => openForm()}>+ Add Staff</button>
      </div>

      {/* Role Counts */}
      <div className="grid-5" style={{ marginBottom: '24px', gap: '12px' }}>
        {['owner', 'manager', 'waiter', 'chef', 'cashier'].map((role) => (
          <div key={role} className="stat-card" style={{ padding: '14px 18px', borderLeft: `3px solid ${roleColors[role]}` }}>
            <span style={{ fontSize: '1.2rem' }}>{roleIcons[role]}</span>
            <div style={{ fontWeight: 600, textTransform: 'capitalize', marginTop: '4px' }}>{role}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{staff.filter((s) => s.role === role).length}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading staff...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.email}</td>
                  <td>{s.phone || '—'}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                      background: `${roleColors[s.role]}15`, color: roleColors[s.role],
                    }}>
                      {roleIcons[s.role]} {s.role}
                    </span>
                  </td>
                  <td><span className={`status ${s.isActive ? 'status-active' : 'status-inactive'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openForm(s)} className="btn-sm">Edit</button>
                      {s.role !== 'owner' && <button onClick={() => handleDelete(s.id)} className="btn-sm btn-danger">Remove</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px' }}>
              {editing ? 'Edit Staff' : 'Add Staff'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Phone (10 digits) *</label>
                  <div className="phone-input-group">
                    <span className="phone-prefix">+91</span>
                    <input
                      value={form.phone.replace(/^\+?91/, '').replace(/\D/g, '')}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="9876543210"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} {...(!editing ? { required: true } : {})} />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="manager">Manager</option>
                    <option value="waiter">Waiter</option>
                    <option value="chef">Chef</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn-primary" onClick={(e) => {
                  const cleanPhone = form.phone.replace(/^\+?91/, '').replace(/\D/g, '');
                  if (cleanPhone.length !== 10) {
                    e.preventDefault();
                    alert('Phone number must be exactly 10 digits.');
                    return;
                  }
                }}>{editing ? 'Update' : 'Add Staff'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
