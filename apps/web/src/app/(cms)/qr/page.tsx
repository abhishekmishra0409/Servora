'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

import { PageShell } from '../../../components/page-shell';
import {
  documentId,
  getCmsBranches,
  getCmsTables,
  getCmsTenants,
  regenerateCmsQr,
  type CmsBranch,
  type CmsTable,
  type CmsTenant,
} from '../../../lib/api-client';
import { readCmsSettings } from '../../../lib/cms-storage';

const configuredCustomerOrigin = process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN || '';
const configuredRouterIp = process.env.NEXT_PUBLIC_ROUTER_IP || '';

function initialCustomerOrigin(): string {
  if (configuredCustomerOrigin) return configuredCustomerOrigin;
  if (typeof window === 'undefined') return configuredRouterIp ? `http://${configuredRouterIp}:3000` : 'http://localhost:3000';
  const origin = window.location.origin;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) && configuredRouterIp
    ? `http://${configuredRouterIp}:3000`
    : origin;
}

export default function QrPage() {
  const [branch, setBranch] = useState<CmsBranch | null>(null);
  const [branchId, setBranchId] = useState('');
  const [customerOrigin, setCustomerOrigin] = useState(initialCustomerOrigin);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [tables, setTables] = useState<CmsTable[]>([]);
  const [message, setMessage] = useState('Sign in to load QR tokens from the database.');
  const [tenant, setTenant] = useState<CmsTenant | null>(null);
  const [tenantId, setTenantId] = useState('');
  const [token, setToken] = useState('');

  function customerUrl(qrToken?: string | null): string {
    if (!qrToken || !tenant || !branch) return '';
    return `${customerOrigin.replace(/\/$/, '')}/r/${tenant.slug}/${branch.slug}/t/${qrToken}`;
  }

  async function renderQrImages(nextTables: CmsTable[], nextTenant = tenant, nextBranch = branch, nextOrigin = customerOrigin): Promise<void> {
    if (!nextTenant || !nextBranch) {
      setQrImages({});
      return;
    }

    const images = await Promise.all(
      nextTables.map(async (table) => {
        const qrToken = table.qrToken ?? '';
        const url = qrToken ? `${nextOrigin.replace(/\/$/, '')}/r/${nextTenant.slug}/${nextBranch.slug}/t/${qrToken}` : '';
        const dataUrl = url
          ? await QRCode.toDataURL(url, {
              color: { dark: '#111c2d', light: '#ffffff' },
              errorCorrectionLevel: 'M',
              margin: 2,
              width: 280,
            })
          : '';
        return [documentId(table), dataUrl] as const;
      }),
    );
    setQrImages(Object.fromEntries(images));
  }

  async function load(
    nextTenantId = tenantId,
    nextBranchId = branchId,
    nextToken = token,
    nextOrigin = customerOrigin,
  ): Promise<void> {
    if (!nextTenantId || !nextBranchId || !nextToken) {
      setMessage('Sign in to manage QR tokens.');
      return;
    }
    try {
      const [nextTenants, nextBranches, nextTables] = await Promise.all([
        getCmsTenants(nextToken),
        getCmsBranches(nextTenantId, nextToken),
        getCmsTables(nextBranchId, nextToken),
      ]);
      const nextTenant = nextTenants.find((item) => documentId(item) === nextTenantId) ?? nextTenants[0] ?? null;
      const nextBranch = nextBranches.find((item) => documentId(item) === nextBranchId) ?? nextBranches[0] ?? null;
      setTenant(nextTenant);
      setBranch(nextBranch);
      setTables(nextTables);
      await renderQrImages(nextTables, nextTenant, nextBranch, nextOrigin);
      setMessage(nextTables.length ? '' : 'No QR tokens found for this branch.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load QR tokens.');
    }
  }

  useEffect(() => {
    const settings = readCmsSettings();
    const origin = initialCustomerOrigin();
    setBranchId(settings.branchId);
    setCustomerOrigin(origin);
    setTenantId(settings.tenantId);
    setToken(settings.token);
    void load(settings.tenantId, settings.branchId, settings.token, origin);
  }, []);

  useEffect(() => {
    void renderQrImages(tables);
  }, [customerOrigin, tenant, branch]);

  async function regenerate(table: CmsTable): Promise<void> {
    if (!token) return;
    try {
      await regenerateCmsQr(documentId(table), token);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not regenerate QR token.');
    }
  }

  return (
    <PageShell eyebrow="QR Manager" title="Issue, rotate, and trace table QR surfaces" description="Branch teams can reprint or regenerate tokens without losing visibility into last scan behavior.">
      {message ? <p className="notice-text">{message}</p> : null}
      <section className="panel">
        <div className="cms-section-head">
          <h2>Customer scan URL</h2>
          <button className="button-secondary" onClick={() => void load()} type="button">Refresh QR codes</button>
        </div>
        <div className="form-stack">
          <label>
            Customer app origin
            <input value={customerOrigin} onChange={(event) => setCustomerOrigin(event.target.value)} />
          </label>
          <p className="muted">Open admin through this same network and print these codes. Each QR encodes the full table URL, not only the token.</p>
        </div>
      </section>
      <section className="cms-table-grid">
        {tables.map((table) => (
          <article className="cms-table-card" key={documentId(table)}>
            <div className="cms-table-card__head">
              <div>
                <h2>Table {table.tableNo}</h2>
                <p className="muted">Active customer QR</p>
              </div>
              <span className="cms-status">{table.status.replaceAll('_', ' ')}</span>
            </div>
            <div className="cms-qr-preview cms-qr-preview--large">
              {qrImages[documentId(table)] ? (
                <img alt={`Customer QR code for table ${table.tableNo}`} src={qrImages[documentId(table)]} />
              ) : (
                <span className="material-symbols-outlined" aria-hidden="true">qr_code_2</span>
              )}
            </div>
            <div className="cms-qr-link">
              <strong>{table.qrToken ?? 'No QR token'}</strong>
              {customerUrl(table.qrToken) ? <a href={customerUrl(table.qrToken)} target="_blank" rel="noreferrer">{customerUrl(table.qrToken)}</a> : null}
            </div>
            <div className="action-row">
              <button className="button-secondary" onClick={() => void regenerate(table)} type="button">Regenerate QR</button>
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
