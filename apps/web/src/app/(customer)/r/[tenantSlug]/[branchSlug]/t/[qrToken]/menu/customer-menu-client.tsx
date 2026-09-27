'use client';

import type { MenuCategory, MenuItem } from '@restaurent/shared';
import { Search, UtensilsCrossed } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { CartBar } from '@/components/cart-bar';
import { CustomerHeading, CustomerPage } from '@/components/customer-page';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingRows } from '@/components/loading-state';
import { MenuItemCard } from '@/components/menu-item-card';
import { MenuItemDrawer, type ItemSelection } from '@/components/menu-item-drawer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addBucketItem, ApiError, getPublicMenu, getTableContext, type GuestSession, type TableContext } from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import { clearGuestSession, readGuestSession } from '@/lib/customer-storage';
import { cn } from '@/lib/utils';

const documentId = (value: { _id?: unknown; id?: string }): string => value.id ?? String(value._id ?? '');

export function CustomerMenuClient({
  initialCategories,
  initialContext,
  initialError = '',
  initialGuest,
  initialItems,
}: {
  initialCategories: MenuCategory[];
  initialContext: TableContext | null;
  initialError?: string;
  initialGuest: GuestSession | null;
  initialItems: MenuItem[];
}): ReactNode {
  const { basePath, qrToken } = useCustomerRoute();
  const [context, setContext] = useState<TableContext | null>(initialContext);
  const [guest, setGuest] = useState<GuestSession | null>(initialGuest);
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState('all');
  const [allergenFilter, setAllergenFilter] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(!initialItems.length && !initialError);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    if (!qrToken) {
      setError('Open a full table link like /r/{tenant}/{branch}/t/{qrToken}.');
      setLoading(false);
      return;
    }

    let active = true;
    const session = readGuestSession(qrToken);
    setGuest(session ?? initialGuest);

    if (initialContext && initialItems.length) {
      return;
    }

    getTableContext(qrToken)
      .then(async (nextContext) => {
        const menu = await getPublicMenu(nextContext.tenant.id, nextContext.branch.id);
        if (!active) return;
        setContext(nextContext);
        setCategories(menu.categories);
        setItems(menu.items);
        setError('');
      })
      .catch((nextError: Error) => {
        if (!active) return;
        setError(nextError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialContext, initialGuest, initialItems.length, qrToken]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const categoryMatch = activeCategory === 'all' || item.categoryId === activeCategory || documentId(item) === activeCategory;
      const dietaryMatch = dietaryFilter === 'all' || item.dietaryFlags.includes(dietaryFilter);
      const allergenMatch = allergenFilter === 'all' || !item.allergens.includes(allergenFilter);
      const textMatch =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.dietaryFlags.some((flag) => flag.toLowerCase().includes(normalizedQuery)) ||
        item.allergens.some((allergen) => allergen.toLowerCase().includes(normalizedQuery));

      return categoryMatch && dietaryMatch && allergenMatch && textMatch;
    });
  }, [activeCategory, allergenFilter, dietaryFilter, items, query]);

  const dietaryOptions = useMemo(() => [...new Set(items.flatMap((item) => item.dietaryFlags))].filter(Boolean).sort(), [items]);
  const allergenOptions = useMemo(() => [...new Set(items.flatMap((item) => item.allergens))].filter(Boolean).sort(), [items]);

  const bucket = context?.tableSession?.bucket;
  const bucketCount = bucket?.items.reduce((total, line) => total + line.quantity, 0) ?? 0;
  const canOrder = Boolean(guest && (context?.tableSession?.id ?? guest?.tableSessionId));

  async function handleAdd(item: MenuItem, selection: ItemSelection): Promise<void> {
    const tableSessionId = context?.tableSession?.id ?? guest?.tableSessionId;

    if (!guest || !tableSessionId) {
      toast.error('Join the table before adding dishes.');
      window.location.assign(basePath || '/');
      return;
    }
    if (!qrToken) {
      setError('This table link is missing its QR token.');
      return;
    }

    setAdding(true);
    try {
      await addBucketItem(tableSessionId, guest.guestToken, {
        addons: selection.addons,
        menuItemId: documentId(item),
        notes: selection.notes || undefined,
        quantity: selection.quantity,
        variantId: selection.variantId || undefined,
      });
      setContext(await getTableContext(qrToken));
      setOpenItem(null);
      toast.success(`${item.name} added to the bucket`);
    } catch (nextError) {
      if (nextError instanceof ApiError && nextError.status === 401 && qrToken) {
        clearGuestSession(qrToken);
        setGuest(null);
        toast.error('Your table session expired. Join the table again.');
        window.location.assign(basePath || '/');
      } else {
        toast.error(nextError instanceof Error ? nextError.message : 'Could not add this item.');
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <CustomerPage hasCartBar={bucketCount > 0}>
      <CustomerHeading description={context ? `Table ${context.table.tableNo}` : undefined} title="Menu" />

      <div className="sticky top-14 z-20 -mx-4 space-y-2 bg-background/95 px-4 py-2 backdrop-blur">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search menu"
            className="h-10 bg-card pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search dishes"
            value={query}
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {[{ id: 'all', name: 'All' }, ...categories.map((category) => ({ id: documentId(category), name: category.name }))].map((category) => {
            const active = activeCategory === category.id;
            return (
              <button
                aria-selected={active}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted',
                )}
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                role="tab"
                type="button"
              >
                {category.name}
              </button>
            );
          })}
        </div>
        {dietaryOptions.length || allergenOptions.length ? (
          <div className="grid grid-cols-2 gap-2">
            <Select onValueChange={setDietaryFilter} value={dietaryFilter}>
              <SelectTrigger aria-label="Dietary filter" className="h-9 w-full bg-card text-xs" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All diets</SelectItem>
                {dietaryOptions.map((flag) => (
                  <SelectItem key={flag} value={flag}>
                    {flag.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setAllergenFilter} value={allergenFilter}>
              <SelectTrigger aria-label="Allergen filter" className="h-9 w-full bg-card text-xs" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All allergens</SelectItem>
                {allergenOptions.map((allergen) => (
                  <SelectItem key={allergen} value={allergen}>
                    Without {allergen}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingRows count={5} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          description={query || activeCategory !== 'all' ? 'Try another category or clear the search.' : 'The kitchen has not published any dishes yet.'}
          icon={UtensilsCrossed}
          title="No dishes found"
        />
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {filteredItems.map((item) => (
            <MenuItemCard item={item} key={documentId(item)} onOpen={setOpenItem} />
          ))}
        </section>
      )}

      <MenuItemDrawer busy={adding} canOrder={canOrder} item={openItem} onAdd={handleAdd} onOpenChange={(open) => (open ? undefined : setOpenItem(null))} />

      <CartBar count={bucketCount} href={`${basePath}/bucket`} total={bucket?.totals.grandTotal ?? 0} />
    </CustomerPage>
  );
}
