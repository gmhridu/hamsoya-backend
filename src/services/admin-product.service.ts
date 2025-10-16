
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { getDb } from '../db/db';
import { AppError } from '../utils/error-handler';
import { categories, orderItems, products, reviews } from '../db/schema';
import { z } from 'zod';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Type definitions
export type Product = InferSelectModel<typeof products>;
export type Category = InferSelectModel<typeof categories>;
export type NewProduct = InferInsertModel<typeof products>;

// Zod schemas
const insertProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  price: z.number().int().positive(),
  original_price: z.number().int().positive().optional(),
  category_id: z.string().uuid(),
  images: z.array(z.string().url()),
  tags: z.array(z.string()).optional(),
  weight: z.string().optional(),
  origin: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  in_stock: z.boolean().optional().default(true),
  stock_quantity: z.number().int().min(0).optional().default(0),
  featured: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  slug: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  created_by: z.string().uuid(),
});

const updateProductSchema = insertProductSchema.partial().omit({ created_by: true }).extend({
  updated_by: z.string(),
});

export interface AdminProductFilters {
  search?: string;
  category_id?: string;
  featured?: boolean;
  in_stock?: boolean;
  is_active?: boolean;
  low_stock?: boolean;
  stock_threshold?: number;
  price_min?: number;
  price_max?: number;
  created_from?: Date;
  created_to?: Date;
  include_deleted?: boolean;
  sortBy?: 'name' | 'price' | 'stock_quantity' | 'created_at' | 'updated_at' | 'featured' | 'rating' | 'sales_count';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AdminProductWithStats extends Omit<Product, 'category'> {
  category: Category | null;
  averageRating?: number;
  reviewCount?: number;
  salesCount?: number;
  is_low_stock?: boolean;
}

export interface AdminProductResponse {
  products: AdminProductWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AdminProductStats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  deleted_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  featured_products: number;
  products_this_month: number;
  products_growth_rate: number;
  average_product_price: number;
}

export interface CreateAdminProductData extends Omit<NewProduct, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'deleted_by'> {
  created_by: string;
}

export interface UpdateAdminProductData extends Partial<Omit<NewProduct, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'deleted_by'>> {
  updated_by: string;
}

export interface SoftDeleteResponse {
  success: boolean;
  message: string;
  undo_token?: string;
  undo_expires_at?: Date;
}

export class AdminProductService {
  private db: ReturnType<typeof getDb>;

  constructor(env?: any) {
    this.db = getDb(env);
  }

  // Helpers

  private buildWhere(filters: AdminProductFilters) {
    const {
      search,
      category_id,
      featured,
      in_stock,
      is_active,
      low_stock,
      stock_threshold = 10,
      price_min,
      price_max,
      created_from,
      created_to,
      include_deleted = false,
    } = filters;

    const where: any[] = [];

    if (!include_deleted) {
      where.push(isNull(products.deleted_at));
    }

    if (typeof is_active === 'boolean') {
      where.push(eq(products.is_active, is_active));
    }

    if (typeof featured === 'boolean') {
      where.push(eq(products.featured, featured));
    }

    if (typeof in_stock === 'boolean') {
      where.push(eq(products.in_stock, in_stock));
    }

    if (low_stock) {
      where.push(sql`${products.stock_quantity} <= ${stock_threshold}`);
    }

    if (category_id) {
      where.push(eq(products.category_id, category_id));
    }

    if (price_min != null) {
      where.push(gte(products.price, price_min));
    }

    if (price_max != null) {
      where.push(lte(products.price, price_max));
    }

    if (created_from) {
      where.push(gte(products.created_at, created_from));
    }

    if (created_to) {
      where.push(lte(products.created_at, created_to));
    }

    if (search) {
      // Search by product name or description
      const s = `%${search}%`;
      where.push(
        or(
          ilike(products.name, s),
          ilike(products.description, s),
        )
      );
    }

    if (where.length === 0) return undefined as unknown as ReturnType<typeof and>;
    return and(...where);
  }

