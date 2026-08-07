'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function PaymentSettlementsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [notes, setNotes] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [sumRes, histRes] = await Promise.all([
        api.getTodaySettlement(),
        api.getSettlementHistory(),
      ]);
      if (sumRes.success) setSummary(sumRes.data);
      if (histRes.success) setHistory(histRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleSettleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSettling(true);
    try {
      const res = await api.performSettlement({ notes });
      if (res.success) {
        alert(res.message || 'Settlement completed!');
        setShowModal(false);
        setNotes('');
        await loadData();
      } else {
        alert(res.message || 'Error completing settlement');
      }
    } catch (e: any) {
      alert(e?.message || 'Error completing settlement');
    }
    setSettling(false);
  }

  const [transferringId, setTransferringId] = useState<string | null>(null);

  async function handleBankPayout(settlementId: string) {
    setTransferringId(settlementId);
    try {
      const res = await api.settleBankPayout(settlementId);
      if (res.success) {
        alert(res.message || 'Online funds successfully transferred to bank account!');
        await loadData();
      } else {
        alert(res.message || 'Error processing bank payout');
      }
    } catch (e: any) {
      alert(e?.message || 'Error processing bank payout');
    }
    setTransferringId(null);
  }

  function printBankReceipt(item: any) {
    let tenant: any = {};
    try { tenant = JSON.parse(localStorage.getItem('tenant') || '{}'); } catch {}

    const html = `
      <html>
      <head>
        <title>Bank Payout Receipt ${item.bankSettlementId || item.settlementCode}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; background: #f8fafc; color: #1e293b; }
          .voucher { max-width: 550px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #cbd5e1; }
          .v-header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 24px; text-align: center; }
          .v-header h1 { font-size: 1.4rem; margin-bottom: 4px; }
          .v-header p { opacity: 0.9; font-size: 0.85rem; }
          .badge { display: inline-block; background: rgba(255,255,255,0.25); padding: 4px 14px; border-radius: 20px; font-size: 0.8rem; margin-top: 8px; font-weight: 700; }
          .body { padding: 24px; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
          .row.highlight { background: #eff6ff; padding: 12px; border-radius: 8px; border-bottom: none; margin: 12px 0; }
          .row.highlight span { font-weight: 700; color: #1e40af; }
          .row.highlight .amount { font-size: 1.3rem; font-weight: 800; color: #2563eb; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 0.8rem; color: #64748b; border-top: 1px solid #e2e8f0; }
          .btn-bar { text-align: center; padding-bottom: 20px; }
          .btn { padding: 10px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
          @media print { .btn-bar { display: none; } body { background: white; padding: 0; } .voucher { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="btn-bar"><button class="btn" onclick="window.print()">🖨️ Print Bank Settlement Receipt</button></div>
        <div class="voucher">
          <div class="v-header">
            <h1>${tenant.name || 'Restaurant'}</h1>
            <p>RAZORPAY ONLINE BANK SETTLEMENT RECEIPT</p>
            <span class="badge">STATUS: TRANSFERRED TO BANK</span>
          </div>
          <div class="body">
            <div class="row"><span>Settlement Code:</span><strong>${item.settlementCode}</strong></div>
            <div class="row"><span>Razorpay Transfer ID:</span><span style="font-family:monospace; font-weight:700;">${item.bankSettlementId || 'set_live_payout'}</span></div>
            <div class="row"><span>Bank UTR Reference:</span><span style="font-family:monospace; font-weight:700; color:#059669;">${item.utrNumber || 'UTR-908172635412'}</span></div>
            <div class="row"><span>Transfer Date:</span><span>${new Date(item.bankSettledAt || item.settlementDate || item.createdAt).toLocaleString('en-IN')}</span></div>
            <div class="row"><span>Orders Covered:</span><span>${item.orderCount} orders</span></div>
            
            <div class="row highlight">
              <span>Transferred Amount:</span>
              <span class="amount">Rs. ${Number(item.razorpayTotal).toLocaleString()}</span>
            </div>

            <div style="font-size:0.8rem; color:#64748b; margin-top:12px;">
              ✔ Funds transferred via Razorpay Instant Payouts directly to connected bank account.
            </div>
          </div>
          <div class="footer">
            <p>DineBoard Restaurant Platform · Official Payment Settlement Voucher</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  function printSettlement(item: any) {
    let tenant: any = {};
    try { tenant = JSON.parse(localStorage.getItem('tenant') || '{}'); } catch {}

    const html = `
      <html>
      <head>
        <title>Settlement ${item.settlementCode}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; background: #fff; color: #1a1a2e; }
          .receipt { max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 24px; borderRadius: 12px; }
          h2 { color: #FF6B35; text-align: center; margin-bottom: 4px; }
          p { text-align: center; color: #64748b; font-size: 0.85rem; margin-bottom: 16px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 0.95rem; }
          .total { font-weight: 800; font-size: 1.2rem; border-top: 2px solid #1a1a2e; border-bottom: none; margin-top: 12px; padding-top: 12px; }
          .btn-print { text-align: center; margin-top: 20px; }
          button { padding: 8px 20px; background: #FF6B35; color: white; border: none; borderRadius: 6px; cursor: pointer; font-weight: 600; }
          @media print { .btn-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="btn-print"><button onclick="window.print()">🖨️ Print Settlement Slip</button></div>
        <div class="receipt">
          <h2>${tenant.name || 'Restaurant'}</h2>
          <p>DAILY PAYMENT SETTLEMENT SLIP</p>
          <div class="row"><span>Settlement Code:</span><strong>${item.settlementCode}</strong></div>
          <div class="row"><span>Date:</span><span>${new Date(item.settlementDate || item.createdAt).toLocaleDateString('en-IN')}</span></div>
          <div class="row"><span>Orders Settled:</span><span>${item.orderCount} orders</span></div>
          <div class="row"><span>Settled By:</span><span>${item.settledBy || 'Admin'}</span></div>
          <div class="row" style="margin-top:12px;"><span>💵 Cash Total:</span><span>Rs. ${Number(item.cashTotal).toLocaleString()}</span></div>
          <div class="row"><span>💳 Razorpay Gateway Total:</span><span>Rs. ${Number(item.razorpayTotal).toLocaleString()}</span></div>
          <div class="row total"><span>💰 Grand Total:</span><span>Rs. ${Number(item.grandTotal).toLocaleString()}</span></div>
          ${item.notes ? `<div style="margin-top:16px; font-size:0.85rem; color:#64748b;"><strong>Notes:</strong> ${item.notes}</div>` : ''}
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>💰 Payment Settlements</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Daily cash & online payment register closure</p>
        </div>
        <a href="/admin/settings?tab=payment" className="btn-secondary" style={{ padding: '8px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
          🏦 Configure Bank Account Details
        </a>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading settlements...</div>
      ) : (
        <>
          {/* Today's Settlement Card */}
          <div className="card" style={{ padding: '24px', marginBottom: '28px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
                  Today's Register Summary ({summary?.date})
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Total collected across paid orders today
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {summary?.hasUnsettledNewOrders && (
                  <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    🟠 {summary.newOrdersCount} New Paid Order(s) (+₹{Number(summary.newOrdersAmount).toFixed(2)})
                  </span>
                )}
                {summary?.isSettled && !summary?.hasUnsettledNewOrders && (
                  <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600, fontSize: '0.85rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    ✅ Today Settled ({summary.latestSettlement?.settlementCode})
                  </span>
                )}
                <button
                  className="btn-primary"
                  onClick={() => setShowModal(true)}
                  disabled={summary?.orderCount === 0}
                  style={{ padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  {summary?.latestSettlement ? '⚡ Update Today Settlement' : '⚡ Perform Settlement (EOD Closure)'}
                </button>
              </div>
            </div>

            <div className="grid-3" style={{ gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>💵 Cash In Register</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
                  ₹{Number(summary?.cashTotal || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Counter Cash</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>💳 Own Razorpay Gateway</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa' }}>
                  ₹{Number(summary?.ownRazorpayTotal || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '4px' }}>✔ Auto-settled to Bank by Razorpay</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🏛️ Master Razorpay (DineBoard)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a78bfa' }}>
                  ₹{Number(summary?.masterRazorpayTotal || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#a78bfa', marginTop: '4px' }}>⚡ Payout via DineBoard to Bank</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>💰 Total Revenue Today</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{Number(summary?.grandTotal || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>{summary?.orderCount || 0} paid orders</div>
              </div>
            </div>
          </div>

          {/* Settlement History */}
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '16px' }}>📋 Settlement History</h3>

          {history.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
              No settlement records found. Click ⚡ Perform Settlement to record daily register closure.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Settlement #</th>
                    <th>Date</th>
                    <th>Cash Total</th>
                    <th>Razorpay Total</th>
                    <th>Grand Total</th>
                    <th>Orders</th>
                    <th>Settled By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.settlementCode}</td>
                      <td>{new Date(item.settlementDate || item.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>₹{Number(item.cashTotal).toFixed(2)}</td>
                      <td style={{ color: '#60a5fa', fontWeight: 600 }}>₹{Number(item.razorpayTotal).toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>₹{Number(item.grandTotal).toFixed(2)}</td>
                      <td>{item.orderCount} orders</td>
                      <td>{item.settledBy || 'Admin'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button className="btn-sm" onClick={() => printSettlement(item)} style={{ background: 'var(--primary)', color: '#fff' }}>
                            🖨️ Slip
                          </button>
                          {(() => {
                            const razorTotal = Number(item.razorpayTotal || 0);
                            const bankSettled = Number(item.bankSettledAmount || (item.bankSettlementStatus === 'transferred' ? razorTotal : 0));
                            const remaining = razorTotal - bankSettled;

                            if (razorTotal <= 0) return null;

                            if (remaining > 0) {
                              return (
                                <button
                                  className="btn-sm"
                                  onClick={() => handleBankPayout(item.id)}
                                  disabled={transferringId === item.id}
                                  style={{ background: '#3B82F6', color: '#fff' }}
                                  title={bankSettled > 0 ? `Transferred ₹${bankSettled.toFixed(2)} previously. Settle remaining ₹${remaining.toFixed(2)}` : 'Settle online Razorpay funds directly to bank account'}
                                >
                                  {transferringId === item.id ? 'Transferring...' : bankSettled > 0 ? `🏦 Settle Remaining ₹${remaining.toFixed(2)}` : '🏦 Settle Online to Bank'}
                                </button>
                              );
                            } else {
                              return (
                                <button className="btn-sm" onClick={() => printBankReceipt(item)} style={{ background: '#10B981', color: '#fff' }} title={`All ₹${bankSettled.toFixed(2)} Transferred via UTR: ${item.utrNumber || 'N/A'}`}>
                                  🏦 Bank Receipt
                                </button>
                              );
                            }
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Perform Settlement Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>
              ⚡ Confirm End-of-Day Settlement
            </h2>

            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>💵 Cash in Register:</span>
                <strong>₹{summary?.cashTotal?.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>💳 Razorpay Gateway:</span>
                <strong>₹{summary?.razorpayTotal?.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', fontSize: '1.05rem' }}>
                <span>💰 Total Revenue:</span>
                <strong style={{ color: 'var(--primary)' }}>₹{summary?.grandTotal?.toLocaleString()} ({summary?.orderCount} orders)</strong>
              </div>
            </div>

            <form onSubmit={handleSettleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Settlement Notes / Register Remarks (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cash drawer balanced. Cash deposited in safe."
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" disabled={settling} style={{ flex: 1, padding: '12px', fontWeight: 600 }}>
                  {settling ? 'Processing...' : '✅ Complete Settlement'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ padding: '12px 20px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
