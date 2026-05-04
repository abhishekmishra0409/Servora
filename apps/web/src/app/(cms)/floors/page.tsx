'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../../../components/page-shell';
import {
  createCmsFloor,
  deleteCmsFloor,
  documentId,
  getCmsFloors,
  updateCmsFloor,
  type CmsFloor,
} from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';

export default function FloorsPage() {
  const [editingId, setEditingId] = useState('');
  const [floors, setFloors] = useState<CmsFloor[]>([]);
  const [form, setForm] = useState({ name: '', sortOrder: '0' });
  const [message, setMessage] = useState('Sign in to manage floors.');
  const [settings, setSettings] = useState({ branchId: '', tenantId: '', token: '' });

  async function load(nextSettings = settings): Promise<void> {
    if (!nextSettings.branchId || !nextSettings.token) {
      setMessage('Sign in to manage floors.');
      return;
    }
    try {
      const nextFloors = await getCmsFloors(nextSettings.branchId, nextSettings.token);
      setFloors(nextFloors);
      setMessage(nextFloors.length ? '' : 'No floors created for this branch.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load floors.');
    }
  }

  useEffect(() => {
    const nextSettings = readCmsSettings();
    setSettings(nextSettings);
    void load(nextSettings);
  }, []);

  async function submit(): Promise<void> {
    if (!settings.branchId || !settings.tenantId || !settings.token || !form.name.trim()) {
      setMessage('Floor name and login settings are required.');
      return;
    }

    try {
      if (editingId) {
        await updateCmsFloor(editingId, { name: form.name.trim(), sortOrder: Number(form.sortOrder) }, settings.token);
      } else {
        await createCmsFloor(
          {
            branchId: settings.branchId,
            name: form.name.trim(),
            sortOrder: Number(form.sortOrder),
            tenantId: settings.tenantId,
          },
          settings.token,
        );
      }
      setEditingId('');
      setForm({ name: '', sortOrder: '0' });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save floor.');
    }
  }

  async function remove(floor: CmsFloor): Promise<void> {
    if (!settings.token) return;
    try {
      await deleteCmsFloor(documentId(floor), settings.token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete floor.');
    }
  }

  return (
    <PageShell eyebrow="Floors" title="Organize dining areas" description="Create branch floors so table setup and QR operations stay grouped for the floor team.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="cms-settings-grid">
        <article className="panel">
          <div className="cms-section-head">
            <h2>{editingId ? 'Update floor' : 'Add floor'}</h2>
            {editingId ? <button className="button-secondary" onClick={() => { setEditingId(''); setForm({ name: '', sortOrder: '0' }); }} type="button">Cancel</button> : null}
          </div>
          <div className="form-stack">
            <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Sort order<input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} /></label>
            <button onClick={() => void submit()} type="button">{editingId ? 'Update floor' : 'Create floor'}</button>
          </div>
        </article>
        <article className="panel">
          <div className="cms-list">
            {floors.map((floor) => (
              <div className="cms-list-row" key={documentId(floor)}>
                <span className="material-symbols-outlined" aria-hidden="true">layers</span>
                <div>
                  <strong>{floor.name}</strong>
                  <p className="muted">Sort order {floor.sortOrder}</p>
                </div>
                <button className="button-secondary" onClick={() => { setEditingId(documentId(floor)); setForm({ name: floor.name, sortOrder: String(floor.sortOrder) }); }} type="button">Edit</button>
                <button className="danger-button" onClick={() => void remove(floor)} type="button">Delete</button>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageShell>
  );
}

