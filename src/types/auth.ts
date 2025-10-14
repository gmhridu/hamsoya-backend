import { z } from 'zod';

// User roles
export const UserRole = z.enum(['USER', 'SELLER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRole>;

// Registration schema
export const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
    role: UserRole.default('USER'),
    phone_number: z.string().optional(),
    profile_image_url: z.string().url().optional(),
  })
  .refine(
    data => {
      // Phone number is required for sellers
      if (data.role === 'SELLER' && !data.phone_number) {
        return false;
      }
      return true;
    },
    {
      message: 'Phone number is required for sellers',
      path: ['phone_number'],
    }
  );

// Login schema
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// OTP verification schema
export const VerifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

// Forgot password schema
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Reset password schema
export const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
});

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  role: UserRole;
  profile_image_url?: string;
  is_verified?: boolean;
  created_at?: string;
  iat?: number;
  exp?: number;
}

// Auth context interface
export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isVerified: boolean;
  } | null;
}

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type VerifyOTPInput = z.infer<typeof VerifyOTPSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
