import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from './auth/passport';
import apiRouter from './routes/api';
import { requireAuth } from './middleware/auth';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const isProd = process.env.NODE_ENV === 'production';

// ─── Session Store ─────────────────────────────────────────────────────────────
async function buildSessionStore() {
  if (process.env.DATABASE_URL) {
    const connectPg = (await import('connect-pg-simple')).default;
    const { Pool } = await import('pg');
    const PgStore = connectPg(session);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProd ? { rejectUnauthorized: false } : false,
    });
    return new PgStore({ pool, tableName: 'http_sessions', createTableIfMissing: false });
  }
  // MemoryStore for SQLite dev (acceptable for single-process dev)
  return undefined;
}

async function startServer() {
  const store = await buildSessionStore();

  // ─── Middleware ─────────────────────────────────────────────────────────────
  app.set('trust proxy', 1);
  app.use(cors({ origin: isProd ? false : 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    session({
      store,
      secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: isProd ? 'lax' : 'lax',
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Patch deserializeUser to attach full user object from session data
  // Store full user in session so we don't need a getUserById query
  passport.serializeUser((user: Express.User, done) => {
    done(null, user); // store entire user object
  });
  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  // ─── Auth Routes ────────────────────────────────────────────────────────────
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
    (req: Request, res: Response) => {
      res.redirect('/dashboard');
    }
  );

  // ─── API Routes ─────────────────────────────────────────────────────────────
  app.use('/api', apiRouter);

  // ─── Static Frontend ─────────────────────────────────────────────────────────
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));

    // Dashboard — protected server-side redirect if not authed
    app.get('/dashboard*', requireAuth, (_req: Request, res: Response) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });

    // SPA fallback
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => res.send('SeeSay API running. Build the client first.'));
  }

  // ─── Error Handler ──────────────────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`🚀 SeeSay server running on http://localhost:${PORT}`);
    console.log(`📦 Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite (dev)'}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
