import { execSync } from 'node:child_process';

const commands = ['npm run lint', 'npm run typecheck', 'npm run test', 'npm run build'];

for (const command of commands) {
  console.log(`[verify] ${command}`);
  execSync(command, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}

