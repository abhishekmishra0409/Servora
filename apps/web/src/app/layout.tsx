import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Work_Sans } from 'next/font/google';

import '../app/globals.css';
import { PwaBootstrap } from '../components/pwa-bootstrap';

const workSans = Work_Sans({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-work-sans',
});

export const metadata: Metadata = {
  description: 'Restaurant CMS and QR ordering workspace.',
  title: 'Restaurent SaaS',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={workSans.variable}>
        <PwaBootstrap />
        {children}
      </body>
    </html>
  );
}
