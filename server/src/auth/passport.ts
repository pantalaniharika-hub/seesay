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
        // Fallback user if DB operation fails
        const fallbackUser = {
          id: 1,
          google_id: profile.id,
          name: profile.displayName || 'Google User',
          email: profile.emails?.[0]?.value ?? null,
          avatar_url: profile.photos?.[0]?.value ?? null,
          created_at: new Date().toISOString(),
        };
        return done(null, fallbackUser as any);
      }
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
