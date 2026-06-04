#!/usr/bin/env node
// One-shot SQL migration runner — bypasses drizzle-kit's TS/esbuild path
// which is broken under WSL (Windows binary in node_modules). Reads a single
// migration file, splits on Drizzle's `--> statement-breakpoint`, runs the
// statements inside a transaction.
//
// Usage: node scripts/apply-migration.mjs <path/to/0002_foo.sql>
//
// Reads DATABASE_URL from .env.local — must point at the target environment.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import postgres from 'postgres'

dotenv.config({ path: '.env.local' })

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/apply-migration.mjs <path/to/migration.sql>')
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set (.env.local)')
  process.exit(1)
}

const projectRef = url.match(/postgres\.([a-z0-9]+):/)?.[1] ?? 'unknown'
console.log(`→ Target Supabase project: ${projectRef}`)
console.log(`→ Migration: ${file}`)

const sqlText = readFileSync(resolve(file), 'utf-8')
const statements = sqlText
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean)

console.log(`→ ${statements.length} statements to apply`)

const sql = postgres(url, { prepare: false, max: 1 })

try {
  await sql.begin(async (tx) => {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      const preview = stmt.split('\n').find((l) => l.trim() && !l.trim().startsWith('--'))?.slice(0, 80) ?? '(comment)'
      process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}… `)
      await tx.unsafe(stmt)
      process.stdout.write('OK\n')
    }
  })
  console.log('✓ Migration applied successfully (transaction committed)')
} catch (err) {
  console.error('✗ Migration failed (transaction rolled back):')
  console.error(err.message)
  process.exit(1)
} finally {
  await sql.end()
}