  private buildOrderBy(sortBy?: AdminProductFilters['sortBy'], sortOrder?: AdminProductFilters['sortOrder']) {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'name':
        return order === 'asc' ? asc(products.name) : desc(products.name);
      case 'price':
        return order === 'asc' ? asc(products.price) : desc(products.price);
      case 'stock_quantity':
        return order === 'asc' ? asc(products.stock_quantity) : desc(products.stock_quantity);
      case 'updated_at':
        return order === 'asc' ? asc(products.updated_at) : desc(products.updated_at);
      case 'featured':
        return order === 'asc' ? asc(products.featured) : desc(products.featured);
      case 'rating':
        // We'll order by computed averageRating (ensure we include reviews join and groupBy)
        return order === 'asc'
          ? sql`AVG(${reviews.rating}) ASC`
          : sql`AVG(${reviews.rating}) DESC`;
      case 'sales_count':
        // We'll order by computed salesCount (ensure we include orderItems join and groupBy)
        return order === 'asc'
          ? sql`COALESCE(SUM(${orderItems.quantity}), 0) ASC`
          : sql`COALESCE(SUM(${orderItems.quantity}), 0) DESC`;
      case 'created_at':
      default:
        return order === 'asc' ? asc(products.created_at) : desc(products.created_at);
    }
  }

  // Core operations

  async getProducts(filters: AdminProductFilters = {}): Promise<AdminProductResponse> {
    const {
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;

    const whereExpr = this.buildWhere(filters);
    const orderByExpr = this.buildOrderBy(sortBy, sortOrder);

    // Data query with stats
    const rows = await this.db
      .select({
        // product fields
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        original_price: products.original_price,
        category_id: products.category_id,
        images: products.images,
        tags: products.tags,
        weight: products.weight,
        origin: products.origin,
        benefits: products.benefits,
        in_stock: products.in_stock,
        stock_quantity: products.stock_quantity,
        featured: products.featured,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        deleted_at: products.deleted_at,
        deleted_by: products.deleted_by,

        // category snapshot
        category: {
          id: categories.id,
          name: categories.name,
          description: categories.description,
          image: categories.image,
          slug: categories.slug,
          is_active: categories.is_active,
          created_at: categories.created_at,
          updated_at: categories.updated_at,
          deleted_at: categories.deleted_at,
          deleted_by: categories.deleted_by,
        },

        // computed stats
        averageRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
        salesCount: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        is_low_stock: sql<boolean>`CASE WHEN ${products.stock_quantity} <= 10 THEN true ELSE false END`,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .leftJoin(reviews, and(eq(reviews.product_id, products.id), isNull(reviews.deleted_at)))
      .leftJoin(orderItems, eq(orderItems.product_id, products.id))
      .where(whereExpr)
      .groupBy(products.id, categories.id)
      .orderBy(orderByExpr)
      .limit(limit)
      .offset(offset);

    // Total count (distinct products)
    const totalRows = await this.db
      .select({
        total: sql<number>`COUNT(DISTINCT ${products.id})`,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .leftJoin(reviews, and(eq(reviews.product_id, products.id), isNull(reviews.deleted_at)))
      .leftJoin(orderItems, eq(orderItems.product_id, products.id))
      .where(whereExpr);

    const total = totalRows[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      products: rows as unknown as AdminProductWithStats[],
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

  async getProductById(id: string): Promise<AdminProductWithStats | null> {
    if (!id) throw new AppError('Product ID is required', 400);

    const rows = await this.db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        original_price: products.original_price,
        category_id: products.category_id,
        images: products.images,
        tags: products.tags,
        weight: products.weight,
        origin: products.origin,
        benefits: products.benefits,
        in_stock: products.in_stock,
        stock_quantity: products.stock_quantity,
        featured: products.featured,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        deleted_at: products.deleted_at,
        deleted_by: products.deleted_by,

        category: {
          id: categories.id,
          name: categories.name,
          description: categories.description,
          image: categories.image,
          slug: categories.slug,
          is_active: categories.is_active,
          created_at: categories.created_at,
          updated_at: categories.updated_at,
          deleted_at: categories.deleted_at,
          deleted_by: categories.deleted_by,
        },

        averageRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
        salesCount: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        is_low_stock: sql<boolean>`CASE WHEN ${products.stock_quantity} <= 10 THEN true ELSE false END`,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .leftJoin(reviews, and(eq(reviews.product_id, products.id), isNull(reviews.deleted_at)))
      .leftJoin(orderItems, eq(orderItems.product_id, products.id))
      .where(eq(products.id, id))
      .groupBy(products.id, categories.id)
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0] as unknown as AdminProductWithStats;
  }

  async createProduct(input: CreateAdminProductData): Promise<Product> {
    // Validate with existing schema if provided
    const parsed = insertProductSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues.map(e => e.message).join(', '), 400);
    }

    const [created] = await this.db
      .insert(products)
      .values(parsed.data)
      .returning();

    return created;
  }

  async updateProduct(id: string, input: UpdateAdminProductData): Promise<Product> {
    if (!id) throw new AppError('Product ID is required', 400);

    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues.map(e => e.message).join(', '), 400);
    }

    const [existing] = await this.db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!existing) throw new AppError('Product not found', 404);

    const [updated] = await this.db
      .update(products)
      .set({
        ...parsed.data,
        updated_at: sql`NOW()`,
      })
      .where(eq(products.id, id))
      .returning();

    return updated;
  }

  async softDeleteProduct(id: string, deletedBy: string): Promise<SoftDeleteResponse> {
    if (!id) throw new AppError('Product ID is required', 400);

    const [existing] = await this.db.select({ id: products.id, deleted_at: products.deleted_at }).from(products).where(eq(products.id, id)).limit(1);
    if (!existing) throw new AppError('Product not found', 404);
    if (existing.deleted_at) {
      return {
        success: true,
        message: 'Product already soft-deleted',
      };
    }

    await this.db
      .update(products)
      .set({
        deleted_at: sql`NOW()`,
        deleted_by: deletedBy,
        is_active: false,
      })
      .where(eq(products.id, id));

    // Optionally return undo token info
    const undoToken = `undo:${id}:${Date.now()}`;
    const undoExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return { success: true, message: 'Product soft-deleted', undo_token: undoToken, undo_expires_at: undoExpiresAt };
  }

  async undoSoftDelete(id: string): Promise<{ success: boolean; message: string }> {
    if (!id) throw new AppError('Product ID is required', 400);

    const [existing] = await this.db.select({ id: products.id, deleted_at: products.deleted_at }).from(products).where(eq(products.id, id)).limit(1);
    if (!existing) throw new AppError('Product not found', 404);
    if (!existing.deleted_at) {
      return {
        success: true,
        message: 'Product is not deleted',
      };
    }

    await this.db
      .update(products)
      .set({
        deleted_at: null,
        deleted_by: null,
        is_active: true,
      })
      .where(eq(products.id, id));

    return { success: true, message: 'Product restored' };
  }

  async permanentDeleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    if (!id) throw new AppError('Product ID is required', 400);

    const [existing] = await this.db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!existing) throw new AppError('Product not found', 404);

