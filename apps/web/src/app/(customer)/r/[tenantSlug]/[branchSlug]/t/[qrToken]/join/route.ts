import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }> },
): Promise<NextResponse> {
  const resolvedParams = await params;
  const basePath = `/r/${resolvedParams.tenantSlug}/${resolvedParams.branchSlug}/t/${resolvedParams.qrToken}`;
  const host = request.headers.get('host') ?? new URL(request.url).host;
  const protocol = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '') ?? 'http';
  const origin = `${protocol}://${host}`;

  return NextResponse.redirect(new URL(basePath, origin), 303);
}
