import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Record Book V2 — Daylight Financial & Wealth Suite',
  description:
    'Modern Daylight-Only 9-module financial ledger, bank & cash management, udhar dues, credit cards, custom sheets, smart ₹ checklists, and AES-256 vault.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.svg',
    apple: '/icon-192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#F8FAFC',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        className={`${plusJakartaSans.className} min-h-full bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-indigo-600 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
