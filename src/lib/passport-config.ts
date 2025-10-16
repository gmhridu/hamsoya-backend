import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { GoogleAuthService, type GoogleUserProfile, type GoogleTokens } from '../services/google-auth.service';
import { getConfig } from './env';

export function configurePassport(env: any) {
  const config = getConfig(env);

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleOAuth.clientId,
        clientSecret: config.googleOAuth.clientSecret,
        callbackURL: config.googleOAuth.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleAuthService = new GoogleAuthService(env);

          // Transform Google profile to our format
          const userProfile: GoogleUserProfile = {
            id: profile.id,
            email: profile.emails?.[0]?.value || '',
            name: profile.displayName || '',
            picture: profile.photos?.[0]?.value,
            verified_email: profile.emails?.[0]?.verified || false,
          };

          // Transform tokens to our format
          const tokens: GoogleTokens = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 3600, // Default 1 hour, Google doesn't provide this in the callback
            token_type: 'Bearer',
          };

          const result = await googleAuthService.findOrCreateUser(userProfile, tokens);

          // Return user data for session storage
          return done(null, {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            profile_image_url: result.user.profile_image_url,
            is_verified: result.user.is_verified,
            isNewUser: result.isNewUser,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          });
        } catch (error) {
          console.error('Google OAuth Strategy Error:', error);
          return done(error, false);
        }
      }
    )
  );

  // Serialize user for session storage
  passport.serializeUser((user: any, done) => {
    // Store minimal user data in session
    done(null, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profile_image_url: user.profile_image_url,
      is_verified: user.is_verified,
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
    });
  });

  // Deserialize user from session storage
  passport.deserializeUser((sessionUser: any, done) => {
    // Return user data from session
    done(null, sessionUser);
  });

  return passport;
}

// Middleware to initialize Passport
export function initializePassport(env: any) {
  const configuredPassport = configurePassport(env);
  return [
    configuredPassport.initialize(),
    configuredPassport.session(),
  ];
}

// Helper function to check if user is authenticated
export function ensureAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }

  // Redirect to login or return 401 based on request type
  const acceptHeader = req.headers.accept || '';
  if (acceptHeader.includes('application/json')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // For web requests, redirect to login
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  res.redirect(`${frontendUrl}/login`);
}

// Helper function to check if user has specific role
export function ensureRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Helper function to get user from request
export function getAuthenticatedUser(req: any) {
  return req.isAuthenticated() ? req.user : null;
}
