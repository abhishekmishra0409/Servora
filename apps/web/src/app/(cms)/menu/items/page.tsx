'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createCmsMenuItem,
  deleteCmsMenuItem,
  documentId,
  getCmsMenuCategories,
  getCmsMenuItems,
  signMediaUpload,
  updateCmsMenuItem,
  type CmsMenuCategory,
  type CmsMenuItem,
} from '../../../../lib/api-client';
import { readCmsSettings } from '../../../../lib/cms-storage';

const maxImageBytes = 5 * 1024 * 1024;
const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);
const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function MenuItemsPage() {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
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
    imageUrl: '',
    name: '',
    price: '0',
  });
  const [imageDragActive, setImageDragActive] = useState(false);
  const [imageFileName, setImageFileName] = useState('');
  const [imageUploadNote, setImageUploadNote] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('Sign in to load menu items from the database.');
  const [uploading, setUploading] = useState(false);

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
    setImageDragActive(false);
    setImageFileName('');
    setImageUploadNote('');
    setForm({
      available: true,
      categoryId: documentId(categories[0] ?? {}),
      description: '',
      dietaryFlags: '',
      imageUrl: '',
      name: '',
      price: '0',
    });
  }

  function edit(item: CmsMenuItem): void {
    const media = item.media as { url?: string } | undefined;
    const imageUrl = media?.url ?? '';
    setEditingId(documentId(item));
    setImageDragActive(false);
    setImageFileName(imageUrl ? 'Current menu image' : '');
    setImageUploadNote('');
    setForm({
      available: item.available,
      categoryId: item.categoryId,
      description: item.description,
      dietaryFlags: item.dietaryFlags.join(', '),
      imageUrl,
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
      media: form.imageUrl.trim() ? { alt: `${form.name} plated dish`, url: form.imageUrl.trim() } : {},
      name: form.name,
      price: Number(form.price),
      schedules: [{ days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], endTime: '23:00', startTime: '11:00' }],
      slug: slugify(form.name),
      tenantId,
    };

    try {
      const wasEditing = Boolean(editingId);
      if (editingId) {
        await updateCmsMenuItem(editingId, body, token);
      } else {
        await createCmsMenuItem(body, token);
      }
      resetForm();
      await load();
      setMessage(wasEditing ? 'Menu item updated.' : 'Menu item created.');
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

  function validateImageFile(file: File): string {
    if (!file.type.startsWith('image/')) {
      return 'Choose a JPG, PNG, WebP, or GIF image.';
    }

    if (file.size > maxImageBytes) {
      return 'Image must be 5 MB or smaller.';
    }

    return '';
  }

  async function uploadImage(file: File | null): Promise<void> {
    if (!file || !token) {
      setImageUploadNote('Choose an image and sign in before uploading.');
      return;
    }

    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setImageFileName('');
      setImageUploadNote(validationMessage);
      return;
    }

    setUploading(true);
    setImageFileName(file.name);
    setImageUploadNote('Uploading image...');
    setMessage('');
    try {
      const signature = await signMediaUpload(token, 'restaurent/menu');
      if (!signature.cloudName || !signature.apiKey || !signature.signature) {
        throw new Error('Cloudinary media settings are not configured.');
      }

      const body = new FormData();
      body.set('file', file);
      body.set('api_key', signature.apiKey);
      body.set('folder', signature.folder);
      body.set('signature', signature.signature);
      body.set('timestamp', String(signature.timestamp));

      const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
        body,
        method: 'POST',
      });
      const payload = (await response.json().catch(() => null)) as { secure_url?: string; url?: string; error?: { message?: string } } | null;
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Cloudinary upload failed.');
      }

      const imageUrl = payload?.secure_url ?? payload?.url;
      if (!imageUrl) {
        throw new Error('Cloudinary did not return an image URL.');
      }
      setForm((current) => ({ ...current, imageUrl }));
      setImageUploadNote('Image ready. Save the menu item to apply it.');
    } catch (error) {
      setImageUploadNote(error instanceof Error ? error.message : 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  }

  function handleImageInputChange(event: ChangeEvent<HTMLInputElement>): void {
    void uploadImage(event.target.files?.[0] ?? null);
    event.target.value = '';
  }

  function handleImageDragEnter(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setImageDragActive(true);
  }

  function handleImageDragOver(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setImageDragActive(true);
  }

  function handleImageDragLeave(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setImageDragActive(false);
  }

  function handleImageDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setImageDragActive(false);
    void uploadImage(event.dataTransfer.files?.[0] ?? null);
  }

  function clearImage(): void {
    setForm((current) => ({ ...current, imageUrl: '' }));
    setImageFileName('');
    setImageUploadNote('Image removed. Save the item to apply it.');
  }

  const imageDropzoneClass = [
    'menu-image-dropzone',
    imageDragActive ? 'is-dragging' : '',
    form.imageUrl ? 'has-image' : '',
  ].filter(Boolean).join(' ');
  const imageStatus = uploading ? 'Uploading image...' : imageUploadNote;

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

        <section className="cms-settings-grid menu-editor-grid">
          <article className="panel menu-editor-panel">
            <div className="cms-section-head">
              <h2>{editingId ? 'Update item' : 'Add item'}</h2>
              {editingId ? <button className="button-secondary" onClick={resetForm} type="button">Cancel</button> : null}
            </div>
            <div className="form-stack menu-item-form">
              <div className="menu-item-form__grid">
                <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                <label>Category
                  <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                    {categories.map((category) => <option key={documentId(category)} value={documentId(category)}>{category.name}</option>)}
                  </select>
                </label>
                <label>Price<input min="0" step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
                <label>Dietary tags<input value={form.dietaryFlags} onChange={(event) => setForm({ ...form, dietaryFlags: event.target.value })} placeholder="chef_favorite, vegetarian" /></label>
              </div>
              <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <label className="checkbox-row"><input checked={form.available} onChange={(event) => setForm({ ...form, available: event.target.checked })} type="checkbox" /> Available</label>
              <button disabled={uploading} onClick={() => void submit()} type="button">
                <span aria-hidden="true" className="material-symbols-outlined">{editingId ? 'save' : 'add_circle'}</span>
                {editingId ? 'Update item' : 'Create item'}
              </button>
            </div>
          </article>

          <article className="panel menu-image-panel">
            <div className="cms-section-head">
              <h2>Dish photo</h2>
              {form.imageUrl ? <span className="cms-status">Ready</span> : <span className="cms-status">Optional</span>}
            </div>
            <label
              className={imageDropzoneClass}
              onDragEnter={handleImageDragEnter}
              onDragLeave={handleImageDragLeave}
              onDragOver={handleImageDragOver}
              onDrop={handleImageDrop}
            >
              <input
                accept="image/*"
                className="menu-image-dropzone__input"
                disabled={uploading}
                onChange={handleImageInputChange}
                ref={imageInputRef}
                type="file"
              />
              {form.imageUrl ? (
                <img alt="Selected menu item" src={form.imageUrl} />
              ) : (
                <span className="menu-image-dropzone__empty">
                  <span aria-hidden="true" className="material-symbols-outlined">add_photo_alternate</span>
                  <strong>Drop image here</strong>
                  <small>JPG, PNG, WebP or GIF up to 5 MB</small>
                </span>
              )}
              {uploading ? <span className="menu-image-dropzone__badge">Uploading</span> : null}
            </label>
            <div className="menu-image-actions">
              <button className="button-secondary" disabled={uploading} onClick={() => imageInputRef.current?.click()} type="button">
                <span aria-hidden="true" className="material-symbols-outlined">upload</span>
                {form.imageUrl ? 'Change image' : 'Choose image'}
              </button>
              {form.imageUrl ? (
                <button className="button-secondary" disabled={uploading} onClick={clearImage} type="button">
                  <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                  Remove
                </button>
              ) : null}
            </div>
            {imageFileName || imageStatus ? (
              <p className="menu-image-note">
                {imageFileName ? <strong>{imageFileName}</strong> : null}
                {imageStatus ? <span>{imageStatus}</span> : null}
              </p>
            ) : (
              <p className="muted">No image selected.</p>
            )}
          </article>
        </section>

        <section className="toolbar compact-toolbar menu-search-bar">
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search menu" value={query} />
          <span>{filteredItems.length} items</span>
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
                  <button className="button-secondary" onClick={() => edit(item)} type="button">
                    <span aria-hidden="true" className="material-symbols-outlined">edit</span>
                    Edit
                  </button>
                  <button className="danger-button" onClick={() => void remove(item)} type="button">
                    <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
          {!filteredItems.length ? (
            <article className="panel menu-empty-state">
              <span aria-hidden="true" className="material-symbols-outlined">restaurant_menu</span>
              <h2>No menu items found</h2>
              <p className="muted">Create a dish or clear the search filter.</p>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
