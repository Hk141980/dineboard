'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AiLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    api.getAiLogs().then((res) => {
      if (res.success) {
        const logArray = Array.isArray(res.data) ? res.data : (res.data?.logs || []);
        setLogs(logArray);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const intentColors: Record<string, string> = {
    place_order: '#22c55e', book_table: '#3b82f6', request_bill: '#f59e0b',
    view_menu: '#8b5cf6', add_to_order: '#06b6d4', restaurant_info: '#6366f1',
    recommend_food: '#ec4899', general_chat: '#6b7280', owner_report: '#ef4444',
  };

  const safeLogs = Array.isArray(logs) ? logs : [];

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>🤖 AI Chatbot Logs</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{safeLogs.length} conversations logged</p>
        </div>
      </div>

      {/* Intent Breakdown */}
      <div className="grid-4" style={{ marginBottom: '24px', gap: '10px' }}>
        {Object.entries(
          safeLogs.reduce((acc: any, log) => {
            const intent = log.detectedIntent || 'unknown';
            acc[intent] = (acc[intent] || 0) + 1;
            return acc;
          }, {})
        ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8).map(([intent, count]: any) => (
          <div key={intent} className="stat-card" style={{ padding: '12px 16px', borderLeft: `3px solid ${intentColors[intent] || '#666'}` }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>{intent.replace(/_/g, ' ')}</span>
            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{count}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading logs...</div>
      ) : safeLogs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          No AI conversations yet. Conversations will appear here once customers message via WhatsApp.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Time</th><th>Customer</th><th>Message</th><th>Intent</th><th>Confidence</th><th>Response</th></tr></thead>
            <tbody>
              {safeLogs.slice(0, 100).map((log) => (
                <tr key={log.id} onClick={() => setSelectedLog(log)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{log.customerPhone}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.messageIn}</td>
                  <td>
                    <span style={{
                      padding: '3px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                      background: `${intentColors[log.detectedIntent] || '#666'}20`, color: intentColors[log.detectedIntent] || '#666',
                    }}>{(log.detectedIntent || 'unknown').replace(/_/g, ' ')}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: log.confidenceScore > 0.8 ? '#22c55e' : log.confidenceScore > 0.5 ? '#f59e0b' : '#ef4444' }}>
                      {((log.confidenceScore || 0) * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{log.messageOut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>Conversation Detail</h2>
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedLog.customerPhone} · {new Date(selectedLog.createdAt).toLocaleString()}</span>
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Customer</div>
              <div>{selectedLog.messageIn}</div>
            </div>
            <div style={{ background: 'var(--primary-glow)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>AI Response</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{selectedLog.messageOut}</div>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Intent: <strong>{selectedLog.detectedIntent}</strong></span>
              <span>Confidence: <strong>{((selectedLog.confidenceScore || 0) * 100).toFixed(0)}%</strong></span>
            </div>
            <button className="btn-secondary" onClick={() => setSelectedLog(null)} style={{ marginTop: '20px' }}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
