import { hashValue } from '../apps/api/src/common/utils/hash';
import { connectToDatabase, disconnectFromDatabase, registerModels } from './_db';

async function createAdmin(): Promise<void> {
  await connectToDatabase();
  const models = registerModels();
  const User = models.User!;
  const email = process.env.SEED_ADMIN_EMAIL ?? 'platform@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const admin = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        active: true,
        name: 'Platform Admin',
        passwordHash: await hashValue(password),
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  console.log(`[create-admin] ready: ${admin.email}`);
  await disconnectFromDatabase();
}

void createAdmin();
