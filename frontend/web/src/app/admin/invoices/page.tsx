'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

function getApiUrl() {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '/api';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
}

export default function InvoicesManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await api.getOrders({ status: 'paid' });
      if (res.success) setOrders(res.data.orders || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const orderCode = (order.orderCode || '').toLowerCase();
    const customerName = (order.customerName || '').toLowerCase();
    const customerPhone = (order.customerPhone || '').toLowerCase();
    const invoiceNumber = (order.invoice?.invoiceNumber || '').toLowerCase();

    return (
      orderCode.includes(q) ||
      customerName.includes(q) ||
      customerPhone.includes(q) ||
      invoiceNumber.includes(q)
    );
  });

  async function generateInvoice(orderId: string) {
    try {
      const res = await api.generateInvoice(orderId);
      if (res.success) {
        await loadOrders(); // Reload to show generated invoice
      } else {
        alert(res.message || 'Error generating invoice');
      }
    } catch (e) { alert('Error generating invoice'); }
  }

  function viewInvoiceHtml(order: any) {
    const invoice = order.invoice;
    if (!invoice) return;

    // Get tenant info
    let tenant: any = {};
    try { tenant = JSON.parse(localStorage.getItem('tenant') || '{}'); } catch {}

    const items = order.orderItems || [];
    const invoiceHtml = `
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
          .invoice { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #FF6B35, #e05a2b); color: white; padding: 30px; text-align: center; }
          .header h1 { font-size: 1.6rem; margin-bottom: 4px; }
          .header p { opacity: 0.9; font-size: 0.85rem; }
          .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; margin-top: 10px; }
          .info { padding: 24px 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-bottom: 1px solid #eee; }
          .info-block label { display: block; font-size: 0.75rem; text-transform: uppercase; color: #999; margin-bottom: 4px; letter-spacing: 0.5px; }
          .info-block span { font-weight: 600; color: #333; }
          .items { padding: 0 30px; }
          .items table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items th { text-align: left; padding: 10px 8px; font-size: 0.8rem; text-transform: uppercase; color: #999; border-bottom: 2px solid #eee; }
          .items td { padding: 12px 8px; border-bottom: 1px solid #f0f0f0; color: #333; }
          .items .right { text-align: right; }
          .totals { padding: 0 30px 24px; }
          .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.9rem; color: #666; }
          .totals .row.grand { font-size: 1.2rem; font-weight: 800; color: #FF6B35; border-top: 2px solid #FF6B35; padding-top: 12px; margin-top: 8px; }
          .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; font-size: 0.8rem; color: #999; }
          .btn-bar { text-align: center; padding: 20px; }
          .btn { display: inline-block; padding: 10px 24px; background: #FF6B35; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; margin: 0 6px; text-decoration: none; }
          .btn:hover { opacity: 0.9; }
          .btn.sec { background: #555; }
          @media print { .btn-bar { display: none; } body { background: white; padding: 0; } .invoice { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="btn-bar">
          <button class="btn" onclick="window.print()">🖨️ Print / Save PDF</button>
          <button class="btn sec" onclick="window.close()">✖ Close</button>
        </div>
        <div class="invoice">
          <div class="header">
            <h1>${tenant.name || 'Restaurant'}</h1>
            <p>TAX INVOICE</p>
            <span class="badge">${invoice.invoiceNumber}</span>
          </div>
          <div class="info">
            <div>
              <div class="info-block"><label>Invoice Date</label><span>${new Date(invoice.generatedAt || invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
              <div class="info-block" style="margin-top:12px"><label>Order</label><span>${order.orderCode}</span></div>
              ${order.assignedTable ? `<div class="info-block" style="margin-top:12px"><label>Table</label><span>${order.assignedTable.name}</span></div>` : ''}
            </div>
            <div>
              <div class="info-block"><label>Customer</label><span>${order.customerName}</span></div>
              <div class="info-block" style="margin-top:12px"><label>Phone</label><span>${order.customerPhone}</span></div>
              ${tenant.gstNumber ? `<div class="info-block" style="margin-top:12px"><label>GSTIN</label><span>${tenant.gstNumber}</span></div>` : ''}
            </div>
          </div>
          <div class="items">
            <table>
              <thead>
                <tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Total</th></tr>
              </thead>
              <tbody>
                ${items.map((item: any) => `
                  <tr>
                    <td>${item.itemName || item.menuItem?.name || 'Item'}</td>
                    <td class="right">${item.quantity}</td>
                    <td class="right">₹${Number(item.itemPrice || item.menuItem?.price || 0).toFixed(2)}</td>
                    <td class="right">₹${Number(item.lineTotal || (item.quantity * (item.itemPrice || item.menuItem?.price || 0))).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="totals">
            <div class="row"><span>Subtotal</span><span>₹${Number(invoice.subtotal).toFixed(2)}</span></div>
            ${Number(order.discountAmount) > 0 ? `<div class="row"><span>Discount</span><span>-₹${Number(order.discountAmount).toFixed(2)}</span></div>` : ''}
            ${Number(invoice.cgst) > 0 ? `<div class="row"><span>CGST</span><span>₹${Number(invoice.cgst).toFixed(2)}</span></div>` : ''}
            ${Number(invoice.sgst) > 0 ? `<div class="row"><span>SGST</span><span>₹${Number(invoice.sgst).toFixed(2)}</span></div>` : ''}
            ${Number(invoice.igst) > 0 ? `<div class="row"><span>IGST</span><span>₹${Number(invoice.igst).toFixed(2)}</span></div>` : ''}
            <div class="row grand"><span>Grand Total</span><span>₹${Number(invoice.total).toFixed(2)}</span></div>
          </div>
          <div class="footer">
            <p>Thank you for dining with us! 🍽️</p>
            <p style="margin-top:4px">Powered by DineBoard</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(invoiceHtml);
      win.document.close();
    }
  }

  async function sendInvoice(orderId: string) {
    try {
      await api.sendInvoice(orderId);
      alert('Invoice sent to customer via WhatsApp!');
    } catch (e) { alert('Error sending invoice'); }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>🧾 Invoices & GST</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generate invoices with GST for paid orders</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--primary-glow)' }}>
        <span>💡</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          GST details are auto-filled from your restaurant settings. Go to Settings → GST to configure GSTIN, CGST & SGST rates.
        </span>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '450px' }}>
          <input
            type="text"
            placeholder="🔍 Search invoices by Invoice #, Order Code, Customer Name, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
            }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.9rem' }}>
            🔍
          </span>
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
                fontSize: '0.85rem',
              }}
            >
              ✖
            </button>
          )}
        </div>
        {searchQuery && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Found {filteredOrders.length} matching invoice{filteredOrders.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>No paid orders yet</div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          No invoices match "{searchQuery}"
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Invoice</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>{order.orderCode}</td>
                  <td>{order.customerName}<br /><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.customerPhone}</span></td>
                  <td>₹{Number(order.subtotal).toLocaleString()}</td>
                  <td>₹{Number(order.gstAmount).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>₹{Number(order.total).toLocaleString()}</td>
                  <td>
                    {order.invoice ? (
                      <span className="status status-active">{order.invoice.invoiceNumber}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not generated</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {!order.invoice ? (
                        <button onClick={() => generateInvoice(order.id)} className="btn-sm">⚡ Generate</button>
                      ) : (
                        <>
                          <button onClick={() => viewInvoiceHtml(order)} className="btn-sm" style={{ background: 'var(--primary)', color: '#fff' }}>👁️ View</button>
                          <button onClick={() => { viewInvoiceHtml(order); }} className="btn-sm">🖨️ Print</button>
                          <button onClick={() => sendInvoice(order.id)} className="btn-sm" style={{ background: '#25D366', color: '#fff' }}>📱 Send</button>
                        </>
                      )}
                    </div>
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
