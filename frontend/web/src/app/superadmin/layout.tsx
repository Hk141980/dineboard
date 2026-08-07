'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { icon: '📊', label: 'Overview', href: '/superadmin' },
  { icon: '🏪', label: 'Tenants', href: '/superadmin/tenants' },
  { icon: '💰', label: 'Revenue', href: '/superadmin/revenue' },
  { icon: '📋', label: 'Plans', href: '/superadmin/plans' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem' }}>🍽️</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800,
              background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>DineBoard Admin</span>
          </Link>
        </div>
        <nav>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 24px', margin: '2px 8px', borderRadius: '10px',
              fontSize: '0.9rem', fontWeight: pathname === item.href ? 600 : 400,
              color: pathname === item.href ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: pathname === item.href ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              borderLeft: pathname === item.href ? '3px solid #ef4444' : '3px solid transparent',
              transition: 'all 0.2s ease', textDecoration: 'none',
            }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="admin-main">{children}</div>
    </div>
  );
}
