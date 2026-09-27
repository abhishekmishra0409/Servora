'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { permissionKey, SCREEN_GROUPS, type ScreenAction } from '@restaurent/shared';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ACTION_LABELS,
  SCREEN_ACTIONS,
  applyToggle,
  countAdvanced,
  rowState,
  screensInGroup,
  toggleColumn,
  toggleRow,
} from '@/lib/permission-matrix';
import { cn } from '@/lib/utils';

interface PermissionMatrixProps {
  granted: ReadonlySet<string>;
  /** Permissions that cannot be switched off (e.g. editing your own role). */
  locked?: ReadonlySet<string>;
  onChange?: (next: Set<string>) => void;
  readOnly?: boolean;
}

const rowGrid = 'md:grid md:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(64px,88px))] md:items-center md:gap-2';

/**
 * The screen-by-action grid. On desktop each row is a grid with one cell per
 * action; below `md` the same cells reflow into labelled chips, because a bare
 * checkbox in a nameless column is unusable on a phone.
 */
export function PermissionMatrix({ granted, locked, onChange, readOnly = false }: PermissionMatrixProps): ReactNode {
  const [openAdvanced, setOpenAdvanced] = useState('');
  const isLocked = (key: string): boolean => Boolean(locked?.has(key));

  return (
    <div className="overflow-hidden rounded-xl border">
      {SCREEN_GROUPS.map((group) => {
        const screens = screensInGroup(group.key);

        if (screens.length === 0) {
          return null;
        }

        return (
          <section key={group.key}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em]">{group.label}</h3>
              {readOnly ? null : (
                <div className="flex flex-wrap gap-1">
                  {SCREEN_ACTIONS.map((action) => (
                    <Button
                      className="h-7 px-2 text-xs"
                      key={action}
                      onClick={() => onChange?.(toggleColumn(granted, group.key, action, true))}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      All {ACTION_LABELS[action]}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div aria-hidden="true" className={cn('hidden border-b bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground', rowGrid)}>
              <span>Screen</span>
              {SCREEN_ACTIONS.map((action) => (
                <span className="text-center" key={action}>
                  {ACTION_LABELS[action]}
                </span>
              ))}
            </div>

            {screens.map((screen) => {
              const row = rowState(granted, screen);
              const advancedCount = countAdvanced(granted, screen);
              const advancedOpen = openAdvanced === screen.key;

              return (
                <div className="border-b bg-card px-4 py-3 last:border-b-0" key={screen.key}>
                  <div className={cn('grid gap-3', rowGrid)}>
                    <div className="grid gap-0.5">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={row.all ? true : row.partial ? 'indeterminate' : false}
                          disabled={readOnly || screen.locked}
                          onCheckedChange={(checked) => onChange?.(toggleRow(granted, screen, checked === true))}
                        />
                        {screen.label}
                      </label>
                      <span className="pl-6 text-xs text-muted-foreground">{screen.locked ? 'Always visible' : screen.href}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pl-6 md:contents md:pl-0">
                      {SCREEN_ACTIONS.map((action: ScreenAction) => {
                        if (!screen.actions.includes(action)) {
                          return (
                            <span aria-hidden="true" className="hidden text-center text-muted-foreground/50 md:block" key={action}>
                              —
                            </span>
                          );
                        }

                        const key = permissionKey(screen.key, action);

                        return (
                          <label
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium md:justify-center md:rounded-none md:border-0 md:px-0 md:py-0"
                            key={action}
                          >
                            <Checkbox
                              aria-label={`${screen.label}: ${ACTION_LABELS[action]}`}
                              checked={granted.has(key)}
                              disabled={readOnly || isLocked(key) || (screen.locked && action === 'view')}
                              onCheckedChange={(checked) => onChange?.(applyToggle(granted, screen, action, checked === true))}
                            />
                            <span className="md:sr-only">{ACTION_LABELS[action]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {screen.advanced?.length ? (
                    <div className="mt-2 pl-6">
                      <Button
                        aria-expanded={advancedOpen}
                        className="h-7 px-2 text-xs"
                        onClick={() => setOpenAdvanced(advancedOpen ? '' : screen.key)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {advancedOpen ? <ChevronUp /> : <ChevronDown />}
                        Advanced ({advancedCount}/{screen.advanced.length})
                      </Button>
                      {advancedOpen ? (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {screen.advanced.map((advanced) => {
                            const key = permissionKey(screen.key, advanced.key);

                            return (
                              <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm" key={advanced.key}>
                                <Checkbox
                                  checked={granted.has(key)}
                                  disabled={readOnly || isLocked(key)}
                                  onCheckedChange={(checked) => onChange?.(applyToggle(granted, screen, advanced.key, checked === true))}
                                />
                                {advanced.label}
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
