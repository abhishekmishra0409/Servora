import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const filePath of [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(filePath)) {
    process.loadEnvFile(filePath);
  }
}

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
const apiUrl = process.env.API_URL ?? (publicApiUrl || 'http://localhost:4000');

const nextConfig = {
  env: {
    // Leave these BLANK for same-origin deploys: the browser then calls relative
    // /api/v1 and /socket.io, which the rewrites() below proxy to the API
    // server-side. Nothing about the host/IP is baked into the client bundle, so
    // a DHCP/IP or DNS change can never break the app. Set them only when the API
    // and realtime server live on a different origin than the web app.
    NEXT_PUBLIC_API_URL: publicApiUrl,
    NEXT_PUBLIC_CUSTOMER_ORIGIN: process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN ?? '',
    NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL ?? '',
  },
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        destination: `${apiUrl}/api/v1/:path*`,
        source: '/api/v1/:path*',
      },
      {
        destination: `${apiUrl}/socket.io/:path*`,
        source: '/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