    await this.db.delete(products).where(eq(products.id, id));

    return { success: true, message: 'Product permanently deleted' };
  }

  async bulkUpdateProducts(ids: string[], input: UpdateAdminProductData): Promise<{ success: boolean; count: number }> {
    if (!ids || ids.length === 0) throw new AppError('No product IDs provided', 400);

    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues.map(e => e.message).join(', '), 400);
    }

    const result = await this.db
      .update(products)
      .set({
        ...parsed.data,
        updated_at: sql`NOW()`,
      })
      .where(inArray(products.id, ids));

    // drizzle returns the number of updated rows under `rowCount` when using Postgres drivers
    const count = (result as unknown as { rowCount?: number }).rowCount ?? 0;

    return { success: true, count };
  }

  async bulkSoftDeleteProducts(ids: string[], deletedBy: string): Promise<{ success: boolean; count: number }> {
    if (!ids || ids.length === 0) throw new AppError('No product IDs provided', 400);

    const result = await this.db
      .update(products)
      .set({
        deleted_at: sql`NOW()`,
        deleted_by: deletedBy,
        is_active: false,
      })
      .where(inArray(products.id, ids));

    const count = (result as unknown as { rowCount?: number }).rowCount ?? 0;

    return { success: true, count };
  }

  async getProductStats(): Promise<AdminProductStats> {
    const stockThreshold = 10;

    const [row] = await this.db
      .select({
        total_products: sql<number>`COUNT(*)`,
        active_products: sql<number>`SUM(CASE WHEN ${products.is_active} = true AND ${products.deleted_at} IS NULL THEN 1 ELSE 0 END)`,
        inactive_products: sql<number>`SUM(CASE WHEN ${products.is_active} = false AND ${products.deleted_at} IS NULL THEN 1 ELSE 0 END)`,
        deleted_products: sql<number>`SUM(CASE WHEN ${products.deleted_at} IS NOT NULL THEN 1 ELSE 0 END)`,
        low_stock_products: sql<number>`SUM(CASE WHEN ${products.stock_quantity} <= ${stockThreshold} AND ${products.deleted_at} IS NULL THEN 1 ELSE 0 END)`,
        out_of_stock_products: sql<number>`SUM(CASE WHEN ${products.stock_quantity} = 0 AND ${products.deleted_at} IS NULL THEN 1 ELSE 0 END)`,
        featured_products: sql<number>`SUM(CASE WHEN ${products.featured} = true AND ${products.deleted_at} IS NULL THEN 1 ELSE 0 END)`,
        products_this_month: sql<number>`SUM(CASE WHEN DATE_TRUNC('month', ${products.created_at}) = DATE_TRUNC('month', NOW()) THEN 1 ELSE 0 END)`,
        products_last_month: sql<number>`SUM(CASE WHEN DATE_TRUNC('month', ${products.created_at}) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN 1 ELSE 0 END)`,
        average_product_price: sql<number>`AVG(CASE WHEN ${products.deleted_at} IS NULL THEN ${products.price} ELSE NULL END)`,
      })
      .from(products);

    const products_this_month = row?.products_this_month ?? 0;
    const products_last_month = row?.products_last_month ?? 0;
    const products_growth_rate = products_last_month > 0 ? ((products_this_month - products_last_month) / products_last_month) * 100 : 0;

    return {
      total_products: row?.total_products ?? 0,
      active_products: row?.active_products ?? 0,
      inactive_products: row?.inactive_products ?? 0,
      deleted_products: row?.deleted_products ?? 0,
      low_stock_products: row?.low_stock_products ?? 0,
      out_of_stock_products: row?.out_of_stock_products ?? 0,
      featured_products: row?.featured_products ?? 0,
      products_this_month,
      products_growth_rate,
      average_product_price: row?.average_product_price ?? 0,
    };
  }

  async searchProducts(query: string, limit = 20): Promise<AdminProductWithStats[]> {
    if (!query?.trim()) return [];

    const rows = await this.db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        original_price: products.original_price,
        category_id: products.category_id,
        images: products.images,
        tags: products.tags,
        weight: products.weight,
        origin: products.origin,
        benefits: products.benefits,
        in_stock: products.in_stock,
        stock_quantity: products.stock_quantity,
        featured: products.featured,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        deleted_at: products.deleted_at,
        deleted_by: products.deleted_by,

        category: {
          id: categories.id,
          name: categories.name,
          description: categories.description,
          image: categories.image,
          slug: categories.slug,
          is_active: categories.is_active,
          created_at: categories.created_at,
          updated_at: categories.updated_at,
          deleted_at: categories.deleted_at,
          deleted_by: categories.deleted_by,
        },

        averageRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
        is_low_stock: sql<boolean>`CASE WHEN ${products.stock_quantity} <= 10 THEN true ELSE false END`,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .leftJoin(reviews, and(eq(reviews.product_id, products.id), isNull(reviews.deleted_at)))
      .where(
        and(
          isNull(products.deleted_at),
          ilike(products.name, `%${query}%`)
        )
      )
      .groupBy(products.id, categories.id)
      .orderBy(desc(products.created_at))
      .limit(limit);

    return rows as unknown as AdminProductWithStats[];
  }

  async getTopSellingProducts(limit = 10): Promise<AdminProductWithStats[]> {
    const rows = await this.db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        original_price: products.original_price,
        category_id: products.category_id,
        images: products.images,
        tags: products.tags,
        weight: products.weight,
        origin: products.origin,
        benefits: products.benefits,
        in_stock: products.in_stock,
        stock_quantity: products.stock_quantity,
        featured: products.featured,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        deleted_at: products.deleted_at,
        deleted_by: products.deleted_by,

        category: {
          id: categories.id,
          name: categories.name,
          description: categories.description,
          image: categories.image,
          slug: categories.slug,
          is_active: categories.is_active,
          created_at: categories.created_at,
          updated_at: categories.updated_at,
          deleted_at: categories.deleted_at,
          deleted_by: categories.deleted_by,
        },

        salesCount: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        averageRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
        is_low_stock: sql<boolean>`CASE WHEN ${products.stock_quantity} <= 10 THEN true ELSE false END`,
      })
      .from(products)
      .leftJoin(orderItems, eq(orderItems.product_id, products.id))
      .leftJoin(reviews, and(eq(reviews.product_id, products.id), isNull(reviews.deleted_at)))
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(and(eq(products.is_active, true), isNull(products.deleted_at)))
      .groupBy(products.id, categories.id)
      .orderBy(sql`COALESCE(SUM(${orderItems.quantity}), 0) DESC`)
      .limit(limit);

    return rows as unknown as AdminProductWithStats[];
  }
}
