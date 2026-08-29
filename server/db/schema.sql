-- ============================================================
-- SeeSay Database Schema
-- Compatible with PostgreSQL (production) and SQLite (dev fallback)
-- ============================================================

-- Users created via Google OAuth
CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  google_id TEXT    UNIQUE NOT NULL,
  name      TEXT    NOT NULL,
  email     TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Each app session (login → use → logout or abandon)
CREATE TABLE IF NOT EXISTS sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW()
);

-- Every describe/ask exchange
CREATE TABLE IF NOT EXISTS queries (
  id         SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL CHECK (type IN ('describe', 'ask')),
  question   TEXT,              -- null for 'describe' type
  answer     TEXT    NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- connect-pg-simple session store table
CREATE TABLE IF NOT EXISTS http_sessions (
  sid    VARCHAR        NOT NULL PRIMARY KEY,
  sess   JSON           NOT NULL,
  expire TIMESTAMP(6)  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_http_sessions_expire ON http_sessions (expire);
