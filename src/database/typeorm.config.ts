import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

function readEnv(
  source: NodeJS.ProcessEnv | ConfigService,
  key: string,
): string | undefined {
  if (source instanceof ConfigService) {
    const value = source.get<string>(key);
    return value === undefined || value === null ? undefined : String(value);
  }
  return source[key];
}

/**
 * Neon y Cloud SQL exigen SSL. En local/docker-compose no.
 * Activa con DB_SSL=true o con DATABASE_URL (Neon connection string).
 */
export function buildTypeOrmOptions(
  env: NodeJS.ProcessEnv | ConfigService = process.env,
): DataSourceOptions {
  const databaseUrl = readEnv(env, 'DATABASE_URL');
  const sslEnabled = readEnv(env, 'DB_SSL') === 'true' || Boolean(databaseUrl);
  const ssl = sslEnabled ? { rejectUnauthorized: false } : undefined;

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl,
      synchronize: false,
    };
  }

  return {
    type: 'postgres',
    host: readEnv(env, 'DB_HOST') ?? 'localhost',
    port: Number(readEnv(env, 'DB_PORT') ?? '5432'),
    username: readEnv(env, 'DB_USER'),
    password: readEnv(env, 'DB_PASSWORD'),
    database: readEnv(env, 'DB_NAME'),
    ssl,
    synchronize: false,
  };
}
