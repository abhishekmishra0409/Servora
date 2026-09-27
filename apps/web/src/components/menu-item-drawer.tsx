'use client';

import type { AddonGroup, AddonOption, MenuItem } from '@restaurent/shared';
import { ShoppingBasket } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { InlineSpinner } from '@/components/loading-state';
import { DietaryDot } from '@/components/menu-item-card';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ItemSelection {
  addons: AddonOption[];
  notes: string;
  quantity: number;
  variantId: string;
}

export function MenuItemDrawer({
  busy = false,
  canOrder,
  item,
  onAdd,
  onOpenChange,
}: {
  busy?: boolean;
  /** False when the guest has not joined the table yet. */
  canOrder: boolean;
  item: MenuItem | null;
  onAdd: (item: MenuItem, selection: ItemSelection) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}): ReactNode {
  const [selection, setSelection] = useState<ItemSelection>({ addons: [], notes: '', quantity: 1, variantId: '' });

  useEffect(() => {
    if (item) {
      setSelection({ addons: [], notes: '', quantity: 1, variantId: item.variants[0]?.id ?? '' });
    }
  }, [item]);

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    const variant = item.variants.find((entry) => entry.id === selection.variantId);
    return item.price + (variant?.priceDelta ?? 0) + selection.addons.reduce((total, addon) => total + addon.priceDelta, 0);
  }, [item, selection]);

  if (!item) {
    return null;
  }

  function toggleAddon(group: AddonGroup, option: AddonOption, checked: boolean): void {
    setSelection((current) => {
      const inGroup = (addon: AddonOption): boolean => group.options.some((entry) => entry.id === addon.id);
      const otherGroups = current.addons.filter((addon) => !inGroup(addon));
      let groupPicks = current.addons.filter((addon) => inGroup(addon) && addon.id !== option.id);

      if (checked) {
        groupPicks = [...groupPicks, option];
        // The max applies within this group only; other groups keep their picks.
        if (group.maxSelections > 0) {
          groupPicks = groupPicks.slice(-group.maxSelections);
        }
      }

      return { ...current, addons: [...otherGroups, ...groupPicks] };
    });
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={Boolean(item)}>
      <DrawerContent className="mx-auto max-h-[92dvh] md:max-w-lg">
        <div className="scrollbar-thin overflow-y-auto">
          {item.imageUrl ? (
            <img alt="" className="h-48 w-full object-cover" src={item.imageUrl} />
          ) : null}
          <DrawerHeader className="text-left">
            <div className="flex items-center gap-2">
              {item.dietaryFlags[0] ? <DietaryDot flag={item.dietaryFlags[0]} /> : null}
              <DrawerTitle className="font-display text-xl">{item.name}</DrawerTitle>
            </div>
            <DrawerDescription>{item.description || 'No description yet.'}</DrawerDescription>
            {item.dietaryFlags.length || item.allergens.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {item.dietaryFlags.map((flag) => (
                  <Badge key={flag} variant="secondary">
                    {flag.replaceAll('_', ' ')}
                  </Badge>
                ))}
                {item.allergens.map((allergen) => (
                  <Badge key={allergen} variant="outline">
                    Contains {allergen}
                  </Badge>
                ))}
              </div>
            ) : null}
          </DrawerHeader>

          <div className="space-y-5 px-4 pb-4">
            {item.variants.length ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold">Choose a size</legend>
                <div className="grid gap-2">
                  {item.variants.map((variant) => {
                    const checked = selection.variantId === variant.id;
                    return (
                      <label
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                          checked ? 'border-primary bg-accent/60' : 'hover:bg-muted/60',
                        )}
                        key={variant.id}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            checked={checked}
                            className="size-4 accent-primary"
                            name="variant"
                            onChange={() => setSelection((current) => ({ ...current, variantId: variant.id }))}
                            type="radio"
                            value={variant.id}
                          />
                          {variant.label}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{variant.priceDelta ? `+ ${money(variant.priceDelta)}` : 'Included'}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {item.addonGroups.map((group) => (
              <fieldset className="space-y-2" key={group.id}>
                <legend className="text-sm font-semibold">
                  {group.label}
                  {group.maxSelections > 0 ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(up to {group.maxSelections})</span>
                  ) : null}
                </legend>
                <div className="grid gap-2">
                  {group.options.map((option) => {
                    const checked = selection.addons.some((addon) => addon.id === option.id);
                    return (
                      <label
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                          checked ? 'border-primary bg-accent/60' : 'hover:bg-muted/60',
                        )}
                        key={option.id}
                      >
                        <span className="flex items-center gap-2">
                          <Checkbox checked={checked} onCheckedChange={(next) => toggleAddon(group, option, next === true)} />
                          {option.label}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{option.priceDelta ? `+ ${money(option.priceDelta)}` : 'Free'}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="item-notes">
                Special instructions
              </label>
              <Textarea
                id="item-notes"
                maxLength={200}
                onChange={(event) => setSelection((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Less spicy, no onion…"
                rows={2}
                value={selection.notes}
              />
            </div>
          </div>
        </div>

        <DrawerFooter className="border-t bg-card">
          <div className="flex items-center justify-between gap-3">
            <QuantityStepper onChange={(quantity) => setSelection((current) => ({ ...current, quantity }))} value={selection.quantity} />
            <Button
              className="h-11 flex-1 justify-between px-4"
              disabled={busy || !item.available}
              onClick={() => void onAdd(item, selection)}
              type="button"
            >
              <span className="flex items-center gap-2">
                {busy ? <InlineSpinner /> : <ShoppingBasket />}
                {canOrder ? 'Add to bucket' : 'Join table to add'}
              </span>
              <span className="tabular-nums">{money(unitPrice * selection.quantity)}</span>
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
