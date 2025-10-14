import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import {
  categories,
  getDb,
  products,
  reviews,
  type Category,
  type Product,
  type Review,
} from '../db';

export interface ProductFilters {
  category?: string;
  search?: string;
  featured?: boolean;
  inStock?: boolean;
  sortBy?: 'name' | 'price' | 'newest' | 'rating';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ProductWithCategory extends Product {
  category: Category;
  averageRating?: number;
  reviewCount?: number;
}

export class ProductService {
  private db: ReturnType<typeof getDb>;

  constructor(env?: any) {
    this.db = getDb(env);
  }

  // Get all products with filters
  async getProducts(filters: ProductFilters = {}): Promise<ProductWithCategory[]> {
    const {
      category,
      search,
      featured,
      inStock,
      sortBy = 'newest',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = filters;

    // Build where conditions
    const whereConditions = [eq(products.is_active, true)];

    if (category) {
      whereConditions.push(eq(categories.slug, category));
    }

    if (search) {
      whereConditions.push(ilike(products.name, `%${search}%`));
    }

    if (featured !== undefined) {
      whereConditions.push(eq(products.featured, featured));
    }

    if (inStock !== undefined) {
      whereConditions.push(eq(products.in_stock, inStock));
    }

    // Build order by clause
    let orderByClause;
    switch (sortBy) {
      case 'name':
        orderByClause = sortOrder === 'asc' ? products.name : desc(products.name);
        break;
      case 'price':
        orderByClause = sortOrder === 'asc' ? products.price : desc(products.price);
        break;
      case 'rating':
        orderByClause =
          sortOrder === 'asc' ? sql`AVG(${reviews.rating}) ASC` : sql`AVG(${reviews.rating}) DESC`;
        break;
      case 'newest':
      default:
        orderByClause = sortOrder === 'asc' ? products.created_at : desc(products.created_at);
        break;
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
        },
        averageRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .leftJoin(reviews, eq(products.id, reviews.product_id))
      .where(and(...whereConditions))
      .groupBy(products.id, categories.id)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return result as ProductWithCategory[];
  }

  // Get product by ID
  async getProductById(id: string): Promise<ProductWithCategory | null> {
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
        },
        averageRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .leftJoin(reviews, eq(products.id, reviews.product_id))
      .where(and(eq(products.id, id), eq(products.is_active, true)))
      .groupBy(products.id, categories.id)
      .limit(1);

    return result.length > 0 ? (result[0] as ProductWithCategory) : null;
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
  async searchProducts(query: string, limit?: number): Promise<ProductWithCategory[]> {
    return this.getProducts({ search: query, limit });
  }

  // Get all categories
  async getCategories(): Promise<Category[]> {
    const result = await this.db
      .select()
      .from(categories)
      .where(eq(categories.is_active, true))
      .orderBy(categories.name);

    return result;
  }

  // Get category by slug
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const result = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.is_active, true)))
      .limit(1);

    return result.length > 0 ? result[0] : null;
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
