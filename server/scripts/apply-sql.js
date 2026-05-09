#!/usr/bin/env node
/**
 * Запускает SQL-файл напрямую через pg (без транзакции).
 * Нужно для CREATE INDEX CONCURRENTLY, который не работает внутри транзакции.
 *
 * Использование:
 *   node scripts/apply-sql.js migrations/007_performance_indexes.sql
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs   = require('fs');
const path = require('path');

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node scripts/apply-sql.js <path-to-sql-file>');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const fullPath = path.resolve(__dirname, '..', sqlFile);
if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(fullPath, 'utf8');

// Разбиваем на отдельные выражения (нужно для CONCURRENTLY)
const statements = sql
  .split(';')
  .map(s => s.replace(/--[^\n]*/g, '').trim())
  .filter(Boolean);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  console.log(`Applying ${sqlFile} (${statements.length} statements)...`);
  for (const stmt of statements) {
    process.stdout.write('  ' + stmt.slice(0, 60).replace(/\s+/g, ' ') + ' ... ');
    await pool.query(stmt);
    console.log('ok');
  }
  await pool.end();
  console.log('Done.');
})().catch(err => {
  console.error('Migration failed:', err.message);
  pool.end();
  process.exit(1);
});
