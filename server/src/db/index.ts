import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  google_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  started_at: string;
}

export interface Query {
  id: number;
  session_id: number;
  type: 'describe' | 'ask';
  question: string | null;
  answer: string;
  created_at: string;
}

export interface HistoryRow {
  query_id: number;
  type: string;
  question: string | null;
  answer: string;
  created_at: string;
  session_started_at: string;
}

// ─── DB Adapter Interface ─────────────────────────────────────────────────────
export interface DbAdapter {
  findUserByGoogleId(googleId: string): Promise<User | null>;
  createUser(data: { google_id: string; name: string; email: string | null; avatar_url: string | null }): Promise<User>;
  createSession(userId: number): Promise<Session>;
  createQuery(data: { session_id: number; type: 'describe' | 'ask'; question: string | null; answer: string }): Promise<Query>;
  getScansToday(userId: number): Promise<number>;
  getQuestionsThisWeek(userId: number): Promise<number>;
  getTotalSessions(userId: number): Promise<number>;
  getHistory(userId: number, limit: number, offset: number): Promise<HistoryRow[]>;
  getHistoryCount(userId: number): Promise<number>;
}

// ─── PostgreSQL Adapter ───────────────────────────────────────────────────────
async function createPgAdapter(): Promise<DbAdapter> {
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  return {
    async findUserByGoogleId(googleId) {
      const r = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
      return r.rows[0] ?? null;
    },
    async createUser(data) {
      const r = await pool.query(
        'INSERT INTO users (google_id, name, email, avatar_url) VALUES ($1,$2,$3,$4) RETURNING *',
        [data.google_id, data.name, data.email, data.avatar_url]
      );
      return r.rows[0];
    },
    async createSession(userId) {
      const r = await pool.query('INSERT INTO sessions (user_id) VALUES ($1) RETURNING *', [userId]);
      return r.rows[0];
    },
    async createQuery(data) {
      const r = await pool.query(
        'INSERT INTO queries (session_id, type, question, answer) VALUES ($1,$2,$3,$4) RETURNING *',
        [data.session_id, data.type, data.question, data.answer]
      );
      return r.rows[0];
    },
    async getScansToday(userId) {
      const r = await pool.query(
        `SELECT COUNT(*) FROM queries q JOIN sessions s ON s.id = q.session_id
         WHERE s.user_id = $1 AND q.type = 'describe' AND q.created_at >= NOW() - INTERVAL '1 day'`,
        [userId]
      );
      return parseInt(r.rows[0].count, 10);
    },
    async getQuestionsThisWeek(userId) {
      const r = await pool.query(
        `SELECT COUNT(*) FROM queries q JOIN sessions s ON s.id = q.session_id
         WHERE s.user_id = $1 AND q.type = 'ask' AND q.created_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      );
      return parseInt(r.rows[0].count, 10);
    },
    async getTotalSessions(userId) {
      const r = await pool.query('SELECT COUNT(*) FROM sessions WHERE user_id = $1', [userId]);
      return parseInt(r.rows[0].count, 10);
    },
    async getHistory(userId, limit, offset) {
      const r = await pool.query(
        `SELECT q.id as query_id, q.type, q.question, q.answer, q.created_at, s.started_at as session_started_at
         FROM queries q JOIN sessions s ON s.id = q.session_id
         WHERE s.user_id = $1 ORDER BY q.created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      return r.rows;
    },
    async getHistoryCount(userId) {
      const r = await pool.query(
        'SELECT COUNT(*) FROM queries q JOIN sessions s ON s.id = q.session_id WHERE s.user_id = $1',
        [userId]
      );
      return parseInt(r.rows[0].count, 10);
    },
  };
}

// ─── sql.js Adapter (pure-JS SQLite, no native build needed) ─────────────────
// sql.js stores data in memory; we persist to a file on writes.
let sqliteDbInstance: any = null;
const DB_PATH = path.resolve(__dirname, '../../../seesay.db');

async function getSqliteDb() {
  if (sqliteDbInstance) return sqliteDbInstance;
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqliteDbInstance = new SQL.Database(fileBuffer);
  } else {
    sqliteDbInstance = new SQL.Database();
  }
  return sqliteDbInstance;
}

