import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express, { Request, Response, NextFunction } from 'express';
import cookieSession from 'cookie-session';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDb } from './server/src/db/index';
import apiRouter from './server/src/routes/api';

const isProd = process.env.NODE_ENV === 'production';

// ─── Passport setup ───────────────────────────────────────────────────────────
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
        } catch (err) {
          console.error('Passport strategy error:', err);
          return done(err as Error);
        }
      }
    )
  );
  passport.serializeUser((user: Express.User, done) => done(null, user));
  passport.deserializeUser((user: Express.User, done) => done(null, user));
}

// ─── App factory (singleton) ──────────────────────────────────────────────────
let appInstance: express.Express | null = null;

export async function createApp(): Promise<express.Express> {
  if (appInstance) return appInstance;

  const app = express();
  app.set('trust proxy', 1);

  app.use(cors({ origin: isProd ? false : 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Cookie-based session (works across serverless invocations) ──────────────
  // Session data lives in a signed cookie — no server-side store needed.
  // Max ~4KB; fine for storing the passport user object.
  app.use(
    cookieSession({
      name: 'seesay_session',
      secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: isProd,
      httpOnly: true,
      sameSite: 'lax',
    })
  );

  // Passport requires session.save / session.regenerate shims with cookie-session
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.session && !req.session.save) {
      (req.session as any).save = (cb: () => void) => cb?.();
    }
    if (req.session && !req.session.regenerate) {
      (req.session as any).regenerate = (cb: () => void) => cb?.();
    }
    next();
  });

  setupPassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // ─── Auth routes ─────────────────────────────────────────────────────────────
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
    (_req: Request, res: Response) => res.redirect('/dashboard')
  );

  // ─── API routes ───────────────────────────────────────────────────────────────
  app.use('/api', apiRouter);

  // ─── Static files + SPA fallback (local dev / non-Vercel) ───────────────────
  const distPath = path.resolve(process.cwd(), 'client/dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ─── Error handler ────────────────────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[SeeSay Error]', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  });

  appInstance = app;
  return app;
}

export default createApp;
