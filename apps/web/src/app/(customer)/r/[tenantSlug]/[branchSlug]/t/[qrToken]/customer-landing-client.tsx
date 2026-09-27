'use client';

import { ArrowRight, Armchair, MapPin, ShoppingBasket, Users, UtensilsCrossed } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

import { CustomerPage } from '@/components/customer-page';
import { FormField } from '@/components/form-field';
import { InlineSpinner } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getTableContext, joinTable, type GuestSession, type TableContext } from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import { readGuestSession, writeGuestSession } from '@/lib/customer-storage';
import { humanize } from '@/lib/status-tone';
import { cn } from '@/lib/utils';

const steps = [
  { icon: Users, label: 'Join' },
  { icon: UtensilsCrossed, label: 'Order' },
  { icon: ShoppingBasket, label: 'Track' },
];

export function CustomerLandingClient({
  initialContext,
  initialError = '',
}: {
  initialContext: TableContext | null;
  initialError?: string;
}): ReactNode {
  const { basePath, qrToken } = useCustomerRoute();
  const [alias, setAlias] = useState('');
  const [context, setContext] = useState<TableContext | null>(initialContext);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(initialError);
  const [storedSession, setStoredSession] = useState<GuestSession | null>(null);

  useEffect(() => {
    if (qrToken) {
      setStoredSession(readGuestSession(qrToken));
    }
  }, [qrToken]);

  useEffect(() => {
    if (context) {
      return;
    }
    if (!qrToken) {
      setError('Open a full table link like /r/{tenant}/{branch}/t/{qrToken}.');
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    getTableContext(qrToken, { signal: controller.signal })
      .then((nextContext) => {
        if (!active) return;
        window.clearTimeout(timeoutId);
        setContext(nextContext);
        setError('');
      })
      .catch((nextError: Error) => {
        if (!active) return;
        window.clearTimeout(timeoutId);
        setError(nextError.name === 'AbortError' ? 'Table data timed out. Check the network and try again.' : nextError.message);
      });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [context, qrToken]);

  async function handleJoin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!qrToken || !basePath) {
      setError('This table link is missing its QR token.');
      return;
    }

    const trimmedAlias = alias.trim();
    if (!trimmedAlias) {
      setError('Enter a name for this visit.');
      return;
    }

    setJoining(true);
    setError('');
    try {
      const session = await joinTable(qrToken, trimmedAlias);
      writeGuestSession(qrToken, session);
      setStoredSession(session);
      window.location.assign(`${basePath}/menu`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not join this table.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <CustomerPage>
      <Card className="gap-0 overflow-hidden p-0 shadow-card">
        <div className="relative aspect-[4/3] w-full">
          <Image alt="" className="object-cover" fill priority sizes="(max-width: 768px) 100vw, 672px" src="/images/guest-hero.svg" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 text-background">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-semibold text-primary">
              <Armchair aria-hidden="true" className="size-3.5" />
              Table {context?.table.tableNo ?? '--'}
            </span>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
              {context ? context.branch.name : 'Join the table'}
            </h1>
            {context ? (
              <p className="inline-flex items-center gap-1.5 text-sm text-background/85">
                <MapPin aria-hidden="true" className="size-4" />
                {humanize(context.branch.slug)}
              </p>
            ) : null}
          </div>
        </div>

        <CardContent className="space-y-5 p-5">
          <ol aria-label="How ordering works" className="grid grid-cols-3 gap-2">
            {steps.map(({ icon: Icon, label }, index) => (
              <li
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-full border py-2 text-xs font-semibold',
                  index === 0 ? 'border-primary/30 bg-accent text-accent-foreground' : 'bg-muted/50 text-muted-foreground',
                )}
                key={label}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </li>
            ))}
          </ol>

          {storedSession ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Welcome back</p>
                <h2 className="font-display text-2xl font-semibold">{storedSession.alias}</h2>
                <p className="text-sm text-muted-foreground">Your table session is still active.</p>
              </div>
              <div className="grid gap-2">
                <Button asChild className="h-12" size="lg">
                  <Link href={`${basePath}/menu`}>
                    Open menu
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild className="h-12" size="lg" variant="outline">
                  <Link href={`${basePath}/bucket`}>View bucket</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(event) => void handleJoin(event)}>
              <FormField hint="Only used to label your dishes for this table." htmlFor="guest-alias" label="Your name for this visit">
                <Input
                  autoComplete="name"
                  className="h-12"
                  id="guest-alias"
                  maxLength={40}
                  name="alias"
                  onChange={(event) => setAlias(event.target.value)}
                  placeholder="e.g. Priya"
                  required
                  value={alias}
                />
              </FormField>
              <Button className="h-12 w-full" disabled={!context || joining} size="lg" type="submit">
                {joining ? <InlineSpinner /> : null}
                {joining ? 'Joining' : context ? 'Join table' : 'Loading table'}
                {!joining ? <ArrowRight /> : null}
              </Button>
            </form>
          )}

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </CustomerPage>
  );
}
