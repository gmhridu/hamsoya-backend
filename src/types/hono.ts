import type { UserRole } from './auth';

export interface ContextUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
  authMethod?: 'oauth' | 'jwt';
}

export type HonoEnv = {
  Variables: {
    user: ContextUser;
  };
  Bindings: {
    NODE_ENV?: string;
    FRONTEND_URL?: string;
    BACKEND_URL?: string;
    DATABASE_URL?: string;
    REDIS_URL?: string;
    JWT_SECRET?: string;
    JWT_REFRESH_SECRET?: string;
    IMAGEKIT_PUBLIC_KEY?: string;
    IMAGEKIT_PRIVATE_KEY?: string;
    IMAGEKIT_URL_ENDPOINT?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_CALLBACK_URL?: string;
    SESSION_SECRET?: string;
    SESSION_NAME?: string;
    SESSION_MAX_AGE?: number;
    [key: string]: any;
  };
};
