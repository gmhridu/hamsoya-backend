import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),

  // Redis
  REDIS_URL: z.string().url('Invalid Redis URL'),

  // JWT Secrets
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT access secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),

  // SMTP Configuration
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default(465),
  SMTP_SERVICE: z.string().default('gmail'),
  SMTP_USER: z.string().email('Invalid SMTP user email'),
  SMTP_PASSWORD: z.string().min(1, 'SMTP password is required'),

  // Application URLs
  FRONTEND_URL: z.string().url('Invalid frontend URL').default('http://localhost:5000'),
  BACKEND_URL: z.string().url('Invalid backend URL').default('http://localhost:8787'),

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google Client ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google Client Secret is required'),
  GOOGLE_CALLBACK_URL: z.string().url('Invalid Google callback URL'),

  // Session Configuration
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  SESSION_NAME: z.string().default('hamsoya_session'),
  SESSION_MAX_AGE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).default(86400000),

  // Optional ImageKit configuration (for reference)
  IMAGEKIT_PUBLIC_KEY: z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  IMAGEKIT_URL_ENDPOINT: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Validate environment variables
export const validateEnv = (env: Record<string, any>): Env => {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');

      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
};

// Get validated environment variables
export const getEnv = (env?: Record<string, any>): Env => {
  const envVars = env || process.env;
  return validateEnv(envVars);
};

// Check if all required environment variables are set
export const checkRequiredEnvVars = (env?: Record<string, any>): boolean => {
  try {
    validateEnv(env || process.env);
    return true;
  } catch {
    return false;
  }
};

// Get environment-specific configuration
export const getConfig = (env?: Record<string, any>) => {
  const validatedEnv = getEnv(env);

  return {
    // Environment
    isDevelopment: validatedEnv.NODE_ENV === 'development',
    isProduction: validatedEnv.NODE_ENV === 'production',
    isTest: validatedEnv.NODE_ENV === 'test',

    // Database
    database: {
      url: validatedEnv.DATABASE_URL,
    },

    // Redis
    redis: {
      url: validatedEnv.REDIS_URL,
    },

    // JWT
    jwt: {
      accessSecret: validatedEnv.JWT_ACCESS_SECRET,
      refreshSecret: validatedEnv.JWT_REFRESH_SECRET,
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
    },

    // SMTP
    smtp: {
      host: validatedEnv.SMTP_HOST,
      port: validatedEnv.SMTP_PORT,
      service: validatedEnv.SMTP_SERVICE,
      user: validatedEnv.SMTP_USER,
      password: validatedEnv.SMTP_PASSWORD,
    },

    // URLs
    urls: {
      frontend: validatedEnv.FRONTEND_URL,
      backend: validatedEnv.BACKEND_URL,
    },

    // Google OAuth
    googleOAuth: {
      clientId: validatedEnv.GOOGLE_CLIENT_ID,
      clientSecret: validatedEnv.GOOGLE_CLIENT_SECRET,
      callbackUrl: validatedEnv.GOOGLE_CALLBACK_URL,
    },

    // Session Configuration
    session: {
      secret: validatedEnv.SESSION_SECRET,
      name: validatedEnv.SESSION_NAME,
      maxAge: validatedEnv.SESSION_MAX_AGE,
      secure: validatedEnv.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    },

    // Security
    security: {
      bcryptRounds: 12,
      otpLength: 6,
      otpExpiryMinutes: 10,
      cookieSecure: validatedEnv.NODE_ENV === 'production',
      cookieSameSite: 'strict' as const,
    },

    // Rate limiting
    rateLimit: {
      otpCooldownSeconds: 60,
      maxOtpAttemptsPerHour: 2,
      wrongAttemptsLockMinutes: 30,
      hourLockMinutes: 60,
      maxWrongAttempts: 3,
    },

    // ImageKit (optional)
    imageKit: validatedEnv.IMAGEKIT_PUBLIC_KEY ? {
      publicKey: validatedEnv.IMAGEKIT_PUBLIC_KEY,
      privateKey: validatedEnv.IMAGEKIT_PRIVATE_KEY!,
      urlEndpoint: validatedEnv.IMAGEKIT_URL_ENDPOINT!,
    } : undefined,
  };
};

// Export types
export type Config = ReturnType<typeof getConfig>;
