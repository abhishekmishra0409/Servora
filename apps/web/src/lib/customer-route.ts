'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';

type RouteParam = string | string[] | undefined;

const first = (value: RouteParam): string => {
  const normalized = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  if (normalized === 'undefined' || normalized === 'null') {
    return '';
  }
  return normalized;
};

const cleanPathSegment = (value: string): string => {
  const decoded = decodeURIComponent(value);
  if (decoded === 'undefined' || decoded === 'null') {
    return '';
  }
  return decoded;
};

export function useCustomerRoute(): {
  basePath: string;
  branchSlug: string;
  qrToken: string;
  tenantSlug: string;
} {
  const params = useParams<Record<string, RouteParam>>();

  return useMemo(() => {
    let tenantSlug = first(params.tenantSlug);
    let branchSlug = first(params.branchSlug);
    let qrToken = first(params.qrToken);

    if ((!tenantSlug || !branchSlug || !qrToken) && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/r\/([^/]+)\/([^/]+)\/t\/([^/]+)/);
      tenantSlug = tenantSlug || cleanPathSegment(match?.[1] ?? '');
      branchSlug = branchSlug || cleanPathSegment(match?.[2] ?? '');
      qrToken = qrToken || cleanPathSegment(match?.[3] ?? '');
    }

    return {
      basePath: tenantSlug && branchSlug && qrToken ? `/r/${tenantSlug}/${branchSlug}/t/${qrToken}` : '',
      branchSlug,
      qrToken,
      tenantSlug,
    };
  }, [params]);
}
