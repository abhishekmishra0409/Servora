import 'reflect-metadata';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';

import { databaseModels } from '../apps/api/dist/database/schemas/index.js';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

export const registerModels = (): typeof mongoose.models => {
  for (const definition of databaseModels) {
    if (!mongoose.models[definition.name]) {
      mongoose.model(definition.name, definition.schema);
    }
  }

  return mongoose.models;
};

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME ?? 'restaurent_saas';

  return mongoose.connect(uri, { dbName });
};

export const disconnectFromDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
