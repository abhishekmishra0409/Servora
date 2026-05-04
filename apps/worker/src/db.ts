import mongoose from 'mongoose';

import { loadWorkspaceEnv } from './env-files';

loadWorkspaceEnv();

let connectionPromise: Promise<typeof mongoose> | undefined;

export const connectWorkerDatabase = (): Promise<typeof mongoose> => {
  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME ?? 'restaurent_saas';
    connectionPromise = mongoose.connect(uri, { dbName });
  }

  return connectionPromise;
};

export const collection = async <T extends Record<string, unknown> = Record<string, unknown>>(name: string) => {
  const connection = await connectWorkerDatabase();
  return connection.connection.collection<T>(name);
};

export const disconnectWorkerDatabase = async (): Promise<void> => {
  if (connectionPromise) {
    await mongoose.disconnect();
    connectionPromise = undefined;
  }
};

