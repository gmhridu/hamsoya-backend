import { and, count, desc, eq, ilike, isNull, or, sql, asc, gte, lte } from 'drizzle-orm';
import {
  getDb,
  users,
  orders,
  type User,
  type NewUser,
  insertUserSchema,
  updateUserSchema,
} from '../db';
import { AppError } from '../utils/error-handler';
import { hashPassword } from '../lib/crypto';

export interface AdminUserFilters {
  search?: string;
  role?: 'USER' | 'SELLER' | 'ADMIN';
  is_verified?: boolean;
  created_from?: Date;
  created_to?: Date;
  include_deleted?: boolean;
  sortBy?: 'name' | 'email' | 'role' | 'created_at' | 'updated_at' | 'is_verified';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AdminUserResponse {
  users: AdminUserWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AdminUserWithStats extends Omit<User, 'password_hash'> {
  total_orders?: number;
  total_spent?: number;
  last_order_date?: Date;
  days_since_registration?: number;
}

export interface AdminUserStats {
  total_users: number;
  verified_users: number;
  unverified_users: number;
  admin_users: number;
  seller_users: number;
  regular_users: number;
  deleted_users: number;
  users_this_month: number;
  users_growth_rate: number;
}

export interface CreateAdminUserData {
  name: string;
  email: string;
  password?: string;
  role: 'USER' | 'SELLER' | 'ADMIN';
  phone_number?: string;
  profile_image_url?: string;
  is_verified?: boolean;
  created_by: string;
}

export interface UpdateAdminUserData {
  name?: string;
  email?: string;
  role?: 'USER' | 'SELLER' | 'ADMIN';
  phone_number?: string;
  profile_image_url?: string;
  is_verified?: boolean;
  updated_by: string;
}

export interface SoftDeleteResponse {
  success: boolean;
  message: string;
  undo_token?: string;
  undo_expires_at?: Date;
}

export class AdminUserService {
  private db: ReturnType<typeof getDb>;

  constructor(env?: any) {
    this.db = getDb(env);
  }

  async getUsers(filters: AdminUserFilters = {}): Promise<AdminUserResponse> {
    const {
      search,
      role,
      is_verified,
      created_from,
      created_to,
      include_deleted = false,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const whereConditions = [];

    if (!include_deleted) {
      whereConditions.push(isNull(users.deleted_at));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone_number, `%${search}%`)
        )
      );
    }

    if (role) {
      whereConditions.push(eq(users.role, role));
    }

    if (is_verified !== undefined) {
      whereConditions.push(eq(users.is_verified, is_verified));
    }

    if (created_from) {
      whereConditions.push(gte(users.created_at, created_from));
    }

    if (created_to) {
      whereConditions.push(lte(users.created_at, created_to));
    }

    const orderByColumn = users[sortBy as keyof typeof users] || users.created_at;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const [usersResult, totalResult] = await Promise.all([
      this.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          phone_number: users.phone_number,
          profile_image_url: users.profile_image_url,
          is_verified: users.is_verified,
          created_at: users.created_at,
          updated_at: users.updated_at,
          deleted_at: users.deleted_at,
          total_orders: sql<number>`COALESCE(COUNT(DISTINCT ${orders.id}), 0)`,
          total_spent: sql<number>`COALESCE(SUM(${orders.total_amount}), 0)`,
          last_order_date: sql<Date>`MAX(${orders.created_at})`,
          days_since_registration: sql<number>`EXTRACT(DAY FROM NOW() - ${users.created_at})`,
        })
        .from(users)
        .leftJoin(orders, and(eq(users.id, orders.user_id), isNull(orders.deleted_at)))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .groupBy(users.id)
        .orderBy(orderDirection(orderByColumn))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: count() })
        .from(users)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      users: usersResult as AdminUserWithStats[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getUserById(id: string, include_deleted = false): Promise<AdminUserWithStats | null> {
    const whereConditions = [eq(users.id, id)];

    if (!include_deleted) {
      whereConditions.push(isNull(users.deleted_at));
    }

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
        updated_at: users.updated_at,
        deleted_at: users.deleted_at,
        created_by: users.created_by,
        updated_by: users.updated_by,
        deleted_by: users.deleted_by,
        total_orders: sql<number>`COALESCE(COUNT(DISTINCT ${orders.id}), 0)`,
        total_spent: sql<number>`COALESCE(SUM(${orders.total_amount}), 0)`,
        last_order_date: sql<Date>`MAX(${orders.created_at})`,
        days_since_registration: sql<number>`EXTRACT(DAY FROM NOW() - ${users.created_at})`,
      })
      .from(users)
      .leftJoin(orders, and(eq(users.id, orders.user_id), isNull(orders.deleted_at)))
      .where(and(...whereConditions))
      .groupBy(users.id)
      .limit(1);

    return result.length > 0 ? (result[0] as AdminUserWithStats) : null;
  }

  async createUser(userData: CreateAdminUserData): Promise<AdminUserWithStats> {
    const validatedData = insertUserSchema.parse({
      name: userData.name,
      email: userData.email,
      role: userData.role,
      phone_number: userData.phone_number,
      profile_image_url: userData.profile_image_url,
      is_verified: userData.is_verified ?? false,
      created_by: userData.created_by,
    });

    const existingUser = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, userData.email), isNull(users.deleted_at)))
      .limit(1);

    if (existingUser.length > 0) {
      throw new AppError('User with this email already exists', 409);
    }

    let password_hash: string | undefined;
    if (userData.password) {
      password_hash = await hashPassword(userData.password);
    }

    const [newUser] = await this.db
      .insert(users)
      .values({
        ...validatedData,
        password_hash,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone_number: users.phone_number,
        profile_image_url: users.profile_image_url,
        is_verified: users.is_verified,
        created_at: users.created_at,
        updated_at: users.updated_at,
      });

    return {
      ...newUser,
      total_orders: 0,
      total_spent: 0,
      days_since_registration: 0,
    } as AdminUserWithStats;
  }

  async updateUser(id: string, updateData: UpdateAdminUserData): Promise<AdminUserWithStats> {
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    const validatedData = updateUserSchema.parse(updateData);

    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, updateData.email), isNull(users.deleted_at)))
        .limit(1);

      if (emailExists.length > 0) {
        throw new AppError('Email already exists', 409);
      }
    }

    const [updatedUser] = await this.db
      .update(users)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone_number: users.phone_number,
        profile_image_url: users.profile_image_url,
        is_verified: users.is_verified,
        created_at: users.created_at,
        updated_at: users.updated_at,
      });

    const userWithStats = await this.getUserById(id);
    return userWithStats!;
  }

  async softDeleteUser(id: string, deleted_by: string): Promise<SoftDeleteResponse> {
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    if (existingUser.deleted_at) {
      throw new AppError('User is already deleted', 400);
    }

    await this.db
      .update(users)
      .set({
        deleted_at: new Date(),
        deleted_by,
        updated_at: new Date(),
      })
      .where(eq(users.id, id));

    const undo_token = `undo_user_${id}_${Date.now()}`;
    const undo_expires_at = new Date(Date.now() + 5000); // 5 seconds

    return {
      success: true,
      message: 'User deleted successfully',
      undo_token,
      undo_expires_at,
    };
  }

  async undoSoftDelete(id: string): Promise<AdminUserWithStats> {
    const existingUser = await this.getUserById(id, true);
    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    if (!existingUser.deleted_at) {
      throw new AppError('User is not deleted', 400);
    }

    await this.db
      .update(users)
      .set({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date(),
      })
      .where(eq(users.id, id));

    const restoredUser = await this.getUserById(id);
    return restoredUser!;
  }

  async permanentDeleteUser(id: string): Promise<{ message: string }> {
    const existingUser = await this.getUserById(id, true);
    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    await this.db.delete(users).where(eq(users.id, id));

    return { message: 'User permanently deleted' };
  }

  async bulkUpdateUsers(
    userIds: string[],
    updateData: Partial<UpdateAdminUserData>
  ): Promise<{ updated_count: number; message: string }> {
    if (userIds.length === 0) {
      throw new AppError('No user IDs provided', 400);
    }

    const validatedData = updateUserSchema.parse(updateData);

    const result = await this.db
      .update(users)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(and(
        sql`${users.id} = ANY(${userIds})`,
        isNull(users.deleted_at)
      ));

    return {
      updated_count: userIds.length,
      message: `${userIds.length} users updated successfully`,
    };
  }

  async bulkSoftDeleteUsers(
    userIds: string[],
    deleted_by: string
  ): Promise<{ deleted_count: number; message: string }> {
    if (userIds.length === 0) {
      throw new AppError('No user IDs provided', 400);
    }

    await this.db
      .update(users)
      .set({
        deleted_at: new Date(),
        deleted_by,
        updated_at: new Date(),
      })
      .where(and(
        sql`${users.id} = ANY(${userIds})`,
        isNull(users.deleted_at)
      ));

    return {
      deleted_count: userIds.length,
      message: `${userIds.length} users deleted successfully`,
    };
  }

  async getUserStats(): Promise<AdminUserStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      adminUsers,
      sellerUsers,
      regularUsers,
      deletedUsers,
      usersThisMonth,
      usersLastMonth,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(users).where(isNull(users.deleted_at)),
      this.db.select({ count: count() }).from(users).where(and(eq(users.is_verified, true), isNull(users.deleted_at))),
      this.db.select({ count: count() }).from(users).where(and(eq(users.is_verified, false), isNull(users.deleted_at))),
      this.db.select({ count: count() }).from(users).where(and(eq(users.role, 'ADMIN'), isNull(users.deleted_at))),
      this.db.select({ count: count() }).from(users).where(and(eq(users.role, 'SELLER'), isNull(users.deleted_at))),
      this.db.select({ count: count() }).from(users).where(and(eq(users.role, 'USER'), isNull(users.deleted_at))),
      this.db.select({ count: count() }).from(users).where(sql`${users.deleted_at} IS NOT NULL`),
      this.db.select({ count: count() }).from(users).where(and(gte(users.created_at, thirtyDaysAgo), isNull(users.deleted_at))),
      this.db.select({ count: count() }).from(users).where(and(
        gte(users.created_at, new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000)),
        lte(users.created_at, thirtyDaysAgo),
        isNull(users.deleted_at)
      )),
    ]);

    const currentMonthCount = usersThisMonth[0]?.count || 0;
    const lastMonthCount = usersLastMonth[0]?.count || 0;
    const growthRate = lastMonthCount > 0 ? ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

    return {
      total_users: totalUsers[0]?.count || 0,
      verified_users: verifiedUsers[0]?.count || 0,
      unverified_users: unverifiedUsers[0]?.count || 0,
      admin_users: adminUsers[0]?.count || 0,
      seller_users: sellerUsers[0]?.count || 0,
      regular_users: regularUsers[0]?.count || 0,
      deleted_users: deletedUsers[0]?.count || 0,
      users_this_month: currentMonthCount,
      users_growth_rate: Math.round(growthRate * 100) / 100,
    };
  }

  async searchUsers(query: string, limit = 10): Promise<AdminUserWithStats[]> {
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
        updated_at: users.updated_at,
      })
      .from(users)
      .where(and(
        or(
          ilike(users.name, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.phone_number, `%${query}%`)
        ),
        isNull(users.deleted_at)
      ))
      .limit(limit)
      .orderBy(desc(users.created_at));

    return result.map(user => ({
      ...user,
      total_orders: 0,
      total_spent: 0,
      days_since_registration: Math.floor((Date.now() - user.created_at.getTime()) / (1000 * 60 * 60 * 24)),
    })) as AdminUserWithStats[];
  }
}
