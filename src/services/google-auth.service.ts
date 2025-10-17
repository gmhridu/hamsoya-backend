import { eq } from 'drizzle-orm';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';
import { AppError } from '../utils/error-handler';
import { users } from '@/db/schema';
import { User } from './auth.service';



export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export class GoogleAuthService {
  private env: any;

  constructor(env: any) {
    this.env = env;
  }

  private get db() {
    // Lazy import to avoid initialization at module load time
    const { db } = require('@/db/db');
    return db;
  }

  async findOrCreateUser(
    profile: GoogleUserProfile,
    tokens: GoogleTokens
  ): Promise<{
    user: Omit<User, 'password_hash'>;
    isNewUser: boolean;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // First, try to find user by Google ID
      let existingUser = await this.db
        .select()
        .from(users)
        .where(eq(users.google_id, profile.id))
        .limit(1);

      // If not found by Google ID, try to find by email
      if (existingUser.length === 0) {
        existingUser = await this.db
          .select()
          .from(users)
          .where(eq(users.email, profile.email))
          .limit(1);
      }

      let user: User;
      let isNewUser = false;

      if (existingUser.length > 0) {
        // Update existing user with Google OAuth data
        const updatedUsers = await this.db
          .update(users)
          .set({
            google_id: profile.id,
            oauth_provider: 'google',
            oauth_access_token: this.encryptToken(tokens.access_token),
            oauth_refresh_token: tokens.refresh_token ? this.encryptToken(tokens.refresh_token) : null,
            oauth_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
            profile_image_url: profile.picture || existingUser[0].profile_image_url,
            is_verified: profile.verified_email || existingUser[0].is_verified,
            updated_at: new Date(),
          } as any)
          .where(eq(users.id, existingUser[0].id))
          .returning();

        user = updatedUsers[0];
      } else {
        // Create new user
        const newUsers = await this.db
          .insert(users)
          .values({
            name: profile.name,
            email: profile.email,
            google_id: profile.id,
            oauth_provider: 'google',
            oauth_access_token: this.encryptToken(tokens.access_token),
            oauth_refresh_token: tokens.refresh_token ? this.encryptToken(tokens.refresh_token) : null,
            oauth_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
            profile_image_url: profile.picture,
            is_verified: profile.verified_email,
            role: 'USER',
            created_at: new Date(),
            updated_at: new Date(),
          } as any)
          .returning();

        user = newUsers[0];
        isNewUser = true;
      }

      // Generate JWT tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'USER' | 'SELLER' | 'ADMIN',
        profile_image_url: user.profile_image_url || undefined,
        is_verified: user.is_verified,
      };

      const accessToken = generateAccessToken(tokenPayload, this.env);
      const refreshToken = generateRefreshToken(tokenPayload, this.env);

      // Remove sensitive data from user object
      const { password_hash, oauth_access_token, oauth_refresh_token, ...safeUser } = user;
      const userWithoutSensitiveData = safeUser as Omit<User, 'password_hash'>;

      return {
        user: userWithoutSensitiveData,
        isNewUser,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('Error in findOrCreateUser:', error);
      throw new AppError('Failed to process Google authentication', 500);
    }
  }

  async linkGoogleAccount(
    userId: string,
    profile: GoogleUserProfile,
    tokens: GoogleTokens
  ): Promise<User> {
    try {
      // Check if Google account is already linked to another user
      const existingGoogleUser = await this.db
        .select()
        .from(users)
        .where(eq(users.google_id, profile.id))
        .limit(1);

      if (existingGoogleUser.length > 0 && existingGoogleUser[0].id !== userId) {
        throw new AppError('This Google account is already linked to another user', 400);
      }

      // Update user with Google OAuth data
      const updatedUsers = await this.db
        .update(users)
        .set({
          google_id: profile.id,
          oauth_provider: 'google',
          oauth_access_token: this.encryptToken(tokens.access_token),
          oauth_refresh_token: tokens.refresh_token ? this.encryptToken(tokens.refresh_token) : null,
          oauth_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
          profile_image_url: profile.picture,
          updated_at: new Date(),
        } as any)
        .where(eq(users.id, userId))
        .returning();

      if (updatedUsers.length === 0) {
        throw new AppError('User not found', 404);
      }

      return updatedUsers[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error linking Google account:', error);
      throw new AppError('Failed to link Google account', 500);
    }
  }

  async unlinkGoogleAccount(userId: string): Promise<User> {
    try {
      const updatedUsers = await this.db
        .update(users)
        .set({
          google_id: null,
          oauth_provider: null,
          oauth_access_token: null,
          oauth_refresh_token: null,
          oauth_token_expires_at: null,
          updated_at: new Date(),
        } as any)
        .where(eq(users.id, userId))
        .returning();

      if (updatedUsers.length === 0) {
        throw new AppError('User not found', 404);
      }

      return updatedUsers[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error unlinking Google account:', error);
      throw new AppError('Failed to unlink Google account', 500);
    }
  }

  async refreshGoogleTokens(userId: string): Promise<GoogleTokens | null> {
    try {
      const user = await this.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0 || !user[0].oauth_refresh_token) {
        return null;
      }

      const refreshToken = this.decryptToken(user[0].oauth_refresh_token);

      // Make request to Google to refresh tokens
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.env.GOOGLE_CLIENT_ID,
          client_secret: this.env.GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Google tokens');
      }

      const tokens: GoogleTokens = await response.json();

      // Update user with new tokens
      await this.db
        .update(users)
        .set({
          oauth_access_token: this.encryptToken(tokens.access_token),
          oauth_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
          updated_at: new Date(),
        } as any)
        .where(eq(users.id, userId));

      return tokens;
    } catch (error) {
      console.error('Error refreshing Google tokens:', error);
      return null;
    }
  }

  private encryptToken(token: string): string {
    // Simple base64 encoding for now - in production, use proper encryption
    return Buffer.from(token).toString('base64');
  }

  private decryptToken(encryptedToken: string): string {
    // Simple base64 decoding for now - in production, use proper decryption
    return Buffer.from(encryptedToken, 'base64').toString('utf-8');
  }
}
