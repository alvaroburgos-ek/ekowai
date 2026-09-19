import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';
import * as schema from './schema';
import { POOL_OPTIONS } from './pool-options';

const queryClient = postgres(env.DATABASE_URL, POOL_OPTIONS);
export const db = drizzle(queryClient, { schema });
export type Database = typeof db;
