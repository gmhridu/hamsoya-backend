import { and, count, desc, eq, ilike, isNull, or, sql, asc, gte, lte, inArray } from 'drizzle-orm';
import {
  getDb,
  categories,
  products,
  type Category,
  type NewCategory,
  insertCategorySchema,
  updateCategorySchema,
} from '../db';
import { AppError } from '../utils/error-handler';

export interface AdminCategoryFilters {
  search?: string;
  is_active?: boolean;
  created_from?: Date;
  created_to?: Date;
  include_deleted?: boolean;
  sortBy?: 'name' | 'slug' | 'created_at' | 'updated_at' | 'is_active' | 'product_count';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AdminCategoryResponse {
  categories: AdminCategoryWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AdminCategoryWithStats extends Category {
  product_count?: number;
  active_product_count?: number;
  featured_product_count?: number;
  days_since_created?: number;
}

export interface AdminCategoryStats {
  total_categories: number;
  active_categories: number;
  inactive_categories: number;
  deleted_categories: number;
  categories_this_month: number;
  categories_growth_rate: number;
  average_products_per_category: number;
}

export interface CreateAdminCategoryData {
  name: string;
  description?: string;
  image?: string;
  slug: string;
  is_active?: boolean;
  created_by: string;
}

export interface UpdateAdminCategoryData {
  name?: string;
  description?: string;
  image?: string;
  slug?: string;
  is_active?: boolean;
  updated_by: string;
}

export interface SoftDeleteResponse {
  success: boolean;
  message: string;
  undo_token?: string;
  undo_expires_at?: Date;
}

export class AdminCategoryService {
  private db: ReturnType<typeof getDb>;

  constructor(env?: any) {
    this.db = getDb(env);
  }

  async getCategories(filters: AdminCategoryFilters = {}): Promise<AdminCategoryResponse> {
    const {
      search,
      is_active,
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
      whereConditions.push(isNull(categories.deleted_at));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(categories.name, `%${search}%`),
          ilike(categories.description, `%${search}%`),
          ilike(categories.slug, `%${search}%`)
        )
      );
    }

    if (is_active !== undefined) {
      whereConditions.push(eq(categories.is_active, is_active));
    }

    if (created_from) {
      whereConditions.push(gte(categories.created_at, created_from));
    }

    if (created_to) {
      whereConditions.push(lte(categories.created_at, created_to));
    }

    let orderByClause;
    if (sortBy === 'product_count') {
      orderByClause = sortOrder === 'asc' ?
        asc(sql<number>`COALESCE(COUNT(${products.id}), 0)`) :
        desc(sql<number>`COALESCE(COUNT(${products.id}), 0)`);
    } else {
      const orderByColumn = categories[sortBy as keyof typeof categories] || categories.created_at;
      orderByClause = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn);
    }

