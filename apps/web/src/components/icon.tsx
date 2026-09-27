import type { LucideProps } from 'lucide-react';

import { iconFor } from '@/lib/icons';

/** Renders a registry icon by its string name. Prefer direct lucide imports elsewhere. */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Component = iconFor(name);
  return <Component aria-hidden="true" {...props} />;
}
