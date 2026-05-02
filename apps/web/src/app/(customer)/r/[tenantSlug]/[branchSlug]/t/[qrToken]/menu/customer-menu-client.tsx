'use client';

import type { AddonOption, MenuCategory, MenuItem } from '@restaurent/shared';
import { useEffect, useMemo, useState } from 'react';

import { addBucketItem, ApiError, getPublicMenu, getTableContext, type GuestSession, type TableContext } from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import { clearGuestSession, readGuestSession } from '@/lib/customer-storage';

type ItemSelection = {
  addons: AddonOption[];
  notes: string;
  quantity: number;
  variantId: string;
};

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

const documentId = (value: { _id?: unknown; id?: string }): string =>
  value.id ?? String(value._id ?? '');

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
}) {
  const { basePath, qrToken } = useCustomerRoute();
  const [context, setContext] = useState<TableContext | null>(initialContext);
  const [guest, setGuest] = useState<GuestSession | null>(initialGuest);
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [selections, setSelections] = useState<Record<string, ItemSelection>>({});
  const [busyItemId, setBusyItemId] = useState('');
  const [notice, setNotice] = useState(initialItems.length ? '' : initialError || 'Loading menu...');
  const [error, setError] = useState(initialError);

  useEffect(() => {
    if (!qrToken) {
      setNotice('This customer URL is missing a QR token.');
      setError('Open a full table URL like /r/{tenant}/{branch}/t/{qrToken}.');
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
        if (!active) {
          return;
        }
        setContext(nextContext);
        setCategories(menu.categories);
        setItems(menu.items);
        setNotice(menu.items.length ? '' : 'No menu items are available right now.');
      })
      .catch((nextError: Error) => {
        if (!active) {
          return;
        }
        setError(nextError.message);
        setNotice('Menu could not be loaded.');
      });

    return () => {
      active = false;
    };
  }, [initialContext, initialGuest, initialItems.length, qrToken]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const itemCategoryId = documentId(item);
      const categoryMatch = activeCategory === 'all' || item.categoryId === activeCategory || itemCategoryId === activeCategory;
      const textMatch =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.dietaryFlags.some((flag) => flag.toLowerCase().includes(normalizedQuery));

      return categoryMatch && textMatch;
    });
  }, [activeCategory, items, query]);

  function selectionFor(item: MenuItem): ItemSelection {
    const itemId = documentId(item);
    return (
      selections[itemId] ?? {
        addons: [],
        notes: '',
        quantity: 1,
        variantId: item.variants[0]?.id ?? '',
      }
    );
  }

  function updateSelection(itemId: string, update: Partial<ItemSelection>): void {
    setSelections((current) => ({
      ...current,
      [itemId]: {
        addons: [],
        notes: '',
        quantity: 1,
        variantId: '',
        ...current[itemId],
        ...update,
      },
    }));
  }

  async function handleAdd(item: MenuItem): Promise<void> {
    const itemId = documentId(item);
    const tableSessionId = context?.tableSession?.id ?? guest?.tableSessionId;

    if (!guest || !tableSessionId) {
      setError('Join the table before adding dishes.');
      window.location.assign(basePath || '/');
      return;
    }
    if (!qrToken) {
      setError('This customer URL is missing a QR token.');
      return;
    }

    const selection = selectionFor(item);
    setBusyItemId(itemId);
    setError('');
    try {
      await addBucketItem(tableSessionId, guest.guestToken, {
        addons: selection.addons,
        menuItemId: itemId,
        notes: selection.notes || undefined,
        quantity: selection.quantity,
        variantId: selection.variantId || undefined,
      });
      const nextContext = await getTableContext(qrToken);
      setContext(nextContext);
      setNotice(`${item.name} added to the bucket.`);
    } catch (nextError) {
      if (nextError instanceof ApiError && nextError.status === 401 && qrToken) {
        clearGuestSession(qrToken);
        setGuest(null);
        setError('Your table session expired. Join the table again.');
        window.location.assign(basePath || '/');
      } else {
        setError(nextError instanceof Error ? nextError.message : 'Could not add this item.');
      }
    } finally {
      setBusyItemId('');
    }
  }

  return (
    <main className="customer-main customer-main--mobile">
      <section className="customer-header">
        <div>
          <h1>Restaurent</h1>
          <p className="muted">{context ? `Table ${context.table.tableNo}` : 'Customer Menu'}</p>
        </div>
        <a className="button-link" href={`${basePath}/bucket`}>
          Bucket {context?.tableSession?.bucket.items.length ? `(${context.tableSession.bucket.items.length})` : ''}
        </a>
      </section>

      <section className="toolbar compact-toolbar">
        <label className="customer-search-field">
          <span className="material-symbols-outlined">search</span>
          <input
            aria-label="Search menu"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search menu..."
            value={query}
          />
        </label>
        <div className="segmented-control" role="tablist">
          <button className={activeCategory === 'all' ? 'active' : ''} onClick={() => setActiveCategory('all')} type="button">
            All
          </button>
          {categories.map((category) => {
            const categoryId = documentId(category);
            return (
              <button
                className={activeCategory === categoryId ? 'active' : ''}
                key={categoryId}
                onClick={() => setActiveCategory(categoryId)}
                type="button"
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </section>

      {notice ? <p className="notice-text">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="menu-grid">
        {filteredItems.map((item) => {
          const itemId = documentId(item);
          const selection = selectionFor(item);
          const selectedVariant = item.variants.find((variant) => variant.id === selection.variantId);
          const linePrice =
            item.price +
            (selectedVariant?.priceDelta ?? 0) +
            selection.addons.reduce((total, addon) => total + addon.priceDelta, 0);

          return (
            <article className={`menu-card ${!item.available ? 'menu-card--disabled' : ''}`} key={itemId}>
              <div className="menu-card__media">
                {item.imageUrl ? <img alt={item.name} src={item.imageUrl} /> : <div className="menu-card__placeholder" />}
                {item.dietaryFlags[0] ? (
                  <p className="menu-card__badge">
                    <span className={item.dietaryFlags[0].toLowerCase().includes('non') ? 'dot dot--red' : 'dot dot--green'} />
                    {item.dietaryFlags[0]}
                  </p>
                ) : null}
                {!item.available ? <p className="menu-card__badge menu-card__badge--muted">Out of Stock</p> : null}
              </div>
              <div>
                <h2>{item.name}</h2>
                <p className="muted">{item.description}</p>
              </div>
              <strong>{money(linePrice)}</strong>
              <p className="menu-meta">
                <span className="material-symbols-outlined">local_fire_department</span>
                450 cal
              </p>

              {item.variants.length ? (
                <label>
                  Variant
                  <select
                    onChange={(event) => updateSelection(itemId, { variantId: event.target.value })}
                    value={selection.variantId}
                  >
                    {item.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label} {variant.priceDelta ? `+ ${money(variant.priceDelta)}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {item.addonGroups.map((group) => (
                <fieldset key={group.id}>
                  <legend>{group.label}</legend>
                  {group.options.map((option) => {
                    const checked = selection.addons.some((addon) => addon.id === option.id);
                    return (
                      <label className="checkbox-row" key={option.id}>
                        <input
                          checked={checked}
                          onChange={(event) => {
                            const nextAddons = event.target.checked
                              ? [...selection.addons, option].slice(0, group.maxSelections || undefined)
                              : selection.addons.filter((addon) => addon.id !== option.id);
                            updateSelection(itemId, { addons: nextAddons });
                          }}
                          type="checkbox"
                        />
                        {option.label} {option.priceDelta ? `+ ${money(option.priceDelta)}` : ''}
                      </label>
                    );
                  })}
                </fieldset>
              ))}

              <label>
                Notes
                <input
                  onChange={(event) => updateSelection(itemId, { notes: event.target.value })}
                  placeholder="Less spicy, no onion..."
                  value={selection.notes}
                />
              </label>

              <div className="quantity-row">
                <button
                  onClick={() => updateSelection(itemId, { quantity: Math.max(1, selection.quantity - 1) })}
                  type="button"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <span>{selection.quantity}</span>
                <button onClick={() => updateSelection(itemId, { quantity: selection.quantity + 1 })} type="button">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>

              <button className="menu-card__add" disabled={busyItemId === itemId || !item.available} onClick={() => void handleAdd(item)} type="button">
                {busyItemId === itemId ? (
                  'Adding...'
                ) : !item.available ? (
                  'Unavailable'
                ) : guest ? (
                  <>
                    <span className="material-symbols-outlined">shopping_basket</span>
                    Add
                  </>
                ) : (
                  'Join first'
                )}
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
