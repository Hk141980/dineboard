'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function RevenuePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getSuperAdminRevenue(), api.getSuperAdminCommissions()])
      .then(([rev, com]) => {
        setData({ ...rev.data, commissions: com.data || [] });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>💰 Platform Revenue</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subscription + Commission revenue</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <>
          <div className="grid-3" style={{ marginBottom: '28px' }}>
            {[
              { label: 'Subscription Revenue', value: `₹${(data?.subscriptionRevenue || 0).toLocaleString()}`, icon: '📋' },
              { label: 'Commission Revenue', value: `₹${(data?.commissionRevenue || 0).toLocaleString()}`, icon: '📈' },
              { label: 'Total Revenue', value: `₹${(data?.totalRevenue || 0).toLocaleString()}`, icon: '💰' },
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

          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '14px' }}>📋 Recent Commissions</h3>
          {data?.commissions?.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead><tr><th>Restaurant</th><th>Type</th><th>Transaction</th><th>Rate</th><th>Commission</th><th>Method</th><th>Status</th></tr></thead>
                <tbody>
                  {data.commissions.slice(0, 20).map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.tenant?.name || '—'}</td>
                      <td><span className="btn-tag">{c.type?.replace('_', ' ')}</span></td>
                      <td>₹{Number(c.transactionAmount).toLocaleString()}</td>
                      <td>{c.commissionRate}%</td>
                      <td style={{ fontWeight: 700, color: '#22c55e' }}>₹{Number(c.commissionAmount).toLocaleString()}</td>
                      <td><span className="btn-tag">{c.collectionMethod?.replace('_', ' ')}</span></td>
                      <td><span className={`status status-${c.status}`}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No commissions recorded yet</div>
          )}
        </>
      )}
    </>
  );
}
