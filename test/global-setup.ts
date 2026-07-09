import { ensureTestDatabase, runMigrations } from './helpers/database.helper';

export default async function globalSetup(): Promise<void> {
  await ensureTestDatabase();
  await runMigrations();
}
