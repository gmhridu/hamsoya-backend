import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../../lib/zod-validator-fix';
import { successResponse, errorResponse } from '../../utils/response-builder';
import { AdminCategoryService } from '../../services/admin-category.service';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';
import { AppError } from '../../utils/error-handler';
import type { HonoEnv } from '../../types/hono';

const app = new Hono<HonoEnv>();

app.use('*', authMiddleware, adminMiddleware);

const CategoryListQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  is_active: z.string().optional(),
  created_from: z.string().optional(),
  created_to: z.string().optional(),
  include_deleted: z.string().optional().default('false'),
  sortBy: z.enum(['name', 'slug', 'created_at', 'updated_at', 'is_active', 'product_count']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  image: z.string().url().optional(),
  slug: z.string().min(1).max(255),
  is_active: z.boolean().optional().default(true),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  slug: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
});

const BulkUpdateSchema = z.object({
  category_ids: z.array(z.string().uuid()),
  update_data: UpdateCategorySchema,
});

const BulkDeleteSchema = z.object({
  category_ids: z.array(z.string().uuid()),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional().default('10'),
});

app.get('/', zValidator('query', CategoryListQuerySchema), async c => {
  try {
    const query = c.req.valid('query');

    const filters = {
      search: query.search,
      is_active: query.is_active ? query.is_active === 'true' : undefined,
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

    const adminCategoryService = new AdminCategoryService(c.env);
    const result = await adminCategoryService.getCategories(filters);

    return c.json(successResponse(result, 'Categories retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Categories list error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get categories'), 500 as any);
  }
});

app.get('/stats', async c => {
  try {
    const adminCategoryService = new AdminCategoryService(c.env);
    const stats = await adminCategoryService.getCategoryStats();

    return c.json(successResponse(stats, 'Category statistics retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Category stats error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get category statistics'), 500 as any);
  }
});

app.get('/search', zValidator('query', SearchQuerySchema), async c => {
  try {
    const { q, limit } = c.req.valid('query');

    const adminCategoryService = new AdminCategoryService(c.env);
    const categories = await adminCategoryService.searchCategories(q, parseInt(limit, 10));

    return c.json(successResponse(categories, 'Categories search completed successfully'), 200 as any);
  } catch (error) {
    console.error('Category search error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to search categories'), 500 as any);
  }
});

app.post('/', zValidator('json', CreateCategorySchema), async c => {
  try {
    const categoryData = c.req.valid('json');
    const currentUser = c.get('user');

    const adminCategoryService = new AdminCategoryService(c.env);
    const newCategory = await adminCategoryService.createCategory({
      ...categoryData,
      created_by: currentUser.id,
    });

    return c.json(successResponse(newCategory, 'Category created successfully'), 201 as any);
  } catch (error) {
    console.error('Category creation error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to create category'), 500 as any);
  }
});

app.get('/:id', async c => {
  try {
    const id = c.req.param('id');
    const include_deleted = c.req.query('include_deleted') === 'true';

    const adminCategoryService = new AdminCategoryService(c.env);
    const category = await adminCategoryService.getCategoryById(id, include_deleted);

    if (!category) {
      return c.json(errorResponse('Category not found'), 404 as any);
    }

    return c.json(successResponse(category, 'Category retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Category details error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get category details'), 500 as any);
  }
});

app.put('/:id', zValidator('json', UpdateCategorySchema), async c => {
  try {
    const id = c.req.param('id');
    const updateData = c.req.valid('json');
    const currentUser = c.get('user');

    const adminCategoryService = new AdminCategoryService(c.env);
    const updatedCategory = await adminCategoryService.updateCategory(id, {
      ...updateData,
      updated_by: currentUser.id,
    });

    return c.json(successResponse(updatedCategory, 'Category updated successfully'), 200 as any);
  } catch (error) {
    console.error('Category update error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to update category'), 500 as any);
  }
});

app.delete('/:id', async c => {
  try {
    const id = c.req.param('id');
    const currentUser = c.get('user');

    const adminCategoryService = new AdminCategoryService(c.env);
    const result = await adminCategoryService.softDeleteCategory(id, currentUser.id);

    return c.json(successResponse(result, 'Category deleted successfully'), 200 as any);
  } catch (error) {
    console.error('Category delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to delete category'), 500 as any);
  }
});

app.post('/:id/undo-delete', async c => {
  try {
    const id = c.req.param('id');

    const adminCategoryService = new AdminCategoryService(c.env);
    const restoredCategory = await adminCategoryService.undoSoftDelete(id);

    return c.json(successResponse(restoredCategory, 'Category restored successfully'), 200 as any);
  } catch (error) {
    console.error('Category undo delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to restore category'), 500 as any);
  }
});

app.delete('/:id/permanent', async c => {
  try {
    const id = c.req.param('id');

    const adminCategoryService = new AdminCategoryService(c.env);
    const result = await adminCategoryService.permanentDeleteCategory(id);

    return c.json(successResponse(result, 'Category permanently deleted'), 200 as any);
  } catch (error) {
    console.error('Category permanent delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to permanently delete category'), 500 as any);
  }
});

app.put('/bulk-update', zValidator('json', BulkUpdateSchema), async c => {
  try {
    const { category_ids, update_data } = c.req.valid('json');
    const currentUser = c.get('user');

    const adminCategoryService = new AdminCategoryService(c.env);
    const result = await adminCategoryService.bulkUpdateCategories(category_ids, {
      ...update_data,
      updated_by: currentUser.id,
    });

    return c.json(successResponse(result, 'Categories updated successfully'), 200 as any);
  } catch (error) {
    console.error('Bulk category update error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to update categories'), 500 as any);
  }
});

app.delete('/bulk-delete', zValidator('json', BulkDeleteSchema), async c => {
  try {
    const { category_ids } = c.req.valid('json');
    const currentUser = c.get('user');

    const adminCategoryService = new AdminCategoryService(c.env);
    const result = await adminCategoryService.bulkSoftDeleteCategories(category_ids, currentUser.id);

    return c.json(successResponse(result, 'Categories deleted successfully'), 200 as any);
  } catch (error) {
    console.error('Bulk category delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to delete categories'), 500 as any);
  }
});

export default app;
