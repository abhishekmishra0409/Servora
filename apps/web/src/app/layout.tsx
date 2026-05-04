import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '../app/globals.css';
import { PwaBootstrap } from '../components/pwa-bootstrap';

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
      <body>
        <PwaBootstrap />
        {children}
      </body>
    </html>
  );
}
