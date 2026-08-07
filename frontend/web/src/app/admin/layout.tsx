'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const allMenuItems = [
  { icon: '📊', label: 'Dashboard', href: '/admin/dashboard', roles: ['owner', 'manager'] },
  { icon: '🍽️', label: 'Menu', href: '/admin/menu', roles: ['owner', 'manager', 'chef'] },
  { icon: '🪑', label: 'Tables', href: '/admin/tables', roles: ['owner', 'manager', 'waiter'] },
  { icon: '📅', label: 'Bookings', href: '/admin/bookings', roles: ['owner', 'manager', 'waiter'] },
  { icon: '🛒', label: 'Orders', href: '/admin/orders', roles: ['owner', 'manager', 'waiter', 'chef', 'cashier'] },
  { icon: '👨‍🍳', label: 'Staff', href: '/admin/staff', roles: ['owner'] },
  { icon: '🎫', label: 'Promos', href: '/admin/promos', roles: ['owner', 'manager'] },
  { icon: '🧾', label: 'Invoices', href: '/admin/invoices', roles: ['owner', 'manager', 'cashier'] },
  { icon: '💰', label: 'Settlements', href: '/admin/settlements', roles: ['owner'] },
  { icon: '📈', label: 'Reports', href: '/admin/reports', roles: ['owner', 'manager'] },
  { icon: '🤖', label: 'AI Logs', href: '/admin/ai-logs', roles: ['owner', 'manager'] },
  { icon: '⚙️', label: 'Settings', href: '/admin/settings', roles: ['owner', 'manager'] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [userRole, setUserRole] = useState('owner');

  useEffect(() => {
    const t = localStorage.getItem('tenant');
    if (t) setTenant(JSON.parse(t));
    const u = localStorage.getItem('user');
    if (u) {
      try { setUserRole(JSON.parse(u).role || 'owner'); } catch {}
    }
  }, []);

  // Filter menu items by role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const activeLabel = menuItems.find(m => m.href === pathname)?.label || 'DineBoard';

  return (
    <div className="admin-layout">
      {/* Mobile Top Bar */}
      <div className="mobile-topbar">
        <button onClick={() => setMobileOpen(true)} style={{
          background: 'none', border: 'none', color: 'var(--text-primary)',
          cursor: 'pointer', fontSize: '1.4rem', padding: '4px',
        }}>☰</button>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
        }}>{activeLabel}</span>
        <button onClick={handleLogout} style={{
          background: 'none', border: 'none', color: '#EF4444',
          cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
        }}>Logout</button>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <div className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', marginBottom: '32px',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>🍽️</span>
            {!collapsed && (
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800,
                background: 'linear-gradient(135deg, var(--primary), var(--accent-light))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>DineBoard</span>
            )}
          </Link>
          <button onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '1.2rem',
          }}>{collapsed ? '→' : '←'}</button>
        </div>

        <nav>
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 24px', margin: '2px 8px', borderRadius: '10px',
              fontSize: '0.9rem', fontWeight: pathname === item.href ? 600 : 400,
              color: pathname === item.href ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: pathname === item.href ? 'var(--primary-glow)' : 'transparent',
              borderLeft: pathname === item.href ? '3px solid var(--primary)' : '3px solid transparent',
              transition: 'all 0.2s ease', textDecoration: 'none',
            }}>
              <span>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom: Tenant Info + Logout */}
        <div style={{
          padding: '16px 24px', marginTop: 'auto', borderTop: '1px solid var(--border)',
          fontSize: '0.8rem', color: 'var(--text-muted)',
        }}>
          {!collapsed && tenant && (
            <>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{tenant.name}</div>
              <div style={{ marginBottom: '12px' }}>{tenant.status}</div>
            </>
          )}
          {!collapsed && (
            <button onClick={handleLogout} style={{
              width: '100%', padding: '8px 16px', borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px', transition: 'all 0.2s',
              fontFamily: 'var(--font-body)',
            }}>
              🚪 Logout
            </button>
          )}
        </div>
      </div>

      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
