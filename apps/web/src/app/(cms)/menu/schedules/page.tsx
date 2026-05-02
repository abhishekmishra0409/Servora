'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../../components/page-shell';
import { documentId, getCmsMenuItems, updateCmsMenuItem, type CmsMenuItem } from '../../../../lib/api-client';
import { readCmsSettings } from '../../../../lib/cms-storage';

export default function MenuSchedulesPage() {
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ available: true, days: 'mon, tue, wed, thu, fri, sat, sun', endTime: '23:00', startTime: '11:00' });
  const [items, setItems] = useState<CmsMenuItem[]>([]);
  const [message, setMessage] = useState('Sign in to load schedules from the database.');
  const [token, setToken] = useState('');
  const [branchId, setBranchId] = useState('');

  async function load(nextBranchId = branchId, nextToken = token): Promise<void> {
    if (!nextBranchId || !nextToken) {
      setMessage('Sign in to manage schedules.');
      return;
    }
    try {
      const nextItems = await getCmsMenuItems(nextBranchId, nextToken);
      setItems(nextItems);
      setMessage(nextItems.length ? '' : 'No menu items found for schedules.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load schedules.');
    }
  }

  useEffect(() => {
    const settings = readCmsSettings();
    setBranchId(settings.branchId);
    setToken(settings.token);
    void load(settings.branchId, settings.token);
  }, []);

  function edit(item: CmsMenuItem): void {
    const schedule = item.schedules?.[0];
    setEditingId(documentId(item));
    setForm({
      available: item.available,
      days: schedule?.days.join(', ') ?? 'mon, tue, wed, thu, fri, sat, sun',
      endTime: schedule?.endTime ?? '23:00',
      startTime: schedule?.startTime ?? '11:00',
    });
  }

  async function save(): Promise<void> {
    if (!editingId || !token) {
      setMessage('Choose an item before saving schedule changes.');
      return;
    }
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save schedule.');
    }
  }

  return (
    <PageShell eyebrow="Schedules" title="Control daypart and blackout windows" description="Availability is a first-class operating lever with weekday ranges, time slots, and quick sold-out actions.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="cms-settings-grid">
        <article className="panel">
          <div className="cms-section-head"><h2>{editingId ? 'Update schedule' : 'Select an item'}</h2></div>
          <div className="form-stack">
            <label>Days<input value={form.days} onChange={(event) => setForm({ ...form, days: event.target.value })} /></label>
            <label>Start time<input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
            <label>End time<input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
            <label className="checkbox-row"><input checked={form.available} onChange={(event) => setForm({ ...form, available: event.target.checked })} type="checkbox" /> Available to customers</label>
            <button disabled={!editingId} onClick={() => void save()} type="button">Save schedule</button>
          </div>
        </article>
        <article className="panel">
          <div className="cms-section-head"><h2>Daypart control</h2></div>
          <p className="muted">Use short day codes like mon, tue, wed. Hidden items stay in the database but disappear from customer ordering.</p>
        </article>
      </section>
      <section className="panel">
        <div className="cms-data-table">
          {items.map((item) => {
            const schedule = item.schedules?.[0];
            return (
              <div className="cms-data-row" key={documentId(item)}>
                <strong>{item.name}</strong>
                <span>{item.available ? 'Available' : 'Hidden'}</span>
                <span>{schedule ? `${schedule.startTime} - ${schedule.endTime}` : 'No schedule'}</span>
                <span className="cms-status">{schedule?.days.join(', ') ?? 'All day'}</span>
                <button className="button-secondary" onClick={() => edit(item)} type="button">Edit</button>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
