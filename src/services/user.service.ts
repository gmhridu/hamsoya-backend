import { eq, InferSelectModel } from 'drizzle-orm';
import type { CreateUserData, UpdateUserData, UserProfile } from '../types/user';
import { AppError } from '../utils/error-handler';
import { users } from '@/db/schema';
import { db } from '@/db/db';

export type User = InferSelectModel<typeof users>

export class UserService {
  private db: typeof db;

  constructor() {
    this.db = db;
  }

  // Get user by ID
  async getUserById(id: string): Promise<UserProfile | null> {
    const result = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone_number: users.phone_number,
        profile_image_url: users.profile_image_url,
        is_verified: users.is_verified,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result.length > 0 ? (result[0] as UserProfile) : null;
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

    return result.length > 0 ? result[0] : null;
  }

  // Create new user
  async createUser(userData: CreateUserData): Promise<UserProfile> {
    // Check if user already exists
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Create user
    const [newUser] = await this.db
      .insert(users)
      .values({
        name: userData.name,
        email: userData.email,
        password_hash: userData.password_hash,
        role: userData.role,
        phone_number: userData.phone_number,
        is_verified: false,
      } as any)
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone_number: users.phone_number,
        is_verified: users.is_verified,
        created_at: users.created_at,
      });

    return newUser as UserProfile;
  }

  // Update user
  async updateUser(id: string, updateData: UpdateUserData): Promise<UserProfile> {
    // Check if user exists
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    // Update user
    const [updatedUser] = await this.db
      .update(users)
      .set({
        ...updateData,
        updated_at: new Date(),
      } as any)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone_number: users.phone_number,
        is_verified: users.is_verified,
        created_at: users.created_at,
      });

    return updatedUser as UserProfile;
  }

  // Verify user email
  async verifyUserEmail(email: string): Promise<UserProfile> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.is_verified) {
      throw new AppError('User is already verified', 400);
    }

    return await this.updateUser(user.id, { is_verified: true });
  }

  // Delete user (soft delete by setting is_verified to false)
  async deleteUser(id: string): Promise<{ message: string }> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // In a real application, you might want to implement soft delete
    // For now, we'll just mark as unverified
    await this.updateUser(id, { is_verified: false });

    return { message: 'User deleted successfully' };
  }

  // Check if user exists
  async userExists(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    return !!user;
  }

  // Get user stats (for admin purposes)
  async getUserStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    sellers: number;
    users: number;
  }> {
    // This would require more complex queries in a real application
    // For now, return a simple implementation
    const allUsers = await this.db.select().from(users);

    const stats = {
      total: allUsers.length,
      verified: allUsers.filter(u => u.is_verified).length,
      unverified: allUsers.filter(u => !u.is_verified).length,
      sellers: allUsers.filter(u => u.role === 'SELLER').length,
      users: allUsers.filter(u => u.role === 'USER').length,
    };

    return stats;
  }
}
