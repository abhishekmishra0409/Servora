import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME ?? 'restaurent_saas';
const backupRoot = resolve(process.cwd(), process.env.BACKUP_DIR ?? 'backups');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = resolve(backupRoot, `${dbName}-${stamp}`);

mkdirSync(outputDir, { recursive: true });

const result = spawnSync('mongodump', ['--uri', uri, '--db', dbName, '--out', outputDir], {
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`MongoDB backup written to ${outputDir}`);
