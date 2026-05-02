import { resolve } from 'node:path';

export const resolveEnvFiles = (): string[] => [
  resolve(process.cwd(), '../../.env'),
  resolve(process.cwd(), '.env'),
];
