import { ArrowRight, QrCode, Soup, Store } from 'lucide-react';
import Link from 'next/link';

import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const surfaces = [
  {
    description: 'Dashboard, menu, tables, staff roles, service requests, analytics, and billing for owners and managers.',
    icon: Store,
    title: 'Restaurant workspace',
  },
  {
    description: 'Scan a table QR, join the table, order together from a shared basket, and track every course.',
    icon: QrCode,
    title: 'Guest ordering',
  },
  {
    description: 'Live tickets for the kitchen, confirmation queues for waiters, and settlement for cashiers.',
    icon: Soup,
    title: 'Floor and kitchen',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-10 px-5 py-16 md:px-8">
      <header className="space-y-6">
        <BrandLogo size="lg" />
        <div className="space-y-3">
          <h1 className="max-w-2xl font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Restaurant operations that feel live, clear, and table-first.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Servora connects the guest&rsquo;s table, the waiter&rsquo;s floor, the kitchen pass, and the owner&rsquo;s
            dashboard in one realtime system.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">
              Open workspace
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/r/harbor-grill/downtown/t/qr-t1">Preview guest ordering</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {surfaces.map(({ description, icon: Icon, title }) => (
          <Card className="shadow-card" key={title}>
            <CardContent className="space-y-3">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
