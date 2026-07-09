import { resolve } from 'path';
import { config } from 'dotenv';

export const TEST_DB_NAME = 'inventory_db_test';

export function loadTestEnv(): void {
  config({ path: resolve(__dirname, '../../.env') });
  process.env.DB_NAME = process.env.DB_NAME_TEST ?? TEST_DB_NAME;
}
