import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: getMySqlDatabaseUrl(),
}));

function getMySqlDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required and must use mysql://');
  }

  if (!databaseUrl.startsWith('mysql://')) {
    throw new Error(
      'Unsupported DATABASE_URL. This backend is MySQL-only and expects mysql://',
    );
  }

  return databaseUrl;
}
