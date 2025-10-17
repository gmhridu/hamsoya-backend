import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../../lib/zod-validator-fix';
import { successResponse, errorResponse } from '../../utils/response-builder';
import { AdminProductService } from '../../services/admin-product.service';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';
import { AppError } from '../../utils/error-handler';
import type { HonoEnv } from '../../types/hono';
import { eq } from 'drizzle-orm';
import { products } from '../../db/schema';



const app = new Hono<HonoEnv>();

app.use('*', authMiddleware, adminMiddleware);

const ProductListQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  featured: z.string().optional(),
  in_stock: z.string().optional(),
  is_active: z.string().optional(),
  low_stock: z.string().optional(),
  stock_threshold: z.string().optional(),
  price_min: z.string().optional(),
  price_max: z.string().optional(),
  created_from: z.string().optional(),
  created_to: z.string().optional(),
  include_deleted: z.string().optional().default('false'),
  sortBy: z.enum(['name', 'price', 'stock_quantity', 'created_at', 'updated_at', 'featured', 'sales_count']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const CreateProductSchema = z.object({
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
});

const UpdateProductSchema = CreateProductSchema.partial();

const BulkUpdateSchema = z.object({
  product_ids: z.array(z.string().uuid()),
  update_data: UpdateProductSchema,
});

const BulkDeleteSchema = z.object({
  product_ids: z.array(z.string()),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional().default('10'),
});

const StockUpdateSchema = z.object({
  stock_quantity: z.number().int().min(0),
  in_stock: z.boolean().optional(),
});

const FeaturedToggleSchema = z.object({
  featured: z.boolean(),
});

app.get('/', zValidator('query', ProductListQuerySchema), async c => {
  try {
    const query = c.req.valid('query');

    const filters = {
      search: query.search,
      category_id: query.category_id,
      featured: query.featured ? query.featured === 'true' : undefined,
      in_stock: query.in_stock ? query.in_stock === 'true' : undefined,
      is_active: query.is_active ? query.is_active === 'true' : undefined,
      low_stock: query.low_stock === 'true',
      stock_threshold: query.stock_threshold ? parseInt(query.stock_threshold, 10) : undefined,
      price_min: query.price_min ? parseInt(query.price_min, 10) : undefined,
      price_max: query.price_max ? parseInt(query.price_max, 10) : undefined,
      created_from: query.created_from ? new Date(query.created_from) : undefined,
      created_to: query.created_to ? new Date(query.created_to) : undefined,
      include_deleted: query.include_deleted === 'true',
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: parseInt(query.page, 10),
      limit: parseInt(query.limit, 10),
    };

    if (filters.page < 1 || filters.limit < 1 || filters.limit > 100) {
      return c.json(errorResponse('Invalid pagination parameters'), 400 as any);
    }

    const adminProductService = new AdminProductService();
    const result = await adminProductService.getProducts(filters);

    return c.json(successResponse(result, 'Products retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Products list error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get products'), 500 as any);
  }
});

app.get('/stats', async c => {
  try {
    const adminProductService = new AdminProductService();
    const stats = await adminProductService.getProductStats();

    return c.json(successResponse(stats, 'Product statistics retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Product stats error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get product statistics'), 500 as any);
  }
});

app.get('/search', zValidator('query', SearchQuerySchema), async c => {
  try {
    const { q, limit } = c.req.valid('query');

    const adminProductService = new AdminProductService();
    const products = await adminProductService.searchProducts(q, parseInt(limit, 10));

    return c.json(successResponse(products, 'Products search completed successfully'), 200 as any);
  } catch (error) {
    console.error('Product search error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to search products'), 500 as any);
  }
});

app.get('/top-selling', async c => {
  try {
    const limit = parseInt(c.req.query('limit') || '10', 10);

    const adminProductService = new AdminProductService();
    const topProducts = await adminProductService.getTopSellingProducts(limit);

    return c.json(successResponse(topProducts, 'Top selling products retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Top selling products error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get top selling products'), 500 as any);
  }
});

app.post('/', zValidator('json', CreateProductSchema), async c => {
  try {
    const productData = c.req.valid('json');
    const currentUser = c.get('user');

    const adminProductService = new AdminProductService();
    const newProduct = await adminProductService.createProduct({
      ...productData,
      created_by: currentUser.id,
    });

    return c.json(successResponse(newProduct, 'Product created successfully'), 201 as any);
  } catch (error) {
    console.error('Product creation error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to create product'), 500 as any);
  }
});

