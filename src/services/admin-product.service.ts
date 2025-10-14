import { and, count, desc, eq, ilike, isNull, or, sql, asc, gte, lte, inArray } from 'drizzle-orm';
import {
  getDb,
  products,
  categories,
  reviews,
  orderItems,
  type Product,
  type NewProduct,
  type Category,
  insertProductSchema,
  updateProductSchema,
} from '../db';
import { AppError } from '../utils/error-handler';

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
  sortBy?: 'name' | 'price' | 'stock_quantity' | 'created_at' | 'updated_at' | 'featured' | 'sales_count';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
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

export interface AdminProductWithStats extends Product {
  category: Category;
  average_rating?: number;
  review_count?: number;
  sales_count?: number;
  total_revenue?: number;
  last_sold_date?: Date;
  days_since_created?: number;
  is_low_stock?: boolean;
}

export interface AdminProductStats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  featured_products: number;
  out_of_stock_products: number;
  low_stock_products: number;
  deleted_products: number;
  products_this_month: number;
  products_growth_rate: number;
  total_revenue: number;
  average_product_price: number;
}

export interface CreateAdminProductData {
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category_id: string;
  images: string[];
  tags?: string[];
  weight?: string;
  origin?: string;
  benefits?: string[];
  in_stock?: boolean;
  stock_quantity?: number;
  featured?: boolean;
  is_active?: boolean;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  created_by: string;
}

export interface UpdateAdminProductData {
  name?: string;
  description?: string;
  price?: number;
  original_price?: number;
  category_id?: string;
  images?: string[];
  tags?: string[];
  weight?: string;
  origin?: string;
  benefits?: string[];
  in_stock?: boolean;
  stock_quantity?: number;
  featured?: boolean;
  is_active?: boolean;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
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