function persistDb(db: any) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function sqliteQuery(db: any, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function sqliteRun(db: any, sql: string, params: any[] = []) {
  db.run(sql, params);
  persistDb(db);
}

async function createSqliteAdapter(): Promise<DbAdapter> {
  const db = await getSqliteDb();

  return {
    async findUserByGoogleId(googleId) {
      const rows = sqliteQuery(db, 'SELECT * FROM users WHERE google_id = ?', [googleId]);
      return (rows[0] as User) ?? null;
    },
    async createUser(data) {
      sqliteRun(
        db,
        'INSERT INTO users (google_id, name, email, avatar_url, created_at) VALUES (?,?,?,?,datetime(\'now\'))',
        [data.google_id, data.name, data.email, data.avatar_url]
      );
      const rows = sqliteQuery(db, 'SELECT * FROM users WHERE google_id = ?', [data.google_id]);
      return rows[0] as User;
    },
    async createSession(userId) {
      sqliteRun(db, 'INSERT INTO sessions (user_id, started_at) VALUES (?,datetime(\'now\'))', [userId]);
      const rows = sqliteQuery(db, 'SELECT * FROM sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
      return rows[0] as Session;
    },
    async createQuery(data) {
      sqliteRun(
        db,
        'INSERT INTO queries (session_id, type, question, answer, created_at) VALUES (?,?,?,?,datetime(\'now\'))',
        [data.session_id, data.type, data.question ?? null, data.answer]
      );
      const rows = sqliteQuery(db, 'SELECT * FROM queries WHERE session_id = ? ORDER BY id DESC LIMIT 1', [data.session_id]);
      return rows[0] as Query;
    },
    async getScansToday(userId) {
      const rows = sqliteQuery(db,
        `SELECT COUNT(*) as c FROM queries q JOIN sessions s ON s.id = q.session_id
         WHERE s.user_id = ? AND q.type = 'describe' AND q.created_at >= datetime('now', '-1 day')`,
        [userId]
      );
      return Number(rows[0]?.c ?? 0);
    },
    async getQuestionsThisWeek(userId) {
      const rows = sqliteQuery(db,
        `SELECT COUNT(*) as c FROM queries q JOIN sessions s ON s.id = q.session_id
         WHERE s.user_id = ? AND q.type = 'ask' AND q.created_at >= datetime('now', '-7 days')`,
        [userId]
      );
      return Number(rows[0]?.c ?? 0);
    },
    async getTotalSessions(userId) {
      const rows = sqliteQuery(db, 'SELECT COUNT(*) as c FROM sessions WHERE user_id = ?', [userId]);
      return Number(rows[0]?.c ?? 0);
    },
    async getHistory(userId, limit, offset) {
      return sqliteQuery(db,
        `SELECT q.id as query_id, q.type, q.question, q.answer, q.created_at, s.started_at as session_started_at
         FROM queries q JOIN sessions s ON s.id = q.session_id
         WHERE s.user_id = ? ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      ) as HistoryRow[];
    },
    async getHistoryCount(userId) {
      const rows = sqliteQuery(db,
        'SELECT COUNT(*) as c FROM queries q JOIN sessions s ON s.id = q.session_id WHERE s.user_id = ?',
        [userId]
      );
      return Number(rows[0]?.c ?? 0);
    },
  };
}

// ─── Singleton ────────────────────────────────────────────────────────────────
let adapterPromise: Promise<DbAdapter> | null = null;

export async function getDb(): Promise<DbAdapter> {
  if (!adapterPromise) {
    adapterPromise = process.env.DATABASE_URL ? createPgAdapter() : createSqliteAdapter();
  }
  return adapterPromise;
}
