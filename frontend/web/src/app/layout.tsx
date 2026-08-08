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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
