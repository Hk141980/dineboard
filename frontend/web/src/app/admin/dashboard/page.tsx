'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('tenant');
    if (t) setTenant(JSON.parse(t));
    api.getDashboardStats().then((res) => {
      if (res.success) setStats(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleUpdateStatus(orderId: string, status: string) {
    setUpdatingStatus(true);
    try {
      const res = await api.updateOrderStatus(orderId, status);
      if (res.success) {
        const statsRes = await api.getDashboardStats();
        if (statsRes.success) {
          setStats(statsRes.data);
          const updated = statsRes.data.activeOrders?.find((o: any) => o.id === orderId);
          if (updated) setSelectedOrder(updated);
          else setSelectedOrder(null);
        }
      } else {
        alert(res.message || 'Error updating status');
      }
    } catch (e: any) { alert(e?.message || 'Error updating status'); }
    setUpdatingStatus(false);
  }

  const statCards = stats ? [
    { label: "Today's Orders", value: stats.today?.orders || 0, icon: '🛒', change: '+12%', positive: true },
    { label: "Today's Revenue", value: `₹${(stats.today?.revenue || 0).toLocaleString()}`, icon: '💰', change: '+8%', positive: true },
    { label: "Today's Bookings", value: stats.today?.bookings || 0, icon: '📅', change: '+5%', positive: true },
    { label: 'Active Orders', value: stats.activeOrders?.length || 0, icon: '🔥', change: 'Live', positive: true },
  ] : [];

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Welcome back, {tenant?.name || 'Restaurant Owner'}
          </p>
        </div>
        <span className="status status-active" style={{ padding: '6px 14px' }}>● {tenant?.status || 'Active'}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>Loading dashboard...</div>
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            {statCards.map((card, i) => (
              <div key={i} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-label">{card.label}</span>
                  <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                </div>
                <div className="stat-value">{card.value}</div>
                <div className={`stat-change ${card.positive ? 'positive' : 'negative'}`}>{card.change}</div>
              </div>
            ))}
          </div>

          {/* Table Status */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>🪑 Table Status</h3>
            <div className="grid-4" style={{ gap: '12px' }}>
              {Object.entries(stats?.tables || {}).map(([status, count]) => (
                <div key={status} className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`status status-${status}`}>{status}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>{count as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Orders */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>🔥 Active Orders</h3>
            {stats?.activeOrders?.length > 0 ? (
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead><tr><th>Order Code</th><th>Customer</th><th>Items</th><th>Total</th><th>Table</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {stats.activeOrders.map((order: any) => (
                      <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(order)}>
                        <td style={{ fontWeight: 600 }}>
                          <button
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', padding: 0, fontSize: 'inherit' }}
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                          >
                            {order.orderCode}
                          </button>
                        </td>
                        <td>{order.customerName}</td>
                        <td>{order.orderItems?.length || 0} items</td>
                        <td style={{ fontWeight: 600 }}>₹{Number(order.total).toLocaleString()}</td>
                        <td>{order.assignedTable?.name || '—'}</td>
                        <td><span className={`status status-${order.status}`}>{order.status}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-secondary"
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                            style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            👁️ View Order
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No active orders right now 🎉
              </div>
            )}
          </div>
        </>
      )}

      {/* View Order Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>
                  Order #{selectedOrder.orderCode}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Placed on {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button className="btn-secondary" onClick={() => setSelectedOrder(null)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Customer:</span>
                <strong>{selectedOrder.customerName} ({selectedOrder.customerPhone})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Table:</span>
                <strong>{selectedOrder.assignedTable?.name || 'Unassigned'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Status:</span>
                <span className={`status status-${selectedOrder.status}`} style={{ fontWeight: 700 }}>{selectedOrder.status}</span>
              </div>
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>
              Order Items ({selectedOrder.orderItems?.length || 0})
            </h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px', marginBottom: '16px', maxHeight: '240px', overflowY: 'auto' }}>
              {selectedOrder.orderItems?.map((item: any, idx: number) => {
                const isExtraItem = item.isExtra;
                const timeStr = item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={item.id || idx} style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '8px', background: isExtraItem ? 'rgba(255, 107, 53, 0.12)' : 'var(--bg-tertiary)', border: isExtraItem ? '1px solid rgba(255, 107, 53, 0.3)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.itemName} {item.portion ? `(${item.portion})` : ''}</span>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.92rem' }}>₹{Number(item.lineTotal || item.itemPrice * item.quantity).toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>₹{item.itemPrice} × {item.quantity}</span>
                      {isExtraItem ? (
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 107, 53, 0.25)', color: '#ff6b35', border: '1px solid rgba(255, 107, 53, 0.4)', fontWeight: 700 }}>
                          🔥 NEW ITEM (Send to Kitchen) · {timeStr}
                        </span>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                          📦 Initial Order · {timeStr}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', marginBottom: '20px', padding: '12px 16px', background: 'var(--primary-glow)', borderRadius: '10px' }}>
              <span>Total Amount</span>
              <span style={{ color: 'var(--primary)' }}>₹{Number(selectedOrder.total).toFixed(2)}</span>
            </div>

            {/* Quick Status Progression Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {selectedOrder.status === 'pending' && (
                <button className="btn-primary" onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')} disabled={updatingStatus}>
                  👨‍🍳 Mark Preparing
                </button>
              )}
              {selectedOrder.status === 'preparing' && (
                <button className="btn-primary" onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')} disabled={updatingStatus}>
                  🔔 Mark Ready
                </button>
              )}
              {selectedOrder.status === 'ready' && (
                <button className="btn-primary" onClick={() => handleUpdateStatus(selectedOrder.id, 'served')} disabled={updatingStatus}>
                  🍽️ Mark Served
                </button>
              )}
              {selectedOrder.status === 'served' && (
                <button className="btn-primary" onClick={() => handleUpdateStatus(selectedOrder.id, 'billed')} disabled={updatingStatus}>
                  🧾 Mark Billed
                </button>
              )}
              {selectedOrder.status === 'billed' && (
                <button className="btn-primary" onClick={() => handleUpdateStatus(selectedOrder.id, 'paid')} disabled={updatingStatus}>
                  💰 Mark Paid (Cash)
                </button>
              )}
              <a href="/admin/orders" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                ➡️ Full Orders Page
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
