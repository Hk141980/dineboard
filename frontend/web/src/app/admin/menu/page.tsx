'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface MenuItem {
  id: string; name: string; description: string; price: number; priceHalf?: number | null;
  category: string; isVeg: boolean; isAvailable: boolean; sortOrder: number; imageUrl?: string;
}

export default function MenuManagement() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', price: '', priceHalf: '', category: '', isVeg: true, isAvailable: true, sortOrder: 0, imageUrl: '',
  });

  useEffect(() => { loadMenu(); }, []);

  async function loadMenu() {
    try {
      const res = await api.getMenu();
      if (res.success) setItems(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const categories = ['all', ...new Set(items.map((i) => i.category))];
  const filtered = activeCategory === 'all' ? items : items.filter((i) => i.category === activeCategory);

  function openForm(item?: MenuItem) {
    if (item) {
      setEditing(item);
      setForm({
        name: item.name,
        description: item.description || '',
        price: String(item.price),
        priceHalf: item.priceHalf ? String(item.priceHalf) : '',
        category: item.category,
        isVeg: item.isVeg,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
        imageUrl: item.imageUrl || '',
      });
    } else {
      setEditing(null);
      setForm({ name: '', description: '', price: '', priceHalf: '', category: '', isVeg: true, isAvailable: true, sortOrder: 0, imageUrl: '' });
    }
    setShowForm(true);
  }

  async function handleImageUpload(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB.'); return; }
    setUploadingImage(true);
    try {
      const res = await api.uploadMenuImage(file);
      if (res.success) {
        setForm((prev) => ({ ...prev, imageUrl: res.data.imageUrl }));
      } else {
        alert(res.message || 'Image upload failed');
      }
    } catch { alert('Upload failed.'); }
    setUploadingImage(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price),
      priceHalf: form.priceHalf ? parseFloat(form.priceHalf) : null,
    };
    try {
      if (editing) {
        await api.updateMenuItem(editing.id, payload);
      } else {
        await api.createMenuItem(payload);
      }
      setShowForm(false);
      loadMenu();
    } catch (e) { alert('Error saving item'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return;
    try {
      await api.deleteMenuItem(id);
      loadMenu();
    } catch (e) { alert('Error deleting'); }
  }

  async function toggleAvailability(item: MenuItem) {
    await api.updateMenuItem(item.id, { isAvailable: !item.isAvailable });
    loadMenu();
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>🍽️ Menu Management</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{items.length} items · {categories.length - 1} categories</p>
        </div>
        <button className="btn-primary" onClick={() => openForm()}>+ Add Item</button>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={`btn-tag ${activeCategory === cat ? 'active' : ''}`}>
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading menu...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Item</th><th>Category</th><th>Price (Half / Full)</th><th>Type</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }}
                        />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, border: '1px solid var(--border)' }}>
                          🍲
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        {item.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td><span className="btn-tag">{item.category}</span></td>
                  <td style={{ fontWeight: 600 }}>
                    {item.priceHalf ? (
                      <div style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Half:</span> ₹{item.priceHalf}<br/>
                        <span style={{ color: 'var(--text-muted)' }}>Full:</span> ₹{item.price}
                      </div>
                    ) : (
                      <span>₹{item.price}</span>
                    )}
                  </td>
                  <td><span style={{ color: item.isVeg ? '#22c55e' : '#ef4444' }}>{item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}</span></td>
                  <td>
                    <button onClick={() => toggleAvailability(item)} className={`status ${item.isAvailable ? 'status-active' : 'status-inactive'}`} style={{ cursor: 'pointer', border: 'none' }}>
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openForm(item)} className="btn-sm">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="btn-sm btn-danger">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px' }}>
              {editing ? 'Edit Menu Item' : 'Add Menu Item'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Item Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="form-group">
                <label>Item Picture</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {form.imageUrl && (
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    style={{ fontSize: '0.8rem', flex: 1 }}
                  />
                </div>
                {uploadingImage && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px' }}>Uploading image...</div>}
                <input
                  type="text"
                  placeholder="Image path or URL (e.g. /api/uploads/s3/...)"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  style={{ marginTop: '8px', fontSize: '0.8rem' }}
                />
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Half Price (₹)</label>
                  <input type="number" placeholder="Optional (e.g. 100)" value={form.priceHalf} onChange={(e) => setForm({ ...form, priceHalf: e.target.value })} min="0" step="1" />
                </div>
                <div className="form-group">
                  <label>Full Price (₹) *</label>
                  <input type="number" placeholder="e.g. 170" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required min="0" step="1" />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required placeholder="e.g. Starters, Main Course" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={form.isVeg} onChange={(e) => setForm({ ...form, isVeg: e.target.checked })} />
                    Vegetarian
                  </label>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
                    Available
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Add Item'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
