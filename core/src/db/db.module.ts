/**
 * Database module — single postgres-js connection pool, drizzle wrapper,
 * exposed via the DB_TOKEN injection token.
 *
 * Services inject `@Inject(DB_TOKEN) private readonly db: Db` and use
 * the drizzle query builder directly. No repository layer in Phase 1 —
 * services own their queries; we can extract repos later if duplication
 * mounts up.
 */
import { Global, Logger, Module, type OnModuleDestroy } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

import * as schema from './schema';

export const DB_TOKEN = Symbol('CK_DB');
export type Db = PostgresJsDatabase<typeof schema>;

interface ConnectionHolder {
  client: Sql;
  db: Db;
}

const holder: { current: ConnectionHolder | null } = { current: null };

function buildConnection(): ConnectionHolder {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const client = postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 30,
    connect_timeout: 5,
  });
  const db = drizzle(client, { schema });
  return { client, db };
}

@Global()
@Module({
  providers: [
    {
      provide: DB_TOKEN,
      useFactory: () => {
        if (!holder.current) holder.current = buildConnection();
        return holder.current.db;
      },
    },
  ],
  exports: [DB_TOKEN],
})
export class DbModule implements OnModuleDestroy {
  private readonly logger = new Logger(DbModule.name);

  async onModuleDestroy() {
    if (holder.current) {
      this.logger.log('closing postgres pool');
      await holder.current.client.end({ timeout: 5 });
      holder.current = null;
    }
  }
}
