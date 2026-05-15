import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const mode = process.argv[2] ?? 'dev';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const useShell = process.platform === 'win32';
const apiUrl = process.env.API_URL || 'http://localhost:4000';
const runtimeEnv = {
  ...process.env,
  API_URL: apiUrl,
  NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL || process.env.NEXT_PUBLIC_API_URL || apiUrl,
  REALTIME_URL: process.env.REALTIME_URL || apiUrl,
};

const runSync = (args) => {
  const result = spawnSync(npmCommand, args, {
    env: runtimeEnv,
    shell: useShell,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const spawnProcess = (label, args) => {
  const child = spawn(npmCommand, args, {
    env: runtimeEnv,
    shell: useShell,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (!signal && code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
};

if (mode === 'build') {
  runSync(['run', 'build', '-w', 'packages/shared']);
  runSync(['run', 'build', '-w', 'apps/api']);
  runSync(['run', 'build', '-w', 'apps/web']);
  process.exit(0);
}

if (mode === 'dev') {
  runSync(['run', 'build', '-w', 'packages/shared']);
  runSync(['run', 'build', '-w', 'apps/api']);
}

if (!['dev', 'start'].includes(mode)) {
  console.error(`Unknown two-app runtime mode: ${mode}`);
  process.exit(1);
}

const children = [
  spawnProcess('api', ['run', mode === 'dev' ? 'dev' : 'start', '-w', 'apps/api']),
  spawnProcess('web', ['run', mode === 'dev' ? 'dev' : 'start', '-w', 'apps/web']),
];

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
