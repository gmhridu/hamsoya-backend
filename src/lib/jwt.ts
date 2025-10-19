import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../types/auth';

// JWT configuration
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '5m', // 5 minutes
  REFRESH_TOKEN_EXPIRY: '30d', // 30 days
  ALGORITHM: 'HS256' as const,
};

// Get JWT secrets from environment
const getJWTSecrets = (env?: any) => {
  const accessSecret = env?.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET;
  const refreshSecret = env?.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables are required');
  }

  // Validate secret length (minimum 32 characters for security)
  if (accessSecret.length < 32) {
    throw new Error(`JWT_ACCESS_SECRET must be at least 32 characters long. Current length: ${accessSecret.length}`);
  }

  if (refreshSecret.length < 32) {
    throw new Error(`JWT_REFRESH_SECRET must be at least 32 characters long. Current length: ${refreshSecret.length}`);
  }

  return { accessSecret, refreshSecret };
};

// Generate access token
export const generateAccessToken = (
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  env?: any
): string => {
  const { accessSecret } = getJWTSecrets(env);

  const options: jwt.SignOptions = {
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY as any,
    algorithm: JWT_CONFIG.ALGORITHM,
  };

  return jwt.sign(payload, accessSecret, options);
};

// Generate refresh token
export const generateRefreshToken = (
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  env?: any
): string => {
  const { refreshSecret } = getJWTSecrets(env);

  const options: jwt.SignOptions = {
    expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY as any,
    algorithm: JWT_CONFIG.ALGORITHM,
  };

  return jwt.sign(payload, refreshSecret, options);
};

// Verify access token
export const verifyAccessToken = (token: string, env?: any): JWTPayload => {
  const { accessSecret } = getJWTSecrets(env);

  try {
    const decoded = jwt.verify(token, accessSecret, {
      algorithms: [JWT_CONFIG.ALGORITHM],
    }) as jwt.JwtPayload & JWTPayload;

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      profile_image_url: decoded.profile_image_url,
      is_verified: decoded.is_verified,
      created_at: decoded.created_at,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string, env?: any): JWTPayload => {
  const { refreshSecret } = getJWTSecrets(env);

  try {
    const decoded = jwt.verify(token, refreshSecret, {
      algorithms: [JWT_CONFIG.ALGORITHM],
    }) as jwt.JwtPayload & JWTPayload;

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      profile_image_url: decoded.profile_image_url,
      is_verified: decoded.is_verified,
      created_at: decoded.created_at,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

// Decode token without verification (for debugging)
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};

// Get token expiry time
export const getTokenExpiry = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return null;

  return new Date(decoded.exp * 1000);
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;

  return expiry.getTime() < Date.now();
};
