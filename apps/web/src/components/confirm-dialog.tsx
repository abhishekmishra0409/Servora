'use client';

import { CircleHelp, TriangleAlert, Trash2, type LucideIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { InlineSpinner } from '@/components/loading-state';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type ConfirmTone = 'destructive' | 'warning' | 'default';

export interface ConfirmOptions {
  cancelLabel?: string;
  confirmLabel?: string;
  description?: ReactNode;
  /** Short bullet list of consequences shown under the description. */
  details?: string[];
  icon?: LucideIcon;
  /** When set, the confirm button stays disabled until this exact text is typed. */
  requireText?: string;
  title: string;
  tone?: ConfirmTone;
}

const toneStyles: Record<ConfirmTone, { badge: string; button: 'destructive' | 'default'; icon: LucideIcon }> = {
  default: { badge: 'bg-accent text-accent-foreground', button: 'default', icon: CircleHelp },
  destructive: { badge: 'bg-destructive/10 text-destructive', button: 'destructive', icon: Trash2 },
  warning: { badge: 'bg-warning-foreground text-warning', button: 'default', icon: TriangleAlert },
};

/** The modal body shared by the trigger-based dialog and the `useConfirm` hook. */
function ConfirmBody({
  busy,
  onCancel,
  onConfirm,
  options,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  options: ConfirmOptions;
}): ReactNode {
  const [typed, setTyped] = useState('');
  const tone = options.tone ?? 'default';
  const styles = toneStyles[tone];
  const Icon = options.icon ?? styles.icon;
  const blocked = Boolean(options.requireText) && typed.trim() !== options.requireText;

  return (
    <AlertDialogContent
      className="gap-5 rounded-2xl p-6 sm:max-w-md"
      onEscapeKeyDown={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <AlertDialogHeader className="grid-rows-none place-items-start gap-4 text-left">
        <span className={cn('inline-flex size-12 items-center justify-center rounded-full', styles.badge)}>
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <div className="space-y-1.5">
          <AlertDialogTitle className="font-display text-xl tracking-tight">{options.title}</AlertDialogTitle>
          {options.description ? (
            <AlertDialogDescription className="text-sm leading-relaxed">{options.description}</AlertDialogDescription>
          ) : null}
        </div>
      </AlertDialogHeader>

      {options.details?.length ? (
        <ul className="grid gap-1.5 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          {options.details.map((detail) => (
            <li className="flex gap-2" key={detail}>
              <span aria-hidden="true" className={cn('mt-2 size-1.5 shrink-0 rounded-full', tone === 'destructive' ? 'bg-destructive' : 'bg-primary')} />
              {detail}
            </li>
          ))}
        </ul>
      ) : null}

      {options.requireText ? (
        <label className="grid gap-1.5 text-sm">
          <span className="text-muted-foreground">
            Type <span className="font-semibold text-foreground">{options.requireText}</span> to confirm
          </span>
          <Input autoComplete="off" autoFocus disabled={busy} onChange={(event) => setTyped(event.target.value)} value={typed} />
        </label>
      ) : null}

      <AlertDialogFooter className="gap-2 sm:gap-2">
        <AlertDialogCancel className="h-10 sm:min-w-24" disabled={busy} onClick={onCancel}>
          {options.cancelLabel ?? 'Cancel'}
        </AlertDialogCancel>
        <Button
          autoFocus={!options.requireText}
          className="h-10 sm:min-w-28"
          disabled={busy || blocked}
          onClick={onConfirm}
          type="button"
          variant={styles.button}
        >
          {busy ? <InlineSpinner /> : null}
          {options.confirmLabel ?? 'Confirm'}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/**
 * Wraps a trigger element: clicking it opens the modal, and the dialog stays
 * open with a spinner until `onConfirm` settles. A rejected promise keeps the
 * dialog open so the user can retry or cancel.
 */
export function ConfirmDialog({
  onConfirm,
  trigger,
  destructive,
  ...options
}: ConfirmOptions & {
  /** Shorthand for `tone="destructive"`. */
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
  trigger: ReactNode;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const resolved: ConfirmOptions = { ...options, tone: options.tone ?? (destructive ? 'destructive' : 'default') };

  async function confirm(): Promise<void> {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // The caller already surfaced the error; leave the dialog open.
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog onOpenChange={(next) => (busy ? undefined : setOpen(next))} open={open}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      {open ? <ConfirmBody busy={busy} onCancel={() => setOpen(false)} onConfirm={() => void confirm()} options={resolved} /> : null}
    </AlertDialog>
  );
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Mount once near the root. Screens then call `const confirm = useConfirm()`
 * and `if (await confirm({...}))` before any destructive or irreversible step,
 * including ones started from a select or a keyboard shortcut where a trigger
 * element does not fit.
 */
export function ConfirmProvider({ children }: { children: ReactNode }): ReactNode {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (next) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(next);
      }),
    [],
  );

  function settle(value: boolean): void {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog onOpenChange={(open) => (open ? undefined : settle(false))} open={Boolean(options)}>
        {options ? <ConfirmBody busy={false} onCancel={() => settle(false)} onConfirm={() => settle(true)} options={options} /> : null}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside ConfirmProvider');
  }
  return confirm;
}
