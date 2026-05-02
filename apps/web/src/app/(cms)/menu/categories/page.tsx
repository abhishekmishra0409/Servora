'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../../components/page-shell';
import {
  createCmsMenuCategory,
  deleteCmsMenuCategory,
  documentId,
  getCmsMenuCategories,
  updateCmsMenuCategory,
  type CmsMenuCategory,
} from '../../../../lib/api-client';
import { readCmsSettings } from '../../../../lib/cms-storage';

export default function MenuCategoriesPage() {
  const [branchId, setBranchId] = useState('');
  const [categories, setCategories] = useState<CmsMenuCategory[]>([]);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ name: '', sortOrder: '0' });
  const [message, setMessage] = useState('Sign in to load categories from the database.');
  const [tenantId, setTenantId] = useState('');
  const [token, setToken] = useState('');

  async function load(nextTenantId = tenantId, nextBranchId = branchId): Promise<void> {
    if (!nextTenantId || !nextBranchId) {
      setMessage('Sign in to manage menu categories.');
      return;
    }
    try {
      const nextCategories = await getCmsMenuCategories(nextTenantId, nextBranchId);
      setCategories(nextCategories);
      setMessage(nextCategories.length ? '' : 'No menu categories found. Add the first category below.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load categories.');
    }
  }

  useEffect(() => {
    const settings = readCmsSettings();
    setBranchId(settings.branchId);
    setTenantId(settings.tenantId);
    setToken(settings.token);
    void load(settings.tenantId, settings.branchId);
  }, []);

  function resetForm(): void {
    setEditingId('');
    setForm({ name: '', sortOrder: '0' });
  }

  function edit(category: CmsMenuCategory): void {
    setEditingId(documentId(category));
    setForm({ name: category.name, sortOrder: String(category.sortOrder) });
  }

  async function submit(): Promise<void> {
    if (!tenantId || !branchId || !token || !form.name.trim()) {
      setMessage('Tenant, branch, login token, and category name are required.');
      return;
    }
    try {
      if (editingId) {
        await updateCmsMenuCategory(editingId, { name: form.name.trim(), sortOrder: Number(form.sortOrder) }, token);
      } else {
        await createCmsMenuCategory(
          { branchId, name: form.name.trim(), sortOrder: Number(form.sortOrder), tenantId },
          token,
        );
      }
      resetForm();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save category.');
    }
  }

  async function remove(category: CmsMenuCategory): Promise<void> {
    if (!token) return;
    try {
      await deleteCmsMenuCategory(documentId(category), token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete category.');
    }
  }

  return (
    <PageShell eyebrow="Menu Categories" title="Organize categories and embedded subcategories" description="Use ordering, visibility controls, and preview context for the customer menu.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="cms-settings-grid">
        <article className="panel">
          <div className="cms-section-head">
            <h2>{editingId ? 'Update category' : 'Add category'}</h2>
            {editingId ? <button className="button-secondary" onClick={resetForm} type="button">Cancel</button> : null}
          </div>
          <div className="form-stack">
            <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Sort order<input min="0" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} /></label>
            <button onClick={() => void submit()} type="button">{editingId ? 'Update category' : 'Create category'}</button>
          </div>
        </article>
        <article className="panel">
          <div className="cms-section-head"><h2>Category rules</h2></div>
          <p className="muted">Deleting a category hides any menu items assigned to it, so customers do not see orphaned dishes.</p>
        </article>
      </section>
      <section className="panel">
        <div className="cms-data-table">
          {categories.map((category) => (
            <div className="cms-data-row" key={documentId(category)}>
              <strong>{category.name}</strong>
              <span>{category.subcategories.length} subcategories</span>
              <span>Sort {category.sortOrder}</span>
              <span className="cms-status">{category.visible ? 'Published' : 'Hidden'}</span>
              <div className="action-row">
                <button className="button-secondary" onClick={() => edit(category)} type="button">Edit</button>
                <button className="danger-button" onClick={() => void remove(category)} type="button">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
