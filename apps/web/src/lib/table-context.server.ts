import type { TableContext } from '@/lib/api-client';

/**
 * Server-side table lookup for the customer routes. Mirrors the client
 * `getTableContext` call but goes straight to the API origin, so the first
 * paint already has the table, branch, and session.
 */
export async function loadTableContext(qrToken: string): Promise<{ context: TableContext | null; error: string }> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

  try {
    const response = await fetch(
      `${apiUrl.replace(/\/$/, '')}/api/v1/public/table-context?qrToken=${encodeURIComponent(qrToken)}`,
      { cache: 'no-store' },
    );
    const payload = (await response.json().catch(() => null)) as TableContext | { message?: string } | null;

    if (!response.ok || !payload || !('tenant' in payload)) {
      return {
        context: null,
        error: payload && 'message' in payload && payload.message ? payload.message : 'Could not load this table.',
      };
    }

    return { context: payload, error: '' };
  } catch (error) {
    return { context: null, error: error instanceof Error ? error.message : 'Could not load this table.' };
  }
}
