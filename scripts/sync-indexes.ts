import { connectToDatabase, disconnectFromDatabase, registerModels } from './_db';

async function syncIndexes(): Promise<void> {
  await connectToDatabase();
  const models = registerModels();

  for (const [name, model] of Object.entries(models)) {
    await model.syncIndexes();
    console.log(`[sync-indexes] ${name}`);
  }

  await disconnectFromDatabase();
}

void syncIndexes();
