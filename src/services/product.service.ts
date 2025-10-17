import {
  and,
  asc,
  desc,
  eq,
  ilike,
  InferSelectModel,
  isNull,
  sql,
} from "drizzle-orm";
import { categories, products, reviews } from "@/db/schema";

export type Product = InferSelectModel<typeof products>;
export type Review = InferSelectModel<typeof reviews>;
export type Category = InferSelectModel<typeof categories>;

export interface ProductFilters {
  category?: string;
  search?: string;
  featured?: boolean;
  inStock?: boolean;
  sortBy?: "name" | "price" | "newest" | "rating";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ProductWithCategory extends Product {
  category: Category | null;
  averageRating?: number;
  reviewCount?: number;
}

export class ProductService {
  private get db() {
    // Lazy import to avoid initialization at module load time
    const { db } = require('@/db/db');
    return db;
  }

  // Get all products with filters
  async getProducts(
    filters: ProductFilters = {}
  ): Promise<ProductWithCategory[]> {
    const {
      category,
      search,
      featured,
      inStock,
      sortBy = "newest",
      sortOrder = "desc",
      limit = 50,
      offset = 0,
    } = filters;

    // Build where conditions
    const whereConditions = [
      eq(products.is_active, true) as any,
      isNull(products.deleted_at) as any,
    ];

    if (category) {
      // filter by category slug
      whereConditions.push(eq(categories.slug, category) as any);
    }

    if (search) {
      whereConditions.push(ilike(products.name, `%${search}%`) as any);
    }

    if (featured !== undefined) {
      whereConditions.push(eq(products.featured, featured) as any);
    }

    if (inStock !== undefined) {
      whereConditions.push(eq(products.in_stock, inStock) as any);
    }

    // Build order by clause
    const orderByClause =
      sortBy === "name"
        ? sortOrder === "asc"
          ? asc(products.name)
          : desc(products.name)
        : sortBy === "price"
        ? sortOrder === "asc"
          ? asc(products.price)
          : desc(products.price)
        : sortBy === "rating"
        ? sortOrder === "asc"
          ? sql`AVG(${reviews.rating}) ASC`
          : sql`AVG(${reviews.rating}) DESC`
        : // newest (created_at)
        sortOrder === "asc"
        ? asc(products.created_at)
        : desc(products.created_at);

    // Compose query
    const whereExpr = whereConditions.length
      ? and(...whereConditions)
      : undefined;

    const query = this.db
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
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .leftJoin(reviews, eq(products.id, reviews.product_id))
      .groupBy(products.id, categories.id)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const result = whereExpr ? await query.where(whereExpr) : await query;

    return result as unknown as ProductWithCategory[];
  }

  // Get product by ID
  async getProductById(id: string): Promise<ProductWithCategory | null> {
    if (!id) return null;

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
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .leftJoin(reviews, eq(products.id, reviews.product_id))
      .where(
        and(
          eq(products.id, id),
          eq(products.is_active, true),
          isNull(products.deleted_at)
        )
      )
      .groupBy(products.id, categories.id)
      .limit(1);

    return rows.length > 0 ? (rows[0] as unknown as ProductWithCategory) : null;
  }

  // Get featured products
  async getFeaturedProducts(limit: number = 8): Promise<ProductWithCategory[]> {
    return this.getProducts({ featured: true, limit });
  }

  // Get products by category
  async getProductsByCategory(
    categorySlug: string,
    limit?: number
  ): Promise<ProductWithCategory[]> {
    return this.getProducts({ category: categorySlug, limit });
  }

  // Search products
  async searchProducts(
    query: string,
    limit?: number
  ): Promise<ProductWithCategory[]> {
    return this.getProducts({ search: query, limit });
  }

  // Get all categories
  async getCategories(): Promise<Category[]> {
    const result = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.is_active, true), isNull(categories.deleted_at)))
      .orderBy(categories.name);

    return result;
  }

  // Get category by slug
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.slug, slug),
          eq(categories.is_active, true),
          isNull(categories.deleted_at)
        )
      )
      .limit(1);

    return rows.length > 0 ? rows[0] : null;
  }

  // Get reviews for a product
  async getProductReviews(productId: string): Promise<Review[]> {
    const result = await this.db
      .select()
      .from(reviews)
      .where(eq(reviews.product_id, productId))
      .orderBy(desc(reviews.created_at));

    return result;
  }
}
