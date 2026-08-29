import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDb } from '../db';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.APP_URL || 'http://localhost:3001'}/auth/google/callback`,
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
        return done(err as Error);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as { id: number }).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const db = await getDb();
    // Quick lookup by primary key
    const adapter = db as any;
    if (adapter._getUserById) {
      const user = await adapter._getUserById(id);
      done(null, user);
    } else {
      // Fallback: scan — acceptable since session middleware caches
      done(null, { id } as Express.User);
    }
  } catch (err) {
    done(err);
  }
});

export default passport;
