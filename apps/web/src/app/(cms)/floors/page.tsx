'use client';

import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormActions, FormField } from '@/components/form-field';
import { LoadingRows } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCmsFloor, deleteCmsFloor, documentId, getCmsFloors, updateCmsFloor, type CmsFloor } from '@/lib/api-client';
import { errorMessage, failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';

export default function FloorsPage() {
  const [editingId, setEditingId] = useState('');
  const [floors, setFloors] = useState<CmsFloor[]>([]);
  const [form, setForm] = useState({ name: '', sortOrder: '0' });
  const [state, setState] = useState<AsyncState>(loading);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ branchId: '', tenantId: '', token: '' });

  async function load(nextSettings = settings): Promise<void> {
    if (!nextSettings.branchId || !nextSettings.token) {
      setState(failed(new Error('This account is not linked to an outlet yet.')));
      return;
    }
    try {
      setFloors(await getCmsFloors(nextSettings.branchId, nextSettings.token));
      setState(ready);
    } catch (error) {
      setState(failed(error, 'Could not load floors.'));
    }
  }

  useEffect(() => {
    const nextSettings = readCmsSettings();
    setSettings(nextSettings);
    void load(nextSettings);
  }, []);

  function resetForm(): void {
    setEditingId('');
    setForm({ name: '', sortOrder: '0' });
  }

  async function submit(): Promise<void> {
    if (!settings.branchId || !settings.tenantId || !settings.token || !form.name.trim()) {
      toast.error('Give the floor a name.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateCmsFloor(editingId, { name: form.name.trim(), sortOrder: Number(form.sortOrder) }, settings.token);
        toast.success('Floor updated');
      } else {
        await createCmsFloor(
          { branchId: settings.branchId, name: form.name.trim(), sortOrder: Number(form.sortOrder), tenantId: settings.tenantId },
          settings.token,
        );
        toast.success('Floor created');
      }
      resetForm();
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save floor.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(floor: CmsFloor): Promise<void> {
    if (!settings.token) return;
    try {
      await deleteCmsFloor(documentId(floor), settings.token);
      await load();
      toast.success(`${floor.name} deleted`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete floor.'));
      throw error;
    }
  }

  return (
    <PageShell
      description="Group tables into dining areas so table setup and QR codes stay organised for the floor team."
      eyebrow="Floors"
      title="Dining areas"
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
          title={editingId ? 'Update floor' : 'Add floor'}
        >
          <FormField htmlFor="floor-name" label="Name" required>
            <Input id="floor-name" onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ground floor" value={form.name} />
          </FormField>
          <FormField htmlFor="floor-sort" label="Sort order">
            <Input id="floor-sort" onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} type="number" value={form.sortOrder} />
          </FormField>
          <FormActions>
            <Button disabled={saving} onClick={() => void submit()} type="button">
              {editingId ? null : <Plus />}
              {editingId ? 'Update floor' : 'Create floor'}
            </Button>
          </FormActions>
        </SectionCard>

        <SectionCard title={`${floors.length} floors`}>
          {state.status === 'loading' ? (
            <LoadingRows count={3} />
          ) : floors.length === 0 ? (
            <EmptyState compact description="Add the first floor using the form." icon={Layers} title="No floors yet" />
          ) : (
            <ul className="divide-y">
              {floors.map((floor) => (
                <li className="flex items-center gap-3 py-3" key={documentId(floor)}>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Layers aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{floor.name}</p>
                    <p className="text-xs text-muted-foreground">Sort order {floor.sortOrder}</p>
                  </div>
                  <Button
                    aria-label={`Edit ${floor.name}`}
                    onClick={() => {
                      setEditingId(documentId(floor));
                      setForm({ name: floor.name, sortOrder: String(floor.sortOrder) });
                    }}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil />
                  </Button>
                  <ConfirmDialog
                    confirmLabel="Delete floor"
                    description="Tables on this floor keep their data but lose their floor grouping."
                    destructive
                    onConfirm={() => remove(floor)}
                    title={`Delete ${floor.name}?`}
                    trigger={
                      <Button aria-label={`Delete ${floor.name}`} className="text-destructive hover:text-destructive" size="icon-sm" type="button" variant="ghost">
                        <Trash2 />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </PageShell>
  );
}
