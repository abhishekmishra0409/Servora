import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const loadWorkspaceEnv = (): void => {
  for (const filePath of [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')]) {
    if (existsSync(filePath)) {
      process.loadEnvFile(filePath);
    }
  }
};