  async getProducts(filters: AdminProductFilters = {}): Promise<AdminProductResponse> {
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
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const whereConditions = [];

    if (!include_deleted) {
      whereConditions.push(isNull(products.deleted_at));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`),
          sql`${products.tags}::text ILIKE ${'%' + search + '%'}`
        )
      );
    }

    if (category_id) {
      whereConditions.push(eq(products.category_id, category_id));
    }

    if (featured !== undefined) {
      whereConditions.push(eq(products.featured, featured));
    }

    if (in_stock !== undefined) {
      whereConditions.push(eq(products.in_stock, in_stock));
    }

    if (is_active !== undefined) {
      whereConditions.push(eq(products.is_active, is_active));
    }

    if (low_stock) {
      whereConditions.push(
        and(
          eq(products.in_stock, true),
          sql`${products.stock_quantity} <= ${stock_threshold}`
        )
      );
    }

    if (price_min !== undefined) {
      whereConditions.push(gte(products.price, price_min));
    }

    if (price_max !== undefined) {
      whereConditions.push(lte(products.price, price_max));
    }

    if (created_from) {
      whereConditions.push(gte(products.created_at, created_from));
    }

    if (created_to) {
      whereConditions.push(lte(products.created_at, created_to));
    }

    let orderByClause;
    if (sortBy === 'sales_count') {
      orderByClause = sortOrder === 'asc' ?
        asc(sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`) :
        desc(sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`);
    } else {
      const orderByColumn = products[sortBy as keyof typeof products] || products.created_at;
      orderByClause = sortOrder === 'asc' ? asc(orderByColumn as any) : desc(orderByColumn as any);
    }

    const [productsResult, totalResult] = await Promise.all([
      this.db
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
          slug: products.slug,
          meta_title: products.meta_title,
          meta_description: products.meta_description,
          created_at: products.created_at,
          updated_at: products.updated_at,
          deleted_at: products.deleted_at,
          category: {
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            description: categories.description,
            image: categories.image,
            is_active: categories.is_active,
            created_at: categories.created_at,
            updated_at: categories.updated_at,
          },
          average_rating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
          review_count: sql<number>`COALESCE(COUNT(DISTINCT ${reviews.id}), 0)`,
          sales_count: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
          total_revenue: sql<number>`COALESCE(SUM(${orderItems.total_price}), 0)`,
          last_sold_date: sql<Date>`MAX(${orderItems.created_at})`,
          days_since_created: sql<number>`EXTRACT(DAY FROM NOW() - ${products.created_at})`,
          is_low_stock: sql<boolean>`${products.stock_quantity} <= ${stock_threshold} AND ${products.in_stock} = true`,
        })
        .from(products)
        .leftJoin(categories, eq(products.category_id, categories.id))
        .leftJoin(reviews, and(eq(products.id, reviews.product_id), isNull(reviews.deleted_at)))
        .leftJoin(orderItems, eq(products.id, orderItems.product_id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .groupBy(products.id, categories.id)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: count() })
        .from(products)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      products: productsResult as AdminProductWithStats[],
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

  async getProductById(id: string, include_deleted = false): Promise<AdminProductWithStats | null> {
    const whereConditions = [eq(products.id, id)];

    if (!include_deleted) {
      whereConditions.push(isNull(products.deleted_at));
    }

    const result = await this.db
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
        slug: products.slug,
        meta_title: products.meta_title,
        meta_description: products.meta_description,
        created_at: products.created_at,
        updated_at: products.updated_at,
        deleted_at: products.deleted_at,
        created_by: products.created_by,
        updated_by: products.updated_by,
        deleted_by: products.deleted_by,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          image: categories.image,
          is_active: categories.is_active,
          created_at: categories.created_at,
          updated_at: categories.updated_at,
        },
        average_rating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        review_count: sql<number>`COALESCE(COUNT(DISTINCT ${reviews.id}), 0)`,
        sales_count: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        total_revenue: sql<number>`COALESCE(SUM(${orderItems.total_price}), 0)`,
        last_sold_date: sql<Date>`MAX(${orderItems.created_at})`,
        days_since_created: sql<number>`EXTRACT(DAY FROM NOW() - ${products.created_at})`,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .leftJoin(reviews, and(eq(products.id, reviews.product_id), isNull(reviews.deleted_at)))
      .leftJoin(orderItems, eq(products.id, orderItems.product_id))
      .where(and(...whereConditions))
      .groupBy(products.id, categories.id)
      .limit(1);

    return result.length > 0 ? (result[0] as AdminProductWithStats) : null;
  }

  async createProduct(productData: CreateAdminProductData): Promise<AdminProductWithStats> {
    const validatedData: any = insertProductSchema.parse({
      name: productData.name,
      description: productData.description,
      price: productData.price,
      original_price: productData.original_price,
      category_id: productData.category_id,
      images: productData.images,
      tags: productData.tags,
      weight: productData.weight,
      origin: productData.origin,
      benefits: productData.benefits,
      in_stock: productData.in_stock ?? true,
      stock_quantity: productData.stock_quantity ?? 0,
      featured: productData.featured ?? false,
      is_active: productData.is_active ?? true,
      slug: productData.slug,
      meta_title: productData.meta_title,
      meta_description: productData.meta_description,
      created_by: productData.created_by,
    });

    const categoryExists = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, productData.category_id), isNull(categories.deleted_at)))
      .limit(1);

    if (categoryExists.length === 0) {
      throw new AppError('Category not found', 404);
    }

    if (productData.slug) {
      const slugExists = await this.db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.slug, productData.slug), isNull(products.deleted_at)))
        .limit(1);

      if (slugExists.length > 0) {
        throw new AppError('Product slug already exists', 409);
      }
    }

    const [newProduct] = await this.db
      .insert(products)
      .values(validatedData)
      .returning({
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
        slug: products.slug,
        meta_title: products.meta_title,
        meta_description: products.meta_description,
        created_at: products.created_at,
        updated_at: products.updated_at,
      });

    const productWithStats = await this.getProductById(newProduct.id);
    return productWithStats!;
  }

  async updateProduct(id: string, updateData: UpdateAdminProductData): Promise<AdminProductWithStats> {
    const existingProduct = await this.getProductById(id);
    if (!existingProduct) {
      throw new AppError('Product not found', 404);
    }

    const validatedData = updateProductSchema.parse(updateData);

    if (updateData.category_id && updateData.category_id !== existingProduct.category_id) {
      const categoryExists = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, updateData.category_id), isNull(categories.deleted_at)))
        .limit(1);

      if (categoryExists.length === 0) {
        throw new AppError('Category not found', 404);
      }
    }

    if (updateData.slug && updateData.slug !== existingProduct.slug) {
      const slugExists = await this.db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.slug, updateData.slug), isNull(products.deleted_at)))
        .limit(1);

      if (slugExists.length > 0) {
        throw new AppError('Product slug already exists', 409);
      }
    }

    await this.db
      .update(products)
      .set({
        ...validatedData,
        updated_at: new Date(),
      } as any)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    const updatedProduct = await this.getProductById(id);
    return updatedProduct!;
  }

  async softDeleteProduct(id: string, deleted_by: string): Promise<SoftDeleteResponse> {
    const existingProduct = await this.getProductById(id);
    if (!existingProduct) {
      throw new AppError('Product not found', 404);
    }

    if (existingProduct.deleted_at) {
      throw new AppError('Product is already deleted', 400);
    }

    await this.db
      .update(products)
      .set({
        deleted_at: new Date(),
        deleted_by,
        updated_at: new Date(),
      } as any)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    const undo_token = `undo_product_${id}_${Date.now()}`;
    const undo_expires_at = new Date(Date.now() + 5000); // 5 seconds

    return {
      success: true,
      message: 'Product deleted successfully',
      undo_token,
      undo_expires_at,
    };
  }

  async undoSoftDelete(id: string): Promise<AdminProductWithStats> {
    const existingProduct = await this.getProductById(id, true);
    if (!existingProduct) {
      throw new AppError('Product not found', 404);
    }

    if (!existingProduct.deleted_at) {
      throw new AppError('Product is not deleted', 400);
    }

    await this.db
      .update(products)
      .set({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date(),
      } as any)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    const restoredProduct = await this.getProductById(id);
    return restoredProduct!;
  }

  async permanentDeleteProduct(id: string): Promise<{ message: string }> {
    const existingProduct = await this.getProductById(id, true);
    if (!existingProduct) {
      throw new AppError('Product not found', 404);
    }

    await this.db.delete(products).where(eq(products.id, id));

    return { message: 'Product permanently deleted' };
  }

  async bulkUpdateProducts(
    productIds: string[],
    updateData: Partial<UpdateAdminProductData>
  ): Promise<{ updated_count: number; message: string }> {
    if (productIds.length === 0) {
      throw new AppError('No product IDs provided', 400);
    }

    const validatedData = updateProductSchema.parse(updateData);

    await this.db
      .update(products)
      .set({
        ...validatedData,
        updated_at: new Date(),
      } as any)
      .where(and(
        inArray(products.id, productIds),
        isNull(products.deleted_at)
      ))
      .returning({ id: products.id });

    return {
      updated_count: productIds.length,
      message: `${productIds.length} products updated successfully`,
    };
  }

  async bulkSoftDeleteProducts(
    productIds: string[],
    deleted_by: string
  ): Promise<{ deleted_count: number; message: string }> {
    if (productIds.length === 0) {
      throw new AppError('No product IDs provided', 400);
    }

    await this.db
      .update(products)
      .set({
        deleted_at: new Date(),
        deleted_by,
        updated_at: new Date(),
      } as any)
      .where(and(
        inArray(products.id, productIds),
        isNull(products.deleted_at)
      ))
      .returning({ id: products.id });

    return {
      deleted_count: productIds.length,
      message: `${productIds.length} products deleted successfully`,
    };
  }

  async getProductStats(): Promise<AdminProductStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalProducts,
      activeProducts,
      inactiveProducts,
      featuredProducts,
      outOfStockProducts,
      lowStockProducts,
      deletedProducts,
      productsThisMonth,
      productsLastMonth,
      revenueData,
      averagePriceData,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(products).where(isNull(products.deleted_at)),
      this.db.select({ count: count() }).from(products).where(and(eq(products.is_active, true), isNull(products.deleted_at))),
      this.db.select({ count: count() }).from(products).where(and(eq(products.is_active, false), isNull(products.deleted_at))),
      this.db.select({ count: count() }).from(products).where(and(eq(products.featured, true), isNull(products.deleted_at))),
      this.db.select({ count: count() }).from(products).where(and(eq(products.in_stock, false), isNull(products.deleted_at))),
      this.db.select({ count: count() }).from(products).where(and(
        eq(products.in_stock, true),
        sql`${products.stock_quantity} <= 10`,
        isNull(products.deleted_at)
      )),
      this.db.select({ count: count() }).from(products).where(sql`${products.deleted_at} IS NOT NULL`),
      this.db.select({ count: count() }).from(products).where(and(gte(products.created_at, thirtyDaysAgo), isNull(products.deleted_at))),
      this.db.select({ count: count() }).from(products).where(and(
        gte(products.created_at, new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000)),
        lte(products.created_at, thirtyDaysAgo),
        isNull(products.deleted_at)
      )),
      this.db.select({
        total_revenue: sql<number>`COALESCE(SUM(${orderItems.total_price}), 0)`
      }).from(orderItems).leftJoin(products, eq(orderItems.product_id, products.id)),
      this.db.select({
        average_price: sql<number>`COALESCE(AVG(${products.price}), 0)`
      }).from(products).where(isNull(products.deleted_at)),
    ]);

    const currentMonthCount = productsThisMonth[0]?.count || 0;
    const lastMonthCount = productsLastMonth[0]?.count || 0;
    const growthRate = lastMonthCount > 0 ? ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

    return {
      total_products: totalProducts[0]?.count || 0,
      active_products: activeProducts[0]?.count || 0,
      inactive_products: inactiveProducts[0]?.count || 0,
      featured_products: featuredProducts[0]?.count || 0,
      out_of_stock_products: outOfStockProducts[0]?.count || 0,
      low_stock_products: lowStockProducts[0]?.count || 0,
      deleted_products: deletedProducts[0]?.count || 0,
      products_this_month: currentMonthCount,
      products_growth_rate: Math.round(growthRate * 100) / 100,
      total_revenue: revenueData[0]?.total_revenue || 0,
      average_product_price: Math.round((averagePriceData[0]?.average_price || 0) * 100) / 100,
    };
  }

  async searchProducts(query: string, limit = 10): Promise<AdminProductWithStats[]> {
    const result = await this.db
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
        slug: products.slug,
        meta_title: products.meta_title,
        meta_description: products.meta_description,
        created_at: products.created_at,
        updated_at: products.updated_at,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          image: categories.image,
          is_active: categories.is_active,
          created_at: categories.created_at,
          updated_at: categories.updated_at,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(and(
        or(
          ilike(products.name, `%${query}%`),
          ilike(products.description, `%${query}%`),
          sql`${products.tags}::text ILIKE ${'%' + query + '%'}`
        ),
        isNull(products.deleted_at)
      ))
      .limit(limit)
      .orderBy(desc(products.created_at));

    return result.map(product => ({
      ...product,
      average_rating: 0,
      review_count: 0,
      sales_count: 0,
      total_revenue: 0,
      days_since_created: Math.floor((Date.now() - product.created_at.getTime()) / (1000 * 60 * 60 * 24)),
      is_low_stock: product.stock_quantity !== null && product.stock_quantity <= 10 && product.in_stock,
    })) as AdminProductWithStats[];
  }

  async getTopSellingProducts(limit = 10): Promise<AdminProductWithStats[]> {
    const result = await this.db
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
        slug: products.slug,
        meta_title: products.meta_title,
        meta_description: products.meta_description,
        created_at: products.created_at,
        updated_at: products.updated_at,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          image: categories.image,
          is_active: categories.is_active,
          created_at: categories.created_at,
          updated_at: categories.updated_at,
        },
        sales_count: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        total_revenue: sql<number>`COALESCE(SUM(${orderItems.total_price}), 0)`,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .leftJoin(orderItems, eq(products.id, orderItems.product_id))
      .where(isNull(products.deleted_at))
      .groupBy(products.id, categories.id)
      .orderBy(desc(sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`))
      .limit(limit);

    return result.map(product => ({
      ...product,
      average_rating: 0,
      review_count: 0,
      last_sold_date: undefined,
      days_since_created: Math.floor((Date.now() - product.created_at.getTime()) / (1000 * 60 * 60 * 24)),
      is_low_stock: product.stock_quantity !== null && product.stock_quantity <= 10 && product.in_stock,
    })) as AdminProductWithStats[];
  }
}
