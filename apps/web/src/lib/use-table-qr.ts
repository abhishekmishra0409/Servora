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
import { readCmsContext, useCmsResource, type CmsResource } from './use-cms-resource';

interface UseTableQrOptions {
  /** Rendered QR size in pixels — small for the management grid, large for print. */
  width?: number;
}

interface TableData {
  branch: CmsBranch | null;
  tables: CmsTable[];
  tenant: CmsTenant | null;
}

export interface TableQrState {
  branch: CmsBranch | null;
  customerOrigin: string;
  customerUrl: (qrToken?: string | null) => string;
  qrImages: Record<string, string>;
  /** Throws on failure so the caller can report it. */
  regenerate: (table: CmsTable) => Promise<void>;
  reload: () => Promise<void>;
  resource: CmsResource<TableData>;
  setCustomerOrigin: (origin: string) => void;
  tables: CmsTable[];
  tenant: CmsTenant | null;
}

const buildUrl = (origin: string, tenantSlug: string, branchSlug: string, qrToken: string): string =>
  `${origin.replace(/\/$/, '')}/r/${tenantSlug}/${branchSlug}/t/${qrToken}`;

/**
 * Loads the tables for the current outlet and renders a customer QR image for
 * each one. Live table and order events refresh the list in the background.
 *
 * Downloads deliberately do not reuse these images: `qr-download.ts` re-renders
 * the code at print resolution rather than upscaling this on-screen preview.
 */
export function useTableQr({ width = 220 }: UseTableQrOptions = {}): TableQrState {
  const [customerOrigin, setCustomerOrigin] = useState(resolveCustomerOrigin);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  const resource = useCmsResource<TableData>(
    async ({ branchId, tenantId, token }) => {
      const [tenants, branches, tables] = await Promise.all([
        getCmsTenants(token),
        getCmsBranches(tenantId, token),
        getCmsTables(branchId, token),
      ]);
      return {
        branch: branches.find((item) => documentId(item) === branchId) ?? branches[0] ?? null,
        tables,
        tenant: tenants.find((item) => documentId(item) === tenantId) ?? tenants[0] ?? null,
      };
    },
    {
      events: ['table.status_changed', 'floor.changed', 'order.created', 'order.status_updated', 'payment.status_updated'],
      initial: { branch: null, tables: [], tenant: null },
    },
  );
  const { branch, tables, tenant } = resource.data;

  const customerUrl = useCallback(
    (qrToken?: string | null): string =>
      qrToken && tenant && branch ? buildUrl(customerOrigin, tenant.slug, branch.slug, qrToken) : '',
    [branch, customerOrigin, tenant],
  );

  // Re-draw when the tables or the operator-edited origin change, without refetching.
  useEffect(() => {
    let active = true;
    if (!tenant || !branch) {
      setQrImages({});
      return undefined;
    }

    void Promise.all(
      tables.map(async (table) => {
        const qrToken = table.qrToken ?? '';
        // The QR encodes the whole customer URL, not just the token, so the
        // printed code works without anything else being configured.
        const url = qrToken ? buildUrl(customerOrigin, tenant.slug, branch.slug, qrToken) : '';
        const dataUrl = url
          ? await QRCode.toDataURL(url, {
              color: { dark: '#241b16', light: '#ffffff' },
              errorCorrectionLevel: 'M',
              margin: 2,
              width,
            })
          : '';
        return [documentId(table), dataUrl] as const;
      }),
    ).then((images) => {
      if (active) setQrImages(Object.fromEntries(images));
    });

    return () => {
      active = false;
    };
  }, [branch, customerOrigin, tables, tenant, width]);

  const regenerate = useCallback(
    async (table: CmsTable): Promise<void> => {
      await regenerateCmsQr(documentId(table), readCmsContext().token);
      await resource.reload();
    },
    [resource],
  );

  return {
    branch,
    customerOrigin,
    customerUrl,
    qrImages,
    regenerate,
    reload: resource.reload,
    resource,
    setCustomerOrigin,
    tables,
    tenant,
  };
}
