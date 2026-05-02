import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const workspaceRoot = resolve(process.cwd(), '../../');
  const env = loadEnv(mode, workspaceRoot, '');

  return {
    envDir: workspaceRoot,
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL ?? env.API_URL ?? 'http://localhost:4000'),
      'import.meta.env.VITE_REALTIME_URL': JSON.stringify(
        env.VITE_REALTIME_URL ?? env.REALTIME_URL ?? 'http://localhost:4001',
      ),
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.WAITER_PORT ?? 4173),
    },
  };
});
