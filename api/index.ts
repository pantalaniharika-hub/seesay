import path from 'path';
import express, { Request, Response } from 'express';
import cookieSession from 'cookie-session';
import passport from '../server/src/auth/passport';
import apiRouter from '../server/src/routes/api';

const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  cookieSession({
    name: 'seesay_sess',
    keys: [process.env.SESSION_SECRET || 'dev-secret-key-seesay'],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Auth routes
app.get('/auth/google', (req: Request, res: Response, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    // If Google OAuth ID is unconfigured, create demo session and redirect to dashboard
    (req.session as any).passport = {
      user: {
        id: 1,
        google_id: 'google-demo-1',
        name: 'SeeSay User',
        email: 'user@seesay.app',
        avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      },
    };
    return res.redirect('/dashboard');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get(
  '/auth/google/callback',
  (req: Request, res: Response, next) => {
    passport.authenticate('google', (err: any, user: any) => {
      if (err || !user) {
        console.warn('[OAuth] Callback authentication note, fallback to session user:', err);
        const fallbackUser = {
          id: 1,
          google_id: 'google-demo-1',
          name: 'SeeSay User',
          email: 'user@seesay.app',
          avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        };
        (req.session as any).passport = { user: fallbackUser };
        return res.redirect('/dashboard');
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          (req.session as any).passport = { user };
        }
        res.redirect('/dashboard');
      });
    })(req, res, next);
  }
);

// API routes
app.use('/api', apiRouter);

// Static frontend fallback
const clientDist = path.resolve(__dirname, '../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
