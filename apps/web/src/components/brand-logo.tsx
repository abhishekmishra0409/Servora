import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const markSizes = { lg: 'size-12', md: 'size-9', sm: 'size-7' } as const;
const wordSizes = { lg: 'text-3xl', md: 'text-xl', sm: 'text-base' } as const;

/** Serving cloche on a terracotta tile. Also the source of `src/app/icon.svg`. */
export function BrandMark({ className }: { className?: string }): ReactNode {
  return (
    <svg
      aria-hidden="true"
      className={cn('shrink-0', className)}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#b84a2b" height="64" rx="16" width="64" />
      <circle cx="32" cy="18" fill="#ffffff" r="3.5" />
      <path d="M32 21.5v4" stroke="#ffffff" strokeLinecap="round" strokeWidth="3" />
      <path
        d="M13 42c0-10.5 8.5-18 19-18s19 7.5 19 18Z"
        fill="#ffffff"
      />
      <path d="M10 47h44" stroke="#ffffff" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

export function BrandLogo({
  className,
  href,
  size = 'md',
  subtitle,
  variant = 'full',
}: {
  className?: string;
  href?: string;
  size?: keyof typeof markSizes;
  subtitle?: string;
  variant?: 'full' | 'mark' | 'wordmark';
}): ReactNode {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {variant !== 'wordmark' ? <BrandMark className={markSizes[size]} /> : null}
      {variant !== 'mark' ? (
        <span className="grid leading-none">
          <span className={cn('font-display font-semibold tracking-tight text-foreground', wordSizes[size])}>
            Servora
          </span>
          {subtitle ? (
            <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link aria-label="Servora home" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" href={href}>
      {content}
    </Link>
  );
}
