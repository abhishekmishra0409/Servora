'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';

import {
  documentId,
  getCmsBranches,
  getCmsTables,
  getCmsTenants,
  regenerateCmsQr,
  type CmsBranch,
  type CmsTable,
  type CmsTenant,
} from './api-client';
import { resolveCustomerOrigin } from './customer-origin';
import { useCmsSession } from '../components/cms-session-provider';

interface UseTableQrOptions {
  /** Rendered QR size in pixels — small for the management grid, large for print. */
  width?: number;
}

export interface TableQrState {
  branch: CmsBranch | null;
  customerOrigin: string;
  customerUrl: (qrToken?: string | null) => string;
  message: string;
  qrImages: Record<string, string>;
  regenerate: (table: CmsTable) => Promise<void>;
  reload: () => Promise<void>;
  setCustomerOrigin: (origin: string) => void;
  setMessage: (message: string) => void;
  tables: CmsTable[];
  tenant: CmsTenant | null;
}

/**
 * Loads the tables for the current branch and renders a customer QR image for
 * each one.
 *
 * The tables screen and the print sheet both need exactly this, and they used
 * to carry byte-identical copies of it — the only difference between the two
 * pages was the QR pixel size.
 */
export function useTableQr({ width = 220 }: UseTableQrOptions = {}): TableQrState {
  const session = useCmsSession();
  const [branch, setBranch] = useState<CmsBranch | null>(null);
  const [customerOrigin, setCustomerOrigin] = useState(resolveCustomerOrigin);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [tables, setTables] = useState<CmsTable[]>([]);
  const [tenant, setTenant] = useState<CmsTenant | null>(null);
  const [message, setMessage] = useState('Loading tables...');

  const { branchId, tenantId, token } = session;

  const buildUrl = useCallback(
    (origin: string, tenantSlug: string, branchSlug: string, qrToken: string): string =>
      `${origin.replace(/\/$/, '')}/r/${tenantSlug}/${branchSlug}/t/${qrToken}`,
    [],
  );

  const customerUrl = useCallback(
    (qrToken?: string | null): string =>
      qrToken && tenant && branch ? buildUrl(customerOrigin, tenant.slug, branch.slug, qrToken) : '',
    [branch, buildUrl, customerOrigin, tenant],
  );

  const renderQrImages = useCallback(
    async (
      nextTables: CmsTable[],
      nextTenant: CmsTenant | null,
      nextBranch: CmsBranch | null,
      nextOrigin: string,
    ): Promise<void> => {
      if (!nextTenant || !nextBranch) {
        setQrImages({});
        return;
      }

      const images = await Promise.all(
        nextTables.map(async (table) => {
          const qrToken = table.qrToken ?? '';
          // The QR encodes the whole customer URL, not just the token, so the
          // printed code works without anything else being configured.
          const url = qrToken ? buildUrl(nextOrigin, nextTenant.slug, nextBranch.slug, qrToken) : '';
          const dataUrl = url
            ? await QRCode.toDataURL(url, {
                color: { dark: '#111c2d', light: '#ffffff' },
                errorCorrectionLevel: 'M',
                margin: 2,
                width,
              })
            : '';

          return [documentId(table), dataUrl] as const;
        }),
      );

      setQrImages(Object.fromEntries(images));
    },
    [buildUrl, width],
  );

  const reload = useCallback(async (): Promise<void> => {
    if (!tenantId || !branchId || !token) {
      setMessage('Sign in to manage tables.');
      return;
    }

    try {
      const [nextTenants, nextBranches, nextTables] = await Promise.all([
        getCmsTenants(token),
        getCmsBranches(tenantId, token),
        getCmsTables(branchId, token),
      ]);
      const nextTenant = nextTenants.find((item) => documentId(item) === tenantId) ?? nextTenants[0] ?? null;
      const nextBranch = nextBranches.find((item) => documentId(item) === branchId) ?? nextBranches[0] ?? null;

      setTenant(nextTenant);
      setBranch(nextBranch);
      setTables(nextTables);
      await renderQrImages(nextTables, nextTenant, nextBranch, customerOrigin);
      setMessage(nextTables.length ? '' : 'No tables found for this outlet.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load tables.');
    }
  }, [branchId, customerOrigin, renderQrImages, tenantId, token]);

  const regenerate = useCallback(
    async (table: CmsTable): Promise<void> => {
      if (!token) {
        return;
      }

      try {
        await regenerateCmsQr(documentId(table), token);
        await reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not regenerate the QR code.');
      }
    },
    [reload, token],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  // Re-draw when the operator edits the origin, without refetching tables.
  useEffect(() => {
    void renderQrImages(tables, tenant, branch, customerOrigin);
  }, [branch, customerOrigin, renderQrImages, tables, tenant]);

  return {
    branch,
    customerOrigin,
    customerUrl,
    message,
    qrImages,
    regenerate,
    reload,
    setCustomerOrigin,
    setMessage,
    tables,
    tenant,
  };
}
