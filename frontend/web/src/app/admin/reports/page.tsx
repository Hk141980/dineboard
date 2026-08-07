'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReport(); }, [period]);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await api.getReports({ period });
      if (res.success) setStats(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function getDisplayStats() {
    if (!stats) return { revenue: 0, orders: 0, bookings: 0, avgOrderValue: 0 };

    // The dashboard API returns { today: {...}, month: {...}, activeOrders, tables }
    // Map based on selected period
    if (period === 'today') {
      return {
        revenue: stats.today?.revenue || 0,
        orders: stats.today?.orders || 0,
        bookings: stats.today?.bookings || 0,
        avgOrderValue: stats.today?.orders > 0 ? Math.round((stats.today?.revenue || 0) / stats.today.orders) : 0,
      };
    } else {
      // week/month/year all use month data (best available)
      return {
        revenue: stats.month?.revenue || 0,
        orders: stats.month?.orders || 0,
        bookings: stats.month?.bookings || 0,
        avgOrderValue: stats.month?.orders > 0 ? Math.round((stats.month?.revenue || 0) / stats.month.orders) : 0,
      };
    }
  }

  function getTableStats() {
    if (!stats?.tables) return [];
    return Object.entries(stats.tables).map(([status, count]) => ({ status, count }));
  }

  async function exportPdf() {
    // Generate PDF client-side since we have the data
    const display = getDisplayStats();
    const tables = getTableStats();

    const printContent = `
      <html>
      <head>
        <title>DineBoard Report - ${period}</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #1a1a2e; }
          h1 { color: #FF6B35; border-bottom: 2px solid #FF6B35; padding-bottom: 12px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
          .stat-box { background: #f8f8fc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; }
          .stat-value { font-size: 1.8rem; font-weight: 800; color: #FF6B35; margin: 8px 0; }
          .stat-label { font-size: 0.85rem; color: #71717A; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px 14px; border: 1px solid #e5e7eb; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; }
          .footer { margin-top: 40px; text-align: center; color: #71717A; font-size: 0.8rem; }
        </style>
      </head>
      <body>
        <h1>📊 DineBoard Report — ${period.charAt(0).toUpperCase() + period.slice(1)}</h1>
        <p style="color: #71717A;">Generated on ${new Date().toLocaleString('en-IN')}</p>

        <div class="stats-grid">
          <div class="stat-box"><div class="stat-label">Total Revenue</div><div class="stat-value">₹${display.revenue.toLocaleString()}</div></div>
          <div class="stat-box"><div class="stat-label">Total Orders</div><div class="stat-value">${display.orders}</div></div>
          <div class="stat-box"><div class="stat-label">Total Bookings</div><div class="stat-value">${display.bookings}</div></div>
          <div class="stat-box"><div class="stat-label">Avg Order Value</div><div class="stat-value">₹${display.avgOrderValue.toLocaleString()}</div></div>
        </div>

        <h2>🪑 Table Status</h2>
        <table>
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>
            ${tables.map(t => `<tr><td style="text-transform: capitalize;">${t.status}</td><td>${t.count}</td></tr>`).join('')}
            ${tables.length === 0 ? '<tr><td colspan="2">No table data</td></tr>' : ''}
          </tbody>
        </table>

        ${stats?.activeOrders?.length > 0 ? `
          <h2>🛒 Active Orders</h2>
          <table>
            <thead><tr><th>Order Code</th><th>Customer</th><th>Status</th><th>Total</th><th>Table</th></tr></thead>
            <tbody>
              ${stats.activeOrders.map((o: any) => `
                <tr>
                  <td>${o.orderCode}</td>
                  <td>${o.customerName}</td>
                  <td style="text-transform: capitalize;">${o.status}</td>
                  <td>₹${Number(o.total).toLocaleString()}</td>
                  <td>${o.assignedTable?.name || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          <p>🍽️ DineBoard — Restaurant Management Platform</p>
          <p>This report was auto-generated. Data reflects real-time restaurant operations.</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  }

  const display = getDisplayStats();
  const tableStats = getTableStats();

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>📈 Reports & Analytics</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Track your restaurant performance</p>
        </div>
        <button className="btn-primary" onClick={exportPdf}>📄 Export PDF</button>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['today', 'week', 'month', 'year'].map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`btn-tag ${period === p ? 'active' : ''}`} style={{ textTransform: 'capitalize' }}>
            {p === 'today' ? 'Today' : `This ${p}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading report...</div>
      ) : stats ? (
        <>
          {/* Revenue Stats */}
          <div className="grid-4" style={{ marginBottom: '28px' }}>
            {[
              { label: 'Total Revenue', value: `₹${display.revenue.toLocaleString()}`, icon: '💰' },
              { label: 'Total Orders', value: display.orders, icon: '🛒' },
              { label: 'Total Bookings', value: display.bookings, icon: '📅' },
              { label: 'Avg Order Value', value: `₹${display.avgOrderValue.toLocaleString()}`, icon: '📊' },
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

          {/* Payment Method Breakdown (Cash vs Razorpay Gateway) */}
          <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <span>💳 Payment Method Breakdown (Cash vs Razorpay Gateway)</span>
              <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '12px', background: stats.paymentBreakdown?.usesOwnRazorpay ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: stats.paymentBreakdown?.usesOwnRazorpay ? '#60a5fa' : '#34d399', border: '1px solid currentColor' }}>
                {stats.paymentBreakdown?.usesOwnRazorpay ? '⚙️ Custom Owner Razorpay Account' : '🌐 DineBoard Platform Razorpay Gateway'}
              </span>
            </h3>
            <div className="grid-2" style={{ gap: '16px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>💵 Cash Paid Orders</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>
                  ₹{(stats.paymentBreakdown?.cashRevenue || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {stats.paymentBreakdown?.cashCount || 0} orders collected in cash
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>💳 Razorpay Gateway Paid Orders</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>
                  ₹{(stats.paymentBreakdown?.razorpayRevenue || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {stats.paymentBreakdown?.razorpayCount || 0} orders collected online via Razorpay
                </div>
              </div>
            </div>
          </div>

          {/* Table Status + Active Orders */}
          <div className="grid-2" style={{ marginBottom: '28px', gap: '20px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '16px' }}>🪑 Table Status</h3>
              {tableStats.length > 0 ? tableStats.map((t) => (
                <div key={t.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ textTransform: 'capitalize' }}>{t.status}</span>
                  <span style={{ fontWeight: 700 }}>{String(t.count)}</span>
                </div>
              )) : <div style={{ color: 'var(--text-muted)' }}>No data</div>}
            </div>
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '16px' }}>🔄 Active Orders</h3>
              {stats.activeOrders?.length > 0 ? stats.activeOrders.slice(0, 5).map((o: any) => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{o.orderCode}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.customerName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>₹{Number(o.total).toLocaleString()}</div>
                    <span style={{
                      fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px',
                      background: 'var(--primary-glow)', color: 'var(--primary)', textTransform: 'capitalize',
                    }}>{o.status}</span>
                  </div>
                </div>
              )) : <div style={{ color: 'var(--text-muted)' }}>No active orders</div>}
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>No report data available</div>
      )}
    </>
  );
}
