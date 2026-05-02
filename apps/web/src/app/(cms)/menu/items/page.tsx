'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  createCmsMenuItem,
  deleteCmsMenuItem,
  documentId,
  getCmsMenuCategories,
  getCmsMenuItems,
  updateCmsMenuItem,
  type CmsMenuCategory,
  type CmsMenuItem,
} from '../../../../lib/api-client';
import { readCmsSettings } from '../../../../lib/cms-storage';

const defaultImageUrl = 'https://i.pinimg.com/736x/84/81/ab/8481ab5bd88c3c7ea5f087b3a7d99c90.jpg';
const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);
const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function MenuItemsPage() {
  const [branchId, setBranchId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [token, setToken] = useState('');
  const [items, setItems] = useState<CmsMenuItem[]>([]);
  const [categories, setCategories] = useState<CmsMenuCategory[]>([]);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({
    available: true,
    categoryId: '',
    description: '',
    dietaryFlags: '',
    imageUrl: defaultImageUrl,
    name: '',
    price: '0',
  });
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('Sign in to load menu items from the database.');

  async function load(nextBranchId = branchId, nextTenantId = tenantId, nextToken = token): Promise<void> {
    if (!nextBranchId || !nextTenantId || !nextToken) {
      setItems([]);
      setMessage('Sign in to manage menu items.');
      return;
    }
    try {
      const [nextItems, nextCategories] = await Promise.all([
        getCmsMenuItems(nextBranchId, nextToken),
        getCmsMenuCategories(nextTenantId, nextBranchId),
      ]);
      setItems(nextItems);
      setCategories(nextCategories);
      setForm((current) => ({ ...current, categoryId: current.categoryId || documentId(nextCategories[0] ?? {}) }));
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load menu management data.');
    }
  }

  useEffect(() => {
    const settings = readCmsSettings();
    setBranchId(settings.branchId);
    setTenantId(settings.tenantId);
    setToken(settings.token);
    void load(settings.branchId, settings.tenantId, settings.token);
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.slug.toLowerCase().includes(normalizedQuery),
    );
  }, [items, query]);

  function resetForm(): void {
    setEditingId('');
    setForm({
      available: true,
      categoryId: documentId(categories[0] ?? {}),
      description: '',
      dietaryFlags: '',
      imageUrl: defaultImageUrl,
      name: '',
      price: '0',
    });
  }

  function edit(item: CmsMenuItem): void {
    const media = item.media as { url?: string } | undefined;
    setEditingId(documentId(item));
    setForm({
      available: item.available,
      categoryId: item.categoryId,
      description: item.description,
      dietaryFlags: item.dietaryFlags.join(', '),
      imageUrl: media?.url ?? defaultImageUrl,
      name: item.name,
      price: String(item.price),
    });
  }

  async function submit(): Promise<void> {
    if (!tenantId || !branchId || !token || !form.categoryId) {
      setMessage('Missing tenant, branch, token, or category.');
      return;
    }

    const body = {
      available: form.available,
      branchId,
      categoryId: form.categoryId,
      description: form.description,
      dietaryFlags: form.dietaryFlags.split(',').map((flag) => flag.trim()).filter(Boolean),
      media: { alt: `${form.name} plated dish`, url: form.imageUrl || defaultImageUrl },
      name: form.name,
      price: Number(form.price),
      schedules: [{ days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], endTime: '23:00', startTime: '11:00' }],
      slug: slugify(form.name),
      tenantId,
    };

    try {
      if (editingId) {
        await updateCmsMenuItem(editingId, body, token);
      } else {
        await createCmsMenuItem(body, token);
      }
      resetForm();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save menu item.');
    }
  }

  async function remove(item: CmsMenuItem): Promise<void> {
    try {
      await deleteCmsMenuItem(documentId(item), token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete menu item.');
    }
  }

  return (
    <main>
      <div className="page-shell">
        <section className="customer-header">
          <div>
            <p className="eyebrow">Menu Items</p>
            <h1>Menu operations</h1>
            <p className="muted">Owner controls for dishes, prices, images, schedules, and availability.</p>
          </div>
          <button onClick={() => void load()} type="button">
            <span aria-hidden="true" className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
        </section>

        {message ? <p className="notice-text">{message}</p> : null}

        <section className="cms-settings-grid">
          <article className="panel">
            <div className="cms-section-head">
              <h2>{editingId ? 'Update item' : 'Add item'}</h2>
              {editingId ? <button className="button-secondary" onClick={resetForm} type="button">Cancel</button> : null}
            </div>
            <div className="form-stack">
              <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label>Category
                <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                  {categories.map((category) => <option key={documentId(category)} value={documentId(category)}>{category.name}</option>)}
                </select>
              </label>
              <label>Price<input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
              <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <label>Image URL<input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></label>
              <label>Dietary tags<input value={form.dietaryFlags} onChange={(event) => setForm({ ...form, dietaryFlags: event.target.value })} placeholder="chef_favorite, vegetarian" /></label>
              <label className="checkbox-row"><input checked={form.available} onChange={(event) => setForm({ ...form, available: event.target.checked })} type="checkbox" /> Available</label>
              <button onClick={() => void submit()} type="button">{editingId ? 'Update item' : 'Create item'}</button>
            </div>
          </article>

          <article className="panel">
            <h2>Menu image preview</h2>
            <div className="menu-card__media" style={{ margin: 0 }}>
              <img alt="Menu preview" src={form.imageUrl || defaultImageUrl} />
            </div>
            <p className="muted">Cloudinary upload can store the final URL here; the admin data model already saves it in item media.</p>
          </article>
        </section>

        <section className="toolbar compact-toolbar">
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search menu" value={query} />
        </section>

        <section className="menu-grid">
          {filteredItems.map((item) => {
            const media = item.media as { url?: string } | undefined;
            return (
              <article className="menu-card" key={documentId(item)}>
                <div className="menu-card__media">
                  {media?.url ? <img alt={item.name} src={media.url} /> : <div className="menu-card__placeholder" />}
                </div>
                <div>
                  <p className="eyebrow">
                    <span aria-hidden="true" className="material-symbols-outlined">{item.available ? 'check_circle' : 'visibility_off'}</span>
                    {item.available ? 'Available' : 'Hidden'}
                  </p>
                  <h2>{item.name}</h2>
                  <p className="muted">{item.description}</p>
                </div>
                <strong>{money(item.price)}</strong>
                <p className="muted">{item.dietaryFlags.length ? item.dietaryFlags.join(' - ') : 'No dietary tags'}</p>
                <div className="action-row">
                  <button className="button-secondary" onClick={() => edit(item)} type="button">Edit</button>
                  <button className="danger-button" onClick={() => void remove(item)} type="button">Delete</button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