    const [categoriesResult, totalResult] = await Promise.all([
      this.db
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          image: categories.image,
          slug: categories.slug,
          is_active: categories.is_active,
          created_at: categories.created_at,
          updated_at: categories.updated_at,
          deleted_at: categories.deleted_at,
          product_count: sql<number>`COALESCE(COUNT(${products.id}), 0)`,
          active_product_count: sql<number>`COALESCE(COUNT(CASE WHEN ${products.is_active} = true AND ${products.deleted_at} IS NULL THEN 1 END), 0)`,
          featured_product_count: sql<number>`COALESCE(COUNT(CASE WHEN ${products.featured} = true AND ${products.deleted_at} IS NULL THEN 1 END), 0)`,
          days_since_created: sql<number>`EXTRACT(DAY FROM NOW() - ${categories.created_at})`,
        })
        .from(categories)
        .leftJoin(products, and(eq(categories.id, products.category_id), isNull(products.deleted_at)))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .groupBy(categories.id)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: count() })
        .from(categories)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      categories: categoriesResult as AdminCategoryWithStats[],
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

  async getCategoryById(id: string, include_deleted = false): Promise<AdminCategoryWithStats | null> {
    const whereConditions = [eq(categories.id, id)];

    if (!include_deleted) {
      whereConditions.push(isNull(categories.deleted_at));
    }

    const result = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        image: categories.image,
        slug: categories.slug,
        is_active: categories.is_active,
        created_at: categories.created_at,
        updated_at: categories.updated_at,
        deleted_at: categories.deleted_at,
        created_by: categories.created_by,
        updated_by: categories.updated_by,
        deleted_by: categories.deleted_by,
        product_count: sql<number>`COALESCE(COUNT(${products.id}), 0)`,
        active_product_count: sql<number>`COALESCE(COUNT(CASE WHEN ${products.is_active} = true AND ${products.deleted_at} IS NULL THEN 1 END), 0)`,
        featured_product_count: sql<number>`COALESCE(COUNT(CASE WHEN ${products.featured} = true AND ${products.deleted_at} IS NULL THEN 1 END), 0)`,
        days_since_created: sql<number>`EXTRACT(DAY FROM NOW() - ${categories.created_at})`,
      })
      .from(categories)
      .leftJoin(products, and(eq(categories.id, products.category_id), isNull(products.deleted_at)))
      .where(and(...whereConditions))
      .groupBy(categories.id)
      .limit(1);

    return result.length > 0 ? (result[0] as AdminCategoryWithStats) : null;
  }

  async createCategory(categoryData: CreateAdminCategoryData): Promise<AdminCategoryWithStats> {
    const validatedData = insertCategorySchema.parse({
      name: categoryData.name,
      description: categoryData.description,
      image: categoryData.image,
      slug: categoryData.slug,
      is_active: categoryData.is_active ?? true,
      created_by: categoryData.created_by,
    });

    const slugExists = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.slug, categoryData.slug), isNull(categories.deleted_at)))
      .limit(1);

    if (slugExists.length > 0) {
      throw new AppError('Category slug already exists', 409);
    }

    const [newCategory] = await this.db
      .insert(categories)
      .values(validatedData)
      .returning({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        image: categories.image,
        slug: categories.slug,
        is_active: categories.is_active,
        created_at: categories.created_at,
        updated_at: categories.updated_at,
      });

    const categoryWithStats = await this.getCategoryById(newCategory.id);
    return categoryWithStats!;
  }

  async updateCategory(id: string, updateData: UpdateAdminCategoryData): Promise<AdminCategoryWithStats> {
    const existingCategory = await this.getCategoryById(id);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    const validatedData = updateCategorySchema.parse(updateData);

    if (updateData.slug && updateData.slug !== existingCategory.slug) {
      const slugExists = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.slug, updateData.slug), isNull(categories.deleted_at)))
        .limit(1);

      if (slugExists.length > 0) {
        throw new AppError('Category slug already exists', 409);
      }
    }

    await this.db
      .update(categories)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(eq(categories.id, id));

    const updatedCategory = await this.getCategoryById(id);
    return updatedCategory!;
  }

  async softDeleteCategory(id: string, deleted_by: string): Promise<SoftDeleteResponse> {
    const existingCategory = await this.getCategoryById(id);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    if (existingCategory.deleted_at) {
      throw new AppError('Category is already deleted', 400);
    }

    const hasActiveProducts = await this.db
      .select({ count: count() })
      .from(products)
      .where(and(eq(products.category_id, id), eq(products.is_active, true), isNull(products.deleted_at)));

    if (hasActiveProducts[0]?.count > 0) {
      throw new AppError('Cannot delete category with active products', 400);
    }

    await this.db
      .update(categories)
      .set({
        deleted_at: new Date(),
        deleted_by,
        updated_at: new Date(),
      })
      .where(eq(categories.id, id));

    const undo_token = `undo_category_${id}_${Date.now()}`;
    const undo_expires_at = new Date(Date.now() + 5000); // 5 seconds

    return {
      success: true,
      message: 'Category deleted successfully',
      undo_token,
      undo_expires_at,
    };
  }

  async undoSoftDelete(id: string): Promise<AdminCategoryWithStats> {
    const existingCategory = await this.getCategoryById(id, true);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    if (!existingCategory.deleted_at) {
      throw new AppError('Category is not deleted', 400);
    }

    await this.db
      .update(categories)
      .set({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date(),
      })
      .where(eq(categories.id, id));

    const restoredCategory = await this.getCategoryById(id);
    return restoredCategory!;
  }

  async permanentDeleteCategory(id: string): Promise<{ message: string }> {
    const existingCategory = await this.getCategoryById(id, true);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    const hasProducts = await this.db
      .select({ count: count() })
      .from(products)
      .where(eq(products.category_id, id));

    if (hasProducts[0]?.count > 0) {
      throw new AppError('Cannot permanently delete category with products', 400);
    }

    await this.db.delete(categories).where(eq(categories.id, id));

    return { message: 'Category permanently deleted' };
  }

  async bulkUpdateCategories(
    categoryIds: string[],
    updateData: Partial<UpdateAdminCategoryData>
  ): Promise<{ updated_count: number; message: string }> {
    if (categoryIds.length === 0) {
      throw new AppError('No category IDs provided', 400);
    }

    const validatedData = updateCategorySchema.parse(updateData);

    await this.db
      .update(categories)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(and(
        inArray(categories.id, categoryIds),
        isNull(categories.deleted_at)
      ));

    return {
      updated_count: categoryIds.length,
      message: `${categoryIds.length} categories updated successfully`,
    };
  }

  async bulkSoftDeleteCategories(
    categoryIds: string[],
    deleted_by: string
  ): Promise<{ deleted_count: number; message: string }> {
    if (categoryIds.length === 0) {
      throw new AppError('No category IDs provided', 400);
    }

    const categoriesWithProducts = await this.db
      .select({
        category_id: products.category_id,
        count: count()
      })
      .from(products)
      .where(and(
        inArray(products.category_id, categoryIds),
        eq(products.is_active, true),
        isNull(products.deleted_at)
      ))
      .groupBy(products.category_id);

    if (categoriesWithProducts.length > 0) {
      throw new AppError('Cannot delete categories with active products', 400);
    }

    await this.db
      .update(categories)
      .set({
        deleted_at: new Date(),
        deleted_by,
        updated_at: new Date(),
      })
      .where(and(
        inArray(categories.id, categoryIds),
        isNull(categories.deleted_at)
      ));

    return {
      deleted_count: categoryIds.length,
      message: `${categoryIds.length} categories deleted successfully`,
    };
  }

  async getCategoryStats(): Promise<AdminCategoryStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalCategories,
      activeCategories,
      inactiveCategories,
      deletedCategories,
      categoriesThisMonth,
      categoriesLastMonth,
      averageProductsData,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(categories).where(isNull(categories.deleted_at)),
      this.db.select({ count: count() }).from(categories).where(and(eq(categories.is_active, true), isNull(categories.deleted_at))),
      this.db.select({ count: count() }).from(categories).where(and(eq(categories.is_active, false), isNull(categories.deleted_at))),
      this.db.select({ count: count() }).from(categories).where(sql`${categories.deleted_at} IS NOT NULL`),
      this.db.select({ count: count() }).from(categories).where(and(gte(categories.created_at, thirtyDaysAgo), isNull(categories.deleted_at))),
      this.db.select({ count: count() }).from(categories).where(and(
        gte(categories.created_at, new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000)),
        lte(categories.created_at, thirtyDaysAgo),
        isNull(categories.deleted_at)
      )),
      this.db.select({
        average_products: sql<number>`COALESCE(AVG(product_counts.product_count), 0)`
      }).from(
        this.db.select({
          category_id: products.category_id,
          product_count: count(products.id)
        })
        .from(products)
        .where(isNull(products.deleted_at))
        .groupBy(products.category_id)
        .as('product_counts')
      ),
    ]);

    const currentMonthCount = categoriesThisMonth[0]?.count || 0;
    const lastMonthCount = categoriesLastMonth[0]?.count || 0;
    const growthRate = lastMonthCount > 0 ? ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

    return {
      total_categories: totalCategories[0]?.count || 0,
      active_categories: activeCategories[0]?.count || 0,
      inactive_categories: inactiveCategories[0]?.count || 0,
      deleted_categories: deletedCategories[0]?.count || 0,
      categories_this_month: currentMonthCount,
      categories_growth_rate: Math.round(growthRate * 100) / 100,
      average_products_per_category: Math.round((averageProductsData[0]?.average_products || 0) * 100) / 100,
    };
  }

  async searchCategories(query: string, limit = 10): Promise<AdminCategoryWithStats[]> {
    const result = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        image: categories.image,
        slug: categories.slug,
        is_active: categories.is_active,
        created_at: categories.created_at,
        updated_at: categories.updated_at,
      })
      .from(categories)
      .where(and(
        or(
          ilike(categories.name, `%${query}%`),
          ilike(categories.description, `%${query}%`),
          ilike(categories.slug, `%${query}%`)
        ),
        isNull(categories.deleted_at)
      ))
      .limit(limit)
      .orderBy(desc(categories.created_at));

    return result.map(category => ({
      ...category,
      product_count: 0,
      active_product_count: 0,
      featured_product_count: 0,
      days_since_created: Math.floor((Date.now() - category.created_at.getTime()) / (1000 * 60 * 60 * 24)),
    })) as AdminCategoryWithStats[];
  }
}
