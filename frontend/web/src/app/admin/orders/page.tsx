'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function OrdersManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    loadOrders(false);

    // Auto-refresh orders list silently every 15 seconds so new orders show up live
    const interval = setInterval(() => {
      loadOrders(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [statusFilter]);

  async function loadOrders(isBackground = false) {
    if (!isBackground) setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all' && statusFilter !== 'repeat') params.status = statusFilter;
      const res = await api.getOrders(params);
      if (res.success) setOrders(res.data.orders || []);
    } catch (e) { console.error(e); }
    if (!isBackground) setLoading(false);
  }

  const filteredOrders = orders.filter((o) => {
    // 1. Status Filter
    if (statusFilter === 'repeat') {
      if (!o.isRepeat) return false;
    } else if (statusFilter !== 'all') {
      if (o.status !== statusFilter) return false;
    }

    // 2. Search Query Filter
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const matchCode = o.orderCode?.toLowerCase().includes(q);
    const matchCustomer = o.customerName?.toLowerCase().includes(q);
    const matchPhone = o.customerPhone?.toLowerCase().includes(q);
    const matchTable = o.assignedTable?.name?.toLowerCase().includes(q);
    const matchItems = o.orderItems?.some((item: any) => item.itemName?.toLowerCase().includes(q));
    const matchNote = o.note?.toLowerCase().includes(q);

    return matchCode || matchCustomer || matchPhone || matchTable || matchItems || matchNote;
  });

  const STATUS_STAGES: Record<string, number> = {
    pending: 1,
    preparing: 2,
    ready: 3,
    served: 4,
    billed: 5,
    paid: 6,
    cancelled: 99,
  };

  async function updateStatus(id: string, status: string) {
    try {
      const res = await api.updateOrderStatus(id, status);
      if (res.success) {
        loadOrders(true);
      } else {
        alert(res.message || 'Error updating order status');
      }
    } catch (e: any) { alert(e?.message || 'Error updating status'); }
  }

  async function sendBill(id: string) {
    try {
      const res = await api.sendBill(id);
      if (res.success) {
        const link = res.data?.paymentLink || '';
        alert(`Payment link sent to customer via WhatsApp!${link ? `\nLink: ${link}` : ''}`);
        loadOrders(true);
      } else {
        alert(res.message || 'Error sending payment link');
      }
    } catch (e) { alert('Error sending payment link'); }
  }

  const statuses = ['all', 'pending', 'repeat', 'preparing', 'ready', 'served', 'billed', 'paid'];

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
            🛒 Orders
            <span style={{ fontSize: '0.75rem', fontWeight: 500, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
              Live 15s Auto-Update
            </span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`btn-tag ${statusFilter === s ? 'active' : ''}`}>
              {s === 'all' ? 'All' : s === 'repeat' ? '🔄 Repeat / Extra' : s}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="🔍 Search order code, customer, phone, table, items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 34px 9px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          {searchQuery ? `No orders matching "${searchQuery}"` : 'No orders found'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Table</th><th>Source</th><th>Status</th><th style={{ width: '250px' }}>Actions</th></tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isPaid = order.status === 'paid';
                const isCancelled = order.status === 'cancelled';
                const isMerged = isCancelled && order.note && order.note.includes('Merged');
                const currentStage = STATUS_STAGES[order.status] || 0;

                return (
                  <tr key={order.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setSelectedOrder(order)}>
                          {order.orderCode}
                        </span>
                        {isMerged ? (
                          <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                            🔀 {order.note}
                          </span>
                        ) : order.isRepeat ? (
                          <span className="status status-preparing" style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}>
                            🔄 Extra
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div>{order.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.customerPhone}</div>
                    </td>
                    <td>{order.orderItems?.length || 0} items</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(order.total).toLocaleString()}</td>
                    <td>{order.assignedTable?.name || '—'}</td>
                    <td><span className="btn-tag">{order.source}</span></td>
                    <td>
                      {isMerged ? (
                        <div>
                          <span className="status" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                            🔀 Merged
                          </span>
                        </div>
                      ) : (
                        <span className={`status status-${order.status}`}>{order.status}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                        <select
                          value={order.status}
                          disabled={isPaid || isCancelled}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          style={{
                            width: 'auto',
                            minWidth: '95px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: (isPaid || isCancelled) ? 'rgba(255,255,255,0.05)' : 'var(--bg-secondary)',
                            color: (isPaid || isCancelled) ? 'var(--text-muted)' : 'var(--text-primary)',
                            fontSize: '0.78rem',
                            cursor: (isPaid || isCancelled) ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {statuses.filter((s) => s !== 'all').map((s) => {
                            const stage = STATUS_STAGES[s] || 0;
                            const isDisabled = stage < currentStage && s !== 'cancelled';
                            return (
                              <option key={s} value={s} disabled={isDisabled}>
                                {s}{isDisabled ? ' (passed)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        {!isPaid && !isCancelled && (
                          <button
                            onClick={() => sendBill(order.id)}
                            className="btn-sm"
                            style={{ background: 'var(--primary)', color: '#fff', whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.78rem' }}
                            title="Generate and send payment link via SMS & WhatsApp"
                          >
                            💳 Send Payment Link
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>
              Order {selectedOrder.orderCode}
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
              <p><strong>Phone:</strong> {selectedOrder.customerPhone}</p>
              <p><strong>Source:</strong> {selectedOrder.source}</p>
              <p><strong>Table:</strong> {selectedOrder.assignedTable?.name || 'Not assigned'}</p>
              {selectedOrder.note && <p><strong>Note:</strong> {selectedOrder.note}</p>}
            </div>
            <h3 style={{ marginBottom: '10px', fontSize: '0.95rem' }}>Items</h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
              <table className="data-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {selectedOrder.orderItems?.map((item: any, idx: number) => {
                    const isExtraItem = item.isExtra;
                    const timeStr = item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <tr key={item.id || idx} style={isExtraItem ? { background: 'rgba(255, 107, 53, 0.12)' } : {}}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600 }}>{item.itemName}</span>
                            {isExtraItem ? (
                              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 107, 53, 0.25)', color: '#ff6b35', border: '1px solid rgba(255, 107, 53, 0.5)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                🔥 NEW ITEM (Send to Kitchen) · {timeStr}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                                📦 Initial Order · {timeStr}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{item.quantity}</td>
                        <td>₹{item.itemPrice}</td>
                        <td style={{ fontWeight: 600 }}>₹{item.lineTotal || (item.itemPrice * item.quantity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid var(--border)' }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>₹{Number(selectedOrder.total).toLocaleString()}</span>
            </div>
            {selectedOrder.promoCodeUsed && <p style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>Promo: {selectedOrder.promoCodeUsed}</p>}
            
            {selectedOrder.status !== 'paid' && selectedOrder.status !== 'cancelled' && (
              <button
                className="btn-primary"
                onClick={() => { sendBill(selectedOrder.id); setSelectedOrder(null); }}
                style={{ width: '100%', marginTop: '16px', padding: '12px', fontWeight: 600 }}
              >
                💳 Send Payment Link (SMS & WhatsApp)
              </button>
            )}

            <button className="btn-secondary" onClick={() => setSelectedOrder(null)} style={{ width: '100%', marginTop: '8px' }}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
