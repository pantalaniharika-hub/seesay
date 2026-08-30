import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDb } from './server/src/db/index';
import apiRouter from './server/src/routes/api';
import { requireAuth } from './server/src/middleware/auth';

const isProd = process.env.NODE_ENV === 'production';

// ─── Passport setup inline (avoids circular import issues on Vercel) ──────────
function setupPassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: `${process.env.APP_URL || ''}/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const db = await getDb();
          let user = await db.findUserByGoogleId(profile.id);
          if (!user) {
            user = await db.createUser({
              google_id: profile.id,
              name: profile.displayName,
              email: profile.emails?.[0]?.value ?? null,
              avatar_url: profile.photos?.[0]?.value ?? null,
            });
          }
          return done(null, user);
        } catch (err) { return done(err as Error); }
      }
    )
  );
  passport.serializeUser((user: Express.User, done) => { done(null, user); });
  passport.deserializeUser((user: Express.User, done) => { done(null, user); });
}

// ─── App factory ──────────────────────────────────────────────────────────────
let appInstance: express.Express | null = null;

export async function createApp(): Promise<express.Express> {
  if (appInstance) return appInstance;

  const app = express();
  app.set('trust proxy', 1);

  app.use(cors({ origin: isProd ? false : 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Session store
  let store: session.Store | undefined;
  if (process.env.DATABASE_URL) {
    const connectPg = (await import('connect-pg-simple')).default;
    const { Pool } = await import('pg');
    const PgStore = connectPg(session);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProd ? { rejectUnauthorized: false } : false,
    });
    store = new PgStore({ pool, tableName: 'http_sessions', createTableIfMissing: true });
  }

  app.use(session({
    store,
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: isProd, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' },
  }));

  setupPassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // Auth routes
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
    (_req: Request, res: Response) => { res.redirect('/dashboard'); }
  );

  // API
  app.use('/api', apiRouter);

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  appInstance = app;
  return app;
}

export default createApp;
