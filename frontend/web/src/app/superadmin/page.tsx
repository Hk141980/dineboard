'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function SuperAdminOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getSuperAdminRevenue(), api.getSuperAdminTenants()])
      .then(([rev, ten]) => {
        setData({ revenue: rev.data, tenants: ten.data });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>📊 Platform Overview</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>DineBoard Super Admin Dashboard</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: '28px' }}>
            {[
              { label: 'Total Tenants', value: data?.tenants?.length || 0, icon: '🏪' },
              { label: 'Active Tenants', value: data?.tenants?.filter((t: any) => t.status === 'active').length || 0, icon: '✅' },
              { label: 'Total Revenue', value: `₹${(data?.revenue?.totalRevenue || 0).toLocaleString()}`, icon: '💰' },
              { label: 'Total Commissions', value: `₹${(data?.revenue?.totalCommissions || 0).toLocaleString()}`, icon: '📈' },
            ].map((card, i) => (
              <div key={i} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="stat-label">{card.label}</span>
                  <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                </div>
                <div className="stat-value">{card.value}</div>
              </div>
            ))}
          </div>

          {/* Recent Tenants */}
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '14px' }}>🏪 Recent Tenants</h3>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr><th>Restaurant</th><th>Owner</th><th>Plan</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {(data?.tenants || []).slice(0, 10).map((t: any) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.slug}</div>
                    </td>
                    <td>{t.staff?.[0]?.name || '—'}</td>
                    <td><span className="btn-tag">{t.subscriptionPlan?.name || 'None'}</span></td>
                    <td><span className={`status status-${t.status}`}>{t.status}</span></td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
