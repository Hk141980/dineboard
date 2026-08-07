'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSuperAdminTenants().then((res) => {
      if (res.success) setTenants(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function changeStatus(id: string, status: string) {
    await api.updateTenantStatus(id, status);
    const res = await api.getSuperAdminTenants();
    if (res.success) setTenants(res.data || []);
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>🏪 All Tenants</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tenants.length} registered restaurants</p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '24px', gap: '12px' }}>
        {['active', 'trial', 'suspended', 'expired'].map((s) => (
          <div key={s} className="stat-card" style={{ padding: '12px 16px' }}>
            <span className="stat-label" style={{ textTransform: 'capitalize' }}>{s}</span>
            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{tenants.filter((t) => t.status === s).length}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Restaurant</th><th>Contact</th><th>Plan</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.slug} · {t.city || ''}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{t.phone || t.email || '—'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.whatsappNumber || ''}</div>
                  </td>
                  <td><span className="btn-tag">{t.subscriptionPlan?.name || 'None'}</span></td>
                  <td><span className={`status status-${t.status}`}>{t.status}</span></td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>
                    <select value={t.status} onChange={(e) => changeStatus(t.id, e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="suspended">Suspended</option>
                      <option value="expired">Expired</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
