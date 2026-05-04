import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const source = process.argv[2];
if (!source) {
  console.error('Usage: npm run restore:mongo -- <backup-directory>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME ?? 'restaurent_saas';
const sourceDir = resolve(process.cwd(), source, dbName);

if (!existsSync(sourceDir)) {
  console.error(`Backup database folder not found: ${sourceDir}`);
  process.exit(1);
}

const result = spawnSync('mongorestore', ['--uri', uri, '--db', dbName, '--drop', sourceDir], {
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`MongoDB restore completed from ${sourceDir}`);
