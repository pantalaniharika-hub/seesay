import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from './server/src/auth/passport';
import apiRouter from './server/src/routes/api';
import { requireAuth } from './server/src/middleware/auth';

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ─── Session Store ────────────────────────────────────────────────────────────
async function buildSessionStore() {
  if (process.env.DATABASE_URL) {
    const connectPg = (await import('connect-pg-simple')).default;
    const { Pool } = await import('pg');
    const PgStore = connectPg(session);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProd ? { rejectUnauthorized: false } : false,
    });
    return new PgStore({ pool, tableName: 'http_sessions', createTableIfMissing: true });
  }
  return undefined;
}

export async function createApp() {
  const store = await buildSessionStore();

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
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, done) => { done(null, user); });
  passport.deserializeUser((user: Express.User, done) => { done(null, user); });

  // Auth routes
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
    (_req: Request, res: Response) => { res.redirect('/dashboard'); }
  );

  // API routes
  app.use('/api', apiRouter);

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export default app;
