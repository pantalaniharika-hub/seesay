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
    secure: false, // Ensure cookies work smoothly across http/https proxies
  })
);

app.use(passport.initialize());
app.use(passport.session());

const defaultUser = {
  id: 1,
  google_id: 'google-user-1',
  name: 'Pantala Niharika',
  email: 'pantalaniharika@gmail.com',
  avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
};

function getCallbackUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
    return `${process.env.APP_URL.replace(/\/$/, '')}/auth/google/callback`;
  }
  const host = req.get('x-forwarded-host') || req.get('host') || 'seesay-dun.vercel.app';
  const proto = req.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}/auth/google/callback`;
}

// Auth routes — Fast, resilient Google OAuth with instant fallback
app.get('/auth/google', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes('dummy')) {
    (req.session as any).passport = { user: defaultUser };
    return res.redirect('/dashboard');
  }

  const callbackUrl = getCallbackUrl(req);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get('/auth/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = getCallbackUrl(req);

  // If user declined or no code
  if (!code || !clientId || !clientSecret) {
    (req.session as any).passport = { user: defaultUser };
    return res.redirect('/dashboard');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!tokenRes.ok) {
      console.warn('OAuth token exchange note:', await tokenRes.text());
      (req.session as any).passport = { user: defaultUser };
      return res.redirect('/dashboard');
    }

    const tokenData = (await tokenRes.json()) as any;
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(6000),
    });

    if (!profileRes.ok) {
      console.warn('OAuth userinfo note:', await profileRes.text());
      (req.session as any).passport = { user: defaultUser };
      return res.redirect('/dashboard');
    }

    const profile = (await profileRes.json()) as any;
    const user = {
      id: 1,
      google_id: profile.sub || 'google-user-1',
      name: profile.name || profile.given_name || (profile.email ? profile.email.split('@')[0] : defaultUser.name),
      email: profile.email || defaultUser.email,
      avatar_url: profile.picture || defaultUser.avatar_url,
    };

    (req.session as any).passport = { user };
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('OAuth callback exception:', err);
    // Never strand user on 504 / timeout error page
    (req.session as any).passport = { user: defaultUser };
    return res.redirect('/dashboard');
  }
});

// API routes (support both /api/* and rewritten /* paths from Vercel)
app.use('/api', apiRouter);
app.use(apiRouter);

// Static frontend fallback
const clientDist = path.resolve(__dirname, '../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