app.get('/:id', async c => {
  try {
    const id = c.req.param('id');
    const include_deleted = c.req.query('include_deleted') === 'true';

    const adminProductService = new AdminProductService();
    const product = await adminProductService.getProductById(id);

    if (!product) {
      return c.json(errorResponse('Product not found'), 404 as any);
    }

    return c.json(successResponse(product, 'Product retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Product details error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get product details'), 500 as any);
  }
});

app.put('/:id', zValidator('json', UpdateProductSchema), async c => {
  try {
    const id = c.req.param('id');
    const updateData = c.req.valid('json');
    const currentUser = c.get('user');

    const adminProductService = new AdminProductService();
    const updatedProduct = await adminProductService.updateProduct(id, {
      ...updateData,
      updated_by: currentUser.id,
    });

    return c.json(successResponse(updatedProduct, 'Product updated successfully'), 200 as any);
  } catch (error) {
    console.error('Product update error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to update product'), 500 as any);
  }
});

// PUT /api/admin/products/:id/featured - Toggle featured status
app.put('/:id/featured', zValidator('json', FeaturedToggleSchema), async c => {
  try {
    const id = c.req.param('id');
    const { featured } = c.req.valid('json');

    const { db } = require('@/db/db');
    const [updatedProduct] = await db
      .update(products)
      .set({
        featured,
        updated_at: new Date(),
      } as any)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    if (!updatedProduct) {
      return c.json(errorResponse('Product not found'), 404 as any);
    }

    return c.json(successResponse(updatedProduct, 'Product featured status updated successfully'), 200 as any);
  } catch (error) {
    console.error('Product featured toggle error:', error);
    return c.json(errorResponse('Failed to update product featured status'), 500 as any);
  }
});

// PUT /api/admin/products/:id/stock - Update stock
app.put('/:id/stock', zValidator('json', StockUpdateSchema), async c => {
  try {
    const id = c.req.param('id');
    const { stock_quantity, in_stock } = c.req.valid('json');

    const updateData: any = {
      stock_quantity,
      updated_at: new Date(),
    };

    if (in_stock !== undefined) {
      updateData.in_stock = in_stock;
    }

    const { db } = require('@/db/db');
    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      return c.json(errorResponse('Product not found'), 404 as any);
    }

    return c.json(successResponse(updatedProduct, 'Product stock updated successfully'), 200 as any);
  } catch (error) {
    console.error('Product stock update error:', error);
    return c.json(errorResponse('Failed to update product stock'), 500 as any);
  }
});

app.delete('/:id', async c => {
  try {
    const id = c.req.param('id');
    const currentUser = c.get('user');

    const adminProductService = new AdminProductService();
    const result = await adminProductService.softDeleteProduct(id, currentUser.id);

    return c.json(successResponse(result, 'Product deleted successfully'), 200 as any);
  } catch (error) {
    console.error('Product delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to delete product'), 500 as any);
  }
});

app.post('/:id/undo-delete', async c => {
  try {
    const id = c.req.param('id');

    const adminProductService = new AdminProductService();
    const restoredProduct = await adminProductService.undoSoftDelete(id);

    return c.json(successResponse(restoredProduct, 'Product restored successfully'), 200 as any);
  } catch (error) {
    console.error('Product undo delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to restore product'), 500 as any);
  }
});

app.delete('/:id/permanent', async c => {
  try {
    const id = c.req.param('id');

    const adminProductService = new AdminProductService();
    const result = await adminProductService.permanentDeleteProduct(id);

    return c.json(successResponse(result, 'Product permanently deleted'), 200 as any);
  } catch (error) {
    console.error('Product permanent delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to permanently delete product'), 500 as any);
  }
});

app.put('/bulk-update', zValidator('json', BulkUpdateSchema), async c => {
  try {
    const { product_ids, update_data } = c.req.valid('json');
    const currentUser = c.get('user');

    const adminProductService = new AdminProductService();
    const result = await adminProductService.bulkUpdateProducts(product_ids, {
      ...update_data,
      updated_by: currentUser.id,
    });

    return c.json(successResponse(result, 'Products updated successfully'), 200 as any);
  } catch (error) {
    console.error('Bulk product update error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to update products'), 500 as any);
  }
});

app.delete('/bulk-delete', zValidator('json', BulkDeleteSchema), async c => {
  try {
    const { product_ids } = c.req.valid('json');
    const currentUser = c.get('user');

    const adminProductService = new AdminProductService();
    const result = await adminProductService.bulkSoftDeleteProducts(product_ids, currentUser.id);

    return c.json(successResponse(result, 'Products deleted successfully'), 200 as any);
  } catch (error) {
    console.error('Bulk product delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to delete products'), 500 as any);
  }
});

export default app;
