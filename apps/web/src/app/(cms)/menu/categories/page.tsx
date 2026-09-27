'use client';

import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormActions, FormField } from '@/components/form-field';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createCmsMenuCategory,
  deleteCmsMenuCategory,
  documentId,
  getCmsMenuCategories,
  updateCmsMenuCategory,
  type CmsMenuCategory,
} from '@/lib/api-client';
import { errorMessage, failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';

export default function MenuCategoriesPage() {
  const [branchId, setBranchId] = useState('');
  const [categories, setCategories] = useState<CmsMenuCategory[]>([]);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ name: '', sortOrder: '0' });
  const [state, setState] = useState<AsyncState>(loading);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [token, setToken] = useState('');

  async function load(nextTenantId = tenantId, nextBranchId = branchId): Promise<void> {
    if (!nextTenantId || !nextBranchId) {
      setState(failed(new Error('This account is not linked to an outlet yet.')));
      return;
    }
    try {
      setCategories(await getCmsMenuCategories(nextTenantId, nextBranchId));
      setState(ready);
    } catch (error) {
      setState(failed(error, 'Could not load categories.'));
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
      toast.error('Give the category a name.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateCmsMenuCategory(editingId, { name: form.name.trim(), sortOrder: Number(form.sortOrder) }, token);
        toast.success('Category updated');
      } else {
        await createCmsMenuCategory({ branchId, name: form.name.trim(), sortOrder: Number(form.sortOrder), tenantId }, token);
        toast.success('Category created');
      }
      resetForm();
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save category.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(category: CmsMenuCategory): Promise<void> {
    if (!token) return;
    try {
      await deleteCmsMenuCategory(documentId(category), token);
      await load();
      toast.success(`${category.name} deleted`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete category.'));
      throw error;
    }
  }

  return (
    <PageShell
      description="Order and group the guest menu. Deleting a category hides the dishes assigned to it."
      eyebrow="Menu"
      title="Categories"
    >
      {state.status === 'error' ? <ErrorState message={state.error ?? ''} onRetry={() => void load()} /> : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <SectionCard
          actions={
            editingId ? (
              <Button onClick={resetForm} size="sm" type="button" variant="ghost">
                Cancel
              </Button>
            ) : undefined
          }
          title={editingId ? 'Update category' : 'Add category'}
        >
          <FormField htmlFor="category-name" label="Name" required>
            <Input id="category-name" onChange={(event) => setForm({ ...form, name: event.target.value })} value={form.name} />
          </FormField>
          <FormField hint="Lower numbers appear first on the guest menu." htmlFor="category-sort" label="Sort order">
            <Input
              id="category-sort"
              min="0"
              onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
              type="number"
              value={form.sortOrder}
            />
          </FormField>
          <FormActions>
            <Button disabled={saving} onClick={() => void submit()} type="button">
              {editingId ? null : <Plus />}
              {editingId ? 'Update category' : 'Create category'}
            </Button>
          </FormActions>
        </SectionCard>

        <SectionCard contentClassName="space-y-0" title={`${categories.length} categories`}>
          <DataTable
            columns={[
              { header: 'Name', key: 'name', render: (category) => <span className="font-semibold">{category.name}</span> },
              {
                header: 'Subcategories',
                key: 'subs',
                render: (category) => <span className="text-muted-foreground">{category.subcategories.length}</span>,
              },
              { header: 'Sort', key: 'sort', render: (category) => <span className="tabular-nums">{category.sortOrder}</span> },
              {
                header: 'Visibility',
                key: 'visible',
                render: (category) => <StatusBadge kind="menu" label={category.visible ? 'Published' : 'Hidden'} value={category.visible ? 'active' : 'hidden'} />,
              },
              {
                className: 'text-right',
                header: '',
                key: 'actions',
                render: (category) => (
                  <div className="flex justify-end gap-1">
                    <Button aria-label={`Edit ${category.name}`} onClick={() => edit(category)} size="icon-sm" type="button" variant="ghost">
                      <Pencil />
                    </Button>
                    <ConfirmDialog
                      confirmLabel="Delete category"
                      description="Dishes in this category will be hidden from guests until they are moved."
                      destructive
                      onConfirm={() => remove(category)}
                      title={`Delete ${category.name}?`}
                      trigger={
                        <Button aria-label={`Delete ${category.name}`} className="text-destructive hover:text-destructive" size="icon-sm" type="button" variant="ghost">
                          <Trash2 />
                        </Button>
                      }
                    />
                  </div>
                ),
              },
            ]}
            empty={<EmptyState compact description="Add the first category using the form." icon={Tags} title="No categories yet" />}
            loading={state.status === 'loading'}
            rowKey={documentId}
            rows={categories}
            searchPlaceholder="Search categories"
            searchText={(category) => category.name}
          />
        </SectionCard>
      </section>
    </PageShell>
  );
}
