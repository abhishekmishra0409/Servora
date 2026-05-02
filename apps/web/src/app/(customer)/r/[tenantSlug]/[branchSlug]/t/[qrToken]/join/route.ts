import { NextResponse } from 'next/server';

import { guestSessionCookieName } from '@/lib/customer-storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }> },
): Promise<NextResponse> {
  const resolvedParams = await params;
  const formData = await request.formData();
  const alias = String(formData.get('alias') ?? '').trim();
  const basePath = `/r/${resolvedParams.tenantSlug}/${resolvedParams.branchSlug}/t/${resolvedParams.qrToken}`;
  const host = request.headers.get('host') ?? new URL(request.url).host;
  const protocol = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '') ?? 'http';
  const origin = `${protocol}://${host}`;

  if (!alias) {
    return NextResponse.redirect(new URL(basePath, origin), 303);
  }

  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/v1/table-sessions/join`, {
    body: JSON.stringify({ alias, qrToken: resolvedParams.qrToken }),
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    return NextResponse.redirect(new URL(basePath, origin), 303);
  }

  const session = await response.json();
  const redirect = NextResponse.redirect(new URL(`${basePath}/menu`, origin), 303);
  redirect.cookies.set(guestSessionCookieName(resolvedParams.qrToken), encodeURIComponent(JSON.stringify(session)), {
    httpOnly: false,
    maxAge: 60 * 60 * 6,
    path: '/',
    sameSite: 'lax',
  });

  return redirect;
}
