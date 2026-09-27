import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Inter } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PwaBootstrap } from '@/components/pwa-bootstrap';

import './globals.css';

const inter = Inter({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-inter',
});

const fraunces = Fraunces({
  axes: ['opsz'],
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-fraunces',
});

export const metadata: Metadata = {
  applicationName: 'Servora',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Servora',
  },
  description: 'Restaurant operations and QR table ordering, from the kitchen to the table.',
  manifest: '/manifest.webmanifest',
  title: {
    default: 'Servora',
    template: '%s · Servora',
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: '#b84a2b',
  viewportFit: 'cover',
  width: 'device-width',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html className={`${inter.variable} ${fraunces.variable}`} lang="en">
      <body>
        <TooltipProvider delayDuration={200}>
          <PwaBootstrap />
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
