import { UserRole } from './auth';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone_number?: string;
  profile_image_url?: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone_number?: string;
  profile_image_url?: string;
  is_verified: boolean;
  created_at: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone_number?: string;
}

export interface UpdateUserData {
  name?: string;
  phone_number?: string;
  profile_image_url?: string;
  is_verified?: boolean;
}
