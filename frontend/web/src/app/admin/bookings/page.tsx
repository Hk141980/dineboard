'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function BookingsManagement() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { loadBookings(); }, [dateFilter, statusFilter]);

  async function loadBookings() {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFilter) params.date = dateFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.getBookings(params);
      if (res.success) setBookings(res.data.bookings || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.updateBookingStatus(id, status);
      loadBookings();
    } catch (e) { alert('Error updating status'); }
  }

  const statusCounts = {
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    'no-show': bookings.filter((b) => b.status === 'no-show').length,
  };

  return (
    <>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>📅 Bookings</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{bookings.length} bookings found</p>
        </div>
        
        {/* Restaurant Public Online Booking Link Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '10px 16px', borderRadius: '14px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>🔗 Customer Booking Link:</span>
          <code style={{ fontSize: '0.78rem', background: 'rgba(0, 0, 0, 0.4)', padding: '4px 10px', borderRadius: '8px', color: '#10b981', fontFamily: 'monospace' }}>
            http://localhost:3000/booking.html?r=restro
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText('http://localhost:3000/booking.html?r=restro');
              alert('✅ Booking link copied to clipboard!');
            }}
            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
          >
            📋 Copy Link
          </button>
          <a
            href="http://localhost:3000/booking.html?r=restro"
            target="_blank"
            rel="noreferrer"
            style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}
          >
            🔗 Open Link
          </a>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        {['all', 'confirmed', 'completed', 'cancelled', 'no-show'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`btn-tag ${statusFilter === s ? 'active' : ''}`}>
            {s === 'all' ? 'All' : s} {s !== 'all' ? `(${statusCounts[s as keyof typeof statusCounts] || 0})` : ''}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: '24px', gap: '12px' }}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label" style={{ textTransform: 'capitalize' }}>{status}</span>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>{count}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          No bookings for this date
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Booking</th><th>Customer</th><th>Date & Time</th><th>Guests</th><th>Tables</th><th>Source</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.bookingCode}</td>
                  <td>
                    <div>{b.customerName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.customerPhone}</div>
                  </td>
                  <td>
                    <div>{new Date(b.bookingDate).toLocaleDateString('en-IN')}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.bookingTime} — {b.endTime}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{b.guests}</td>
                  <td>
                    {b.bookingTables?.map((bt: any) => (
                      <span key={bt.id} className="btn-tag" style={{ margin: '2px' }}>{bt.table?.name}</span>
                    ))}
                  </td>
                  <td><span className="btn-tag">{b.source}</span></td>
                  <td><span className={`status status-${b.status}`}>{b.status}</span></td>
                  <td>
                    <select value={b.status} onChange={(e) => updateStatus(b.id, e.target.value)}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no-show">No Show</option>
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
