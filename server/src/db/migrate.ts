import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
const DB_PATH = path.resolve(__dirname, '../../seesay.db');

// SQLite-compatible schema (strip Postgres-specific syntax)
function toSqliteSchema(pgSql: string): string {
  return pgSql
    .replace(/TIMESTAMPTZ/gi, 'TEXT')
    .replace(/TIMESTAMP\(6\)/gi, 'TEXT')
    .replace(/SERIAL\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/\bSERIAL\b/gi, 'INTEGER')
    .replace(/\bJSON\b/gi, 'TEXT')
    .replace(/--.*$/gm, '')
    .replace(/CREATE INDEX IF NOT EXISTS[\s\S]*?;/gm, '') // skip indexes for SQLite compat
    .trim();
}

async function migrate() {
  const schema = fs.readFileSync(schemaPath, 'utf8');

  if (process.env.DATABASE_URL) {
    // ── PostgreSQL ──
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await pool.query(schema);
      console.log('✅ PostgreSQL migration complete.');
    } finally {
      await pool.end();
    }
  } else {
    // ── sql.js (pure-JS SQLite) ──
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();

    let db: any;
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('📂 Loaded existing SQLite database.');
    } else {
      db = new SQL.Database();
      console.log('🆕 Created new SQLite database.');
    }

    const sqliteSchema = toSqliteSchema(schema);
    // Split on semicolons, run each statement
    const statements = sqliteSchema.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try {
        db.run(stmt);
      } catch (e: any) {
        // Ignore "already exists" errors
        if (!e.message.includes('already exists')) {
          console.warn('⚠️ SQLite statement warning:', e.message);
        }
      }
    }

    // Persist to file
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    db.close();
    console.log('✅ SQLite migration complete at', DB_PATH);
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
