'use client';

import { Eye, EyeOff, Pencil, Plus, Save, Search, Trash2, UtensilsCrossed } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormActions, FormField, FormGrid } from '@/components/form-field';
import { ImageDropzone } from '@/components/image-dropzone';
import { LoadingCards } from '@/components/loading-state';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/lib/api-client';
import { errorMessage, failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';
import { money } from '@/lib/format';

const maxImageBytes = 5 * 1024 * 1024;
const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const emptyForm = {
  available: true,
  categoryId: '',
  description: '',
  dietaryFlags: '',
  imageUrl: '',
  name: '',
  price: '0',
};

export default function MenuItemsPage() {
  const [branchId, setBranchId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [token, setToken] = useState('');
  const [items, setItems] = useState<CmsMenuItem[]>([]);
  const [categories, setCategories] = useState<CmsMenuCategory[]>([]);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [imageFileName, setImageFileName] = useState('');
  const [imageUploadNote, setImageUploadNote] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<AsyncState>(loading);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load(nextBranchId = branchId, nextTenantId = tenantId, nextToken = token): Promise<void> {
    if (!nextBranchId || !nextTenantId || !nextToken) {
      setItems([]);
      setState(failed(new Error('This account is not linked to an outlet yet.')));
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
      setState(ready);
    } catch (error) {
      setState(failed(error, 'Could not load menu management data.'));
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
    setImageFileName('');
    setImageUploadNote('');
    setForm({ ...emptyForm, categoryId: documentId(categories[0] ?? {}) });
  }

  function edit(item: CmsMenuItem): void {
    const media = item.media as { url?: string } | undefined;
    const imageUrl = media?.url ?? '';
    setEditingId(documentId(item));
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
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }

  async function submit(): Promise<void> {
    if (!tenantId || !branchId || !token || !form.categoryId) {
      toast.error('Pick a category before saving.');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Give the dish a name.');
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

    setSaving(true);
    try {
      const wasEditing = Boolean(editingId);
      if (editingId) {
        await updateCmsMenuItem(editingId, body, token);
      } else {
        await createCmsMenuItem(body, token);
      }
      resetForm();
      await load();
      toast.success(wasEditing ? 'Menu item updated' : 'Menu item created');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save menu item.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: CmsMenuItem): Promise<void> {
    try {
      await deleteCmsMenuItem(documentId(item), token);
      await load();
      toast.success(`${item.name} deleted`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete menu item.'));
      throw error;
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
    setImageUploadNote('Uploading image');
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
      const payload = (await response.json().catch(() => null)) as
        | { secure_url?: string; url?: string; error?: { message?: string } }
        | null;
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
      setImageUploadNote(errorMessage(error, 'Could not upload image.'));
    } finally {
      setUploading(false);
    }
  }

  function clearImage(): void {
    setForm((current) => ({ ...current, imageUrl: '' }));
    setImageFileName('');
    setImageUploadNote('Image removed. Save the item to apply it.');
  }

  return (
    <PageShell>
      <PageHeader
        description="Dishes, prices, images, dietary tags, and availability for this outlet."
        eyebrow="Menu"
        onRefresh={() => void load()}
        refreshing={state.status === 'loading'}
        title="Menu items"
      />

      {state.status === 'error' ? <ErrorState message={state.error ?? ''} onRetry={() => void load()} /> : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <SectionCard
          actions={
            editingId ? (
              <Button onClick={resetForm} size="sm" type="button" variant="ghost">
                Cancel
              </Button>
            ) : undefined
          }
          title={editingId ? 'Update item' : 'Add item'}
        >
          <FormGrid>
            <FormField htmlFor="item-name" label="Name" required>
              <Input id="item-name" onChange={(event) => setForm({ ...form, name: event.target.value })} value={form.name} />
            </FormField>
            <FormField htmlFor="item-category" label="Category" required>
              <Select onValueChange={(value) => setForm({ ...form, categoryId: value })} value={form.categoryId}>
                <SelectTrigger className="w-full" id="item-category">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={documentId(category)} value={documentId(category)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField htmlFor="item-price" label="Price (INR)">
              <Input
                id="item-price"
                min="0"
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                step="0.01"
                type="number"
                value={form.price}
              />
            </FormField>
            <FormField hint="Comma separated, e.g. vegetarian, chef_favorite" htmlFor="item-tags" label="Dietary tags">
              <Input
                id="item-tags"
                onChange={(event) => setForm({ ...form, dietaryFlags: event.target.value })}
                placeholder="vegetarian, spicy"
                value={form.dietaryFlags}
              />
            </FormField>
          </FormGrid>
          <FormField htmlFor="item-description" label="Description">
            <Textarea
              id="item-description"
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={4}
              value={form.description}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={form.available}
              onCheckedChange={(checked) => setForm({ ...form, available: checked === true })}
            />
            Available to guests
          </label>
          <FormActions>
            <Button disabled={uploading || saving} onClick={() => void submit()} type="button">
              {editingId ? <Save /> : <Plus />}
              {editingId ? 'Update item' : 'Create item'}
            </Button>
          </FormActions>
        </SectionCard>

        <SectionCard
          actions={<Badge variant={form.imageUrl ? 'success' : 'secondary'}>{form.imageUrl ? 'Ready' : 'Optional'}</Badge>}
          title="Dish photo"
        >
          <ImageDropzone
            busy={uploading}
            fileName={imageFileName}
            imageUrl={form.imageUrl}
            note={imageUploadNote}
            onClear={clearImage}
            onFile={(file) => void uploadImage(file)}
          />
        </SectionCard>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search menu"
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search menu"
            value={query}
          />
        </div>
        <Badge variant="secondary">{filteredItems.length} items</Badge>
      </div>

      {state.status === 'loading' ? (
        <LoadingCards count={6} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          description={query ? 'Clear the search to see every dish.' : 'Create the first dish using the form above.'}
          icon={UtensilsCrossed}
          title="No menu items found"
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const media = item.media as { url?: string } | undefined;
            return (
              <Card className="gap-0 overflow-hidden p-0 shadow-card" key={documentId(item)}>
                <div className="relative aspect-[16/10] bg-muted">
                  {media?.url ? (
                    <img alt={item.name} className="size-full object-cover" src={media.url} />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground/50">
                      <UtensilsCrossed aria-hidden="true" className="size-10" />
                    </div>
                  )}
                  <Badge className="absolute left-3 top-3" variant={item.available ? 'success' : 'secondary'}>
                    {item.available ? <Eye /> : <EyeOff />}
                    {item.available ? 'Available' : 'Hidden'}
                  </Badge>
                </div>
                <div className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{item.name}</h2>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{item.description || 'No description yet.'}</p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{money(item.price)}</span>
                  </div>
                  {item.dietaryFlags.length ? (
                    <div className="flex flex-wrap gap-1">
                      {item.dietaryFlags.map((flag) => (
                        <Badge key={flag} variant="outline">
                          {flag.replaceAll('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => edit(item)} size="sm" type="button" variant="outline">
                      <Pencil />
                      Edit
                    </Button>
                    <ConfirmDialog
                      confirmLabel="Delete item"
                      description={`${item.name} will disappear from the guest menu right away.`}
                      destructive
                      onConfirm={() => remove(item)}
                      title={`Delete ${item.name}?`}
                      trigger={
                        <Button className="text-destructive hover:text-destructive" size="sm" type="button" variant="ghost">
                          <Trash2 />
                          Delete
                        </Button>
                      }
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}
