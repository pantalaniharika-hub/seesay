import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDb } from '../db';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-google-client-secret',
      callbackURL: process.env.APP_URL
        ? `${process.env.APP_URL}/auth/google/callback`
        : 'https://seesay-dun.vercel.app/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      const googleName = profile.displayName || profile.name?.givenName || (profile.emails?.[0]?.value ? profile.emails[0].value.split('@')[0] : 'Pantala Niharika');
      const googleUser = {
        id: 1,
        google_id: profile.id,
        name: googleName,
        email: profile.emails?.[0]?.value ?? 'pantalaniharika@gmail.com',
        avatar_url: profile.photos?.[0]?.value ?? null,
        created_at: new Date().toISOString(),
      };
      if (process.env.DATABASE_URL) {
        try {
          const db = await getDb();
          let user = await db.findUserByGoogleId(profile.id);
          if (!user) {
            user = await db.createUser({
              google_id: profile.id,
              name: googleName,
              email: profile.emails?.[0]?.value ?? null,
              avatar_url: profile.photos?.[0]?.value ?? null,
            });
          }
          return done(null, user);
        } catch {}
      }
      return done(null, googleUser as any);
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  done(null, user);
});

passport.deserializeUser((user: Express.User, done) => {
  done(null, user);
});

export default passport;
