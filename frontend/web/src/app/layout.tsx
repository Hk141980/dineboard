import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DineBoard — Multi-Tenant Restaurant Management Platform',
  description: 'DineBoard is a powerful SaaS platform for restaurant management with AI-powered WhatsApp chatbot, smart table booking, integrated payments, and real-time analytics. Your restaurant, beautifully managed.',
  keywords: 'restaurant management, SaaS, multi-tenant, table booking, WhatsApp chatbot, Razorpay, AI, POS, India',
  authors: [{ name: 'DineBoard' }],
  openGraph: {
    title: 'DineBoard — Your Restaurant, Beautifully Managed',
    description: 'AI-powered restaurant management platform with WhatsApp ordering, smart booking, and integrated payments.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'DineBoard',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
