'use client';

import { CalendarClock, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormActions, FormField, FormGrid } from '@/components/form-field';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { documentId, getCmsMenuItems, updateCmsMenuItem, type CmsMenuItem } from '@/lib/api-client';
import { errorMessage, failed, loading, ready, type AsyncState } from '@/lib/async-state';
import { readCmsSettings } from '@/lib/cms-storage';

const allDays = 'mon, tue, wed, thu, fri, sat, sun';

export default function MenuSchedulesPage() {
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ available: true, days: allDays, endTime: '23:00', startTime: '11:00' });
  const [items, setItems] = useState<CmsMenuItem[]>([]);
  const [state, setState] = useState<AsyncState>(loading);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState('');
  const [branchId, setBranchId] = useState('');

  async function load(nextBranchId = branchId, nextToken = token): Promise<void> {
    if (!nextBranchId || !nextToken) {
      setState(failed(new Error('This account is not linked to an outlet yet.')));
      return;
    }
    try {
      setItems(await getCmsMenuItems(nextBranchId, nextToken));
      setState(ready);
    } catch (error) {
      setState(failed(error, 'Could not load schedules.'));
    }
  }

  useEffect(() => {
    const settings = readCmsSettings();
    setBranchId(settings.branchId);
    setToken(settings.token);
    void load(settings.branchId, settings.token);
  }, []);

  const editingItem = items.find((item) => documentId(item) === editingId);

  function edit(item: CmsMenuItem): void {
    const schedule = item.schedules?.[0];
    setEditingId(documentId(item));
    setForm({
      available: item.available,
      days: schedule?.days.join(', ') ?? allDays,
      endTime: schedule?.endTime ?? '23:00',
      startTime: schedule?.startTime ?? '11:00',
    });
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }

  async function save(): Promise<void> {
    if (!editingId || !token) {
      toast.error('Choose an item before saving schedule changes.');
      return;
    }
    setSaving(true);
    try {
      await updateCmsMenuItem(
        editingId,
        {
          available: form.available,
          schedules: [
            {
              days: form.days.split(',').map((day) => day.trim()).filter(Boolean),
              endTime: form.endTime,
              startTime: form.startTime,
            },
          ],
        },
        token,
      );
      setEditingId('');
      await load();
      toast.success('Schedule saved');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save schedule.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      description="Daypart windows and quick sold-out switches per dish. Hidden items stay saved but leave the guest menu."
      eyebrow="Menu"
      title="Schedules"
    >
      {state.status === 'error' ? <ErrorState message={state.error ?? ''} onRetry={() => void load()} /> : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <SectionCard
          actions={
            editingId ? (
              <Button onClick={() => setEditingId('')} size="sm" type="button" variant="ghost">
                Cancel
              </Button>
            ) : undefined
          }
          description={editingItem ? undefined : 'Pick a dish from the list to edit its window.'}
          title={editingItem ? editingItem.name : 'Select an item'}
        >
          <FormField hint="Short day codes, comma separated: mon, tue, wed" htmlFor="schedule-days" label="Days">
            <Input disabled={!editingId} id="schedule-days" onChange={(event) => setForm({ ...form, days: event.target.value })} value={form.days} />
          </FormField>
          <FormGrid>
            <FormField htmlFor="schedule-start" label="Start time">
              <Input disabled={!editingId} id="schedule-start" onChange={(event) => setForm({ ...form, startTime: event.target.value })} type="time" value={form.startTime} />
            </FormField>
            <FormField htmlFor="schedule-end" label="End time">
              <Input disabled={!editingId} id="schedule-end" onChange={(event) => setForm({ ...form, endTime: event.target.value })} type="time" value={form.endTime} />
            </FormField>
          </FormGrid>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={form.available}
              disabled={!editingId}
              onCheckedChange={(checked) => setForm({ ...form, available: checked === true })}
            />
            Available to guests
          </label>
          <FormActions>
            <Button disabled={!editingId || saving} onClick={() => void save()} type="button">
              Save schedule
            </Button>
          </FormActions>
        </SectionCard>

        <SectionCard contentClassName="space-y-0" title={`${items.length} dishes`}>
          <DataTable
            columns={[
              { header: 'Dish', key: 'name', render: (item) => <span className="font-semibold">{item.name}</span> },
              {
                header: 'Availability',
                key: 'available',
                render: (item) => <StatusBadge kind="menu" label={item.available ? 'Available' : 'Hidden'} value={item.available ? 'available' : 'hidden'} />,
              },
              {
                header: 'Window',
                key: 'window',
                render: (item) => {
                  const schedule = item.schedules?.[0];
                  return <span className="tabular-nums text-muted-foreground">{schedule ? `${schedule.startTime} – ${schedule.endTime}` : 'No schedule'}</span>;
                },
              },
              {
                header: 'Days',
                hideOnMobile: true,
                key: 'days',
                render: (item) => <Badge variant="outline">{item.schedules?.[0]?.days.join(', ') ?? 'All day'}</Badge>,
              },
              {
                className: 'text-right',
                header: '',
                key: 'actions',
                render: (item) => (
                  <Button onClick={() => edit(item)} size="sm" type="button" variant="outline">
                    <Pencil />
                    Edit
                  </Button>
                ),
              },
            ]}
            empty={<EmptyState compact description="Create dishes on the menu items page first." icon={CalendarClock} title="No dishes to schedule" />}
            loading={state.status === 'loading'}
            rowClassName={(item) => (documentId(item) === editingId ? 'bg-accent/40' : undefined)}
            pageSize={10}
            rowKey={documentId}
            rows={items}
            searchPlaceholder="Search dishes"
            searchText={(item) => item.name}
          />
        </SectionCard>
      </section>
    </PageShell>
  );
}
