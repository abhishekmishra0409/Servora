import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const filePath of [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(filePath)) {
    process.loadEnvFile(filePath);
  }
}

const routerIp = process.env.NEXT_PUBLIC_ROUTER_IP ?? process.env.ROUTER_IP ?? '';

const nextConfig = {
  allowedDevOrigins: routerIp ? [routerIp] : [],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
    NEXT_PUBLIC_CUSTOMER_ORIGIN:
      process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN ??
      process.env.CUSTOMER_ORIGIN ??
      (routerIp
        ? `http://${routerIp}:${process.env.WEB_PORT ?? '3000'}`
        : process.env.WEB_URL ?? 'http://localhost:3000'),
    NEXT_PUBLIC_ROUTER_IP: routerIp,
    NEXT_PUBLIC_REALTIME_URL:
      process.env.NEXT_PUBLIC_REALTIME_URL ?? process.env.REALTIME_URL ?? 'http://localhost:4001',
  },
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        destination: `${process.env.API_URL ?? 'http://localhost:4000'}/api/v1/:path*`,
        source: '/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
