'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

// Sidebar Navigation
function Sidebar({ activePath }: { activePath: string }) {
  const menuItems = [
    { icon: '📊', label: 'Dashboard', href: '/admin/dashboard' },
    { icon: '🍽️', label: 'Menu', href: '/admin/menu' },
    { icon: '🪑', label: 'Tables', href: '/admin/tables' },
    { icon: '📅', label: 'Bookings', href: '/admin/bookings' },
    { icon: '🛒', label: 'Orders', href: '/admin/orders' },
    { icon: '👨‍🍳', label: 'Staff', href: '/admin/staff' },
    { icon: '🎫', label: 'Promos', href: '/admin/promos' },
    { icon: '🧾', label: 'Invoices', href: '/admin/invoices' },
    { icon: '📈', label: 'Reports', href: '/admin/reports' },
    { icon: '🤖', label: 'AI Logs', href: '/admin/ai-logs' },
    { icon: '⚙️', label: 'Settings', href: '/admin/settings' },
  ];

  return (
    <div className="admin-sidebar">
      <Link href="/" style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '0 24px', marginBottom: '32px',
      }}>
        <span style={{ fontSize: '1.5rem' }}>🍽️</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800,
          background: 'linear-gradient(135deg, var(--primary), var(--accent-light))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>DineBoard</span>
      </Link>

      <nav>
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 24px', margin: '2px 8px', borderRadius: '10px',
            fontSize: '0.9rem', fontWeight: activePath === item.href ? 600 : 400,
            color: activePath === item.href ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: activePath === item.href ? 'var(--primary-glow)' : 'transparent',
            borderLeft: activePath === item.href ? '3px solid var(--primary)' : '3px solid transparent',
            transition: 'all 0.2s ease',
          }}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

// Dashboard Page
export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    const t = localStorage.getItem('tenant');
    if (t) setTenant(JSON.parse(t));

    api.getDashboardStats().then((res) => {
      if (res.success) setStats(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: "Today's Orders", value: stats.today?.orders || 0, icon: '🛒', change: '+12%', positive: true },
    { label: "Today's Revenue", value: `₹${(stats.today?.revenue || 0).toLocaleString()}`, icon: '💰', change: '+8%', positive: true },
    { label: "Today's Bookings", value: stats.today?.bookings || 0, icon: '📅', change: '+5%', positive: true },
    { label: 'Active Orders', value: stats.activeOrders?.length || 0, icon: '🔥', change: 'Live', positive: true },
  ] : [];

  const monthCards = stats ? [
    { label: 'Monthly Orders', value: stats.month?.orders || 0 },
    { label: 'Monthly Revenue', value: `₹${(stats.month?.revenue || 0).toLocaleString()}` },
    { label: 'Monthly Bookings', value: stats.month?.bookings || 0 },
  ] : [];

  return (
    <div className="admin-layout">
      <Sidebar activePath="/admin/dashboard" />
      <div className="admin-main">
        <div className="admin-header">
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Welcome back, {tenant?.name || 'Restaurant Owner'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="status status-active" style={{ padding: '6px 14px' }}>
              ● {tenant?.status || 'Active'}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            Loading dashboard...
          </div>
        ) : (
          <>
            {/* Today's Stats */}
            <div className="grid-4" style={{ marginBottom: '24px' }}>
              {statCards.map((card, i) => (
                <div key={i} className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="stat-label">{card.label}</span>
                    <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                  </div>
                  <div className="stat-value">{card.value}</div>
                  <div className={`stat-change ${card.positive ? 'positive' : 'negative'}`}>
                    {card.change}
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly Stats */}
            <div className="grid-3" style={{ marginBottom: '32px' }}>
              {monthCards.map((card, i) => (
                <div key={i} className="stat-card" style={{ borderLeft: '3px solid var(--accent)' }}>
                  <span className="stat-label">{card.label}</span>
                  <div className="stat-value" style={{ fontSize: '1.6rem' }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Table Status */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700,
                marginBottom: '16px',
              }}>
                🪑 Table Status
              </h3>
              <div className="grid-4" style={{ gap: '12px' }}>
                {Object.entries(stats?.tables || {}).map(([status, count]) => (
                  <div key={status} className="card" style={{
                    padding: '16px 20px', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span className={`status status-${status}`}>{status}</span>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
                    }}>{count as number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Orders */}
            <div>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700,
                marginBottom: '16px',
              }}>
                🔥 Active Orders
              </h3>
              {stats?.activeOrders?.length > 0 ? (
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order Code</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Table</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.activeOrders.map((order: any) => (
                        <tr key={order.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.orderCode}</td>
                          <td>{order.customerName}</td>
                          <td>{order.orderItems?.length || 0} items</td>
                          <td style={{ fontWeight: 600 }}>₹{Number(order.total).toLocaleString()}</td>
                          <td>{order.assignedTable?.name || '—'}</td>
                          <td><span className={`status status-${order.status}`}>{order.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card" style={{
                  textAlign: 'center', padding: '40px', color: 'var(--text-muted)',
                }}>
                  No active orders right now 🎉
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
