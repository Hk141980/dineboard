'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Table {
  id: string; name: string; capacity: number; section: string;
  isActive: boolean; status: string;
}

export default function TablesManagement() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Table | null>(null);
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);
  const [tenantSlug, setTenantSlug] = useState('restro');
  const [form, setForm] = useState({ name: '', capacity: '2', section: 'Indoor', isActive: true });

  useEffect(() => {
    loadTables();
    api.getRestaurantSettings().then((res) => {
      if (res.success && res.data?.slug) setTenantSlug(res.data.slug);
    }).catch(() => {});
  }, []);

  async function loadTables() {
    try {
      const res = await api.getTables();
      if (res.success) setTables(Array.isArray(res.data) ? res.data : (res.data?.tables || []));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function openForm(table?: Table) {
    if (table) {
      setEditing(table);
      setForm({ name: table.name, capacity: String(table.capacity), section: table.section, isActive: table.isActive });
    } else {
      setEditing(null);
      setForm({ name: '', capacity: '2', section: 'Indoor', isActive: true });
    }
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, name: form.name.trim(), capacity: parseInt(form.capacity) };
    try {
      const res = editing
        ? await api.updateTable(editing.id, payload)
        : await api.createTable(payload);
      if (res.success) {
        setShowForm(false);
        loadTables();
      } else {
        alert(res.message || 'Error saving table');
      }
    } catch (e: any) {
      alert(e?.message || 'Error saving table');
    }
  }

  async function changeStatus(id: string, status: string) {
    await api.updateTableStatus(id, status);
    loadTables();
  }

  const statusColors: Record<string, string> = {
    available: '#22c55e', occupied: '#ef4444', reserved: '#f59e0b', cleaning: '#6366f1',
  };

  const sections = [...new Set(tables.map((t) => t.section))];

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>🪑 Table Management</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {tables.length} tables · {tables.filter((t) => t.status === 'available').length} available
          </p>
        </div>
        <button className="btn-primary" onClick={() => openForm()}>+ Add Table</button>
      </div>

      {/* Status Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['available', 'occupied', 'reserved', 'cleaning'].map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: statusColors[s] }}></span>
            <span style={{ textTransform: 'capitalize' }}>{s} ({tables.filter((t) => t.status === s).length})</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading tables...</div>
      ) : tables.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', margin: '20px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🪑</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No Tables Added Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
            Get started by adding dining tables for your restaurant.
          </p>
          <button className="btn-primary" onClick={() => openForm()}>+ Add Table</button>
        </div>
      ) : (
        <>
          {sections.map((section) => (
            <div key={section} style={{ marginBottom: '28px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
                {section}
              </h3>
              <div className="grid-4" style={{ gap: '12px' }}>
                {tables.filter((t) => t.section === section).map((table) => (
                  <div key={table.id} className="card" style={{
                    padding: '20px', borderLeft: `4px solid ${statusColors[table.status] || '#666'}`,
                    opacity: table.isActive ? 1 : 0.5,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{table.name}</span>
                      <span className={`status status-${table.status}`}>{table.status}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      👥 Seats {table.capacity}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <select value={table.status} onChange={(e) => changeStatus(table.id, e.target.value)}
                        style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="reserved">Reserved</option>
                        <option value="cleaning">Cleaning</option>
                      </select>
                      <button onClick={() => setQrModalTable(table)} className="btn-sm" style={{ background: 'rgba(255, 107, 53, 0.15)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>📱 QR</button>
                      <button onClick={() => openForm(table)} className="btn-sm">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px' }}>
              {editing ? 'Edit Table' : 'Add Table'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Table Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Table 1, VIP Booth" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Capacity *</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required min="1" max="50" />
                </div>
                <div className="form-group">
                  <label>Section *</label>
                  <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
                    <option>Indoor</option><option>Outdoor</option><option>Rooftop</option><option>Private</option><option>Bar</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  Table is active
                </label>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Add Table'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalTable && (
        <div className="modal-overlay" onClick={() => setQrModalTable(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
              📱 {qrModalTable.name} QR Code
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {qrModalTable.section} · Seats {qrModalTable.capacity}
            </p>

            {(() => {
              const token = typeof btoa !== 'undefined'
                ? 'tbl_' + btoa(JSON.stringify({ id: qrModalTable.id })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                : qrModalTable.id;
              const customerUrl = typeof window !== 'undefined'
                ? `${window.location.protocol}//${window.location.host}/customer.html?r=${tenantSlug}&t=${token}`
                : '';
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(customerUrl)}`;
              return (
                <div>
                  <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', display: 'inline-block', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', marginBottom: '16px' }}>
                    <img src={qrImageUrl} alt={`${qrModalTable.name} QR Code`} style={{ width: '200px', height: '200px', display: 'block' }} />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', wordBreak: 'break-all', marginBottom: '20px', border: '1px solid var(--border)' }}>
                    🔗 {customerUrl}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Print QR - ${qrModalTable.name}</title>
                                <style>
                                  body { font-family: sans-serif; text-align: center; padding: 40px; background: #fff; }
                                  .card { border: 3px solid #ff6b35; padding: 32px; border-radius: 24px; display: inline-block; max-width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                                  h1 { margin: 0 0 6px; font-size: 26px; color: #111; }
                                  h3 { margin: 0 0 16px; font-size: 16px; color: #ff6b35; }
                                  p { margin: 0 0 20px; color: #555; font-size: 14px; line-height: 1.4; }
                                  img { width: 220px; height: 220px; border-radius: 12px; }
                                  .footer { margin-top: 20px; font-size: 13px; font-weight: bold; color: #666; border-top: 1px solid #eee; padding-top: 12px; }
                                </style>
                              </head>
                              <body onload="window.print();window.close();">
                                <div class="card">
                                  <h1>DineBoard</h1>
                                  <h3>${qrModalTable.name}</h3>
                                  <p>Scan with your camera to view menu & order directly from this table!</p>
                                  <img src="${qrImageUrl}" />
                                  <div class="footer">${qrModalTable.section} Section · Seats ${qrModalTable.capacity}</div>
                                </div>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }}
                    >
                      🖨️ Print QR Code
                    </button>
                    <button className="btn-secondary" onClick={() => setQrModalTable(null)}>Close</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
