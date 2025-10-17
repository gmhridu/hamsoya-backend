import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../../lib/zod-validator-fix';
import { successResponse, errorResponse } from '../../utils/response-builder';
import { AdminUserService } from '../../services/admin-user.service';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';
import { AppError } from '../../utils/error-handler';
import type { HonoEnv } from '../../types/hono';

const app = new Hono<HonoEnv>();

app.use('*', authMiddleware, adminMiddleware);

const UserListQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  role: z.enum(['USER', 'SELLER', 'ADMIN']).optional(),
  is_verified: z.string().optional(),
  created_from: z.string().optional(),
  created_to: z.string().optional(),
  include_deleted: z.string().optional().default('false'),
  sortBy: z.enum(['name', 'email', 'role', 'created_at', 'updated_at', 'is_verified']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const CreateUserSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['USER', 'SELLER', 'ADMIN']),
  phone_number: z.string().optional(),
  profile_image_url: z.string().url().optional(),
  is_verified: z.boolean().optional().default(false),
});

const UpdateUserSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'SELLER', 'ADMIN']).optional(),
  phone_number: z.string().optional(),
  profile_image_url: z.string().url().optional(),
  is_verified: z.boolean().optional(),
});

const BulkUpdateSchema = z.object({
  user_ids: z.array(z.string().uuid()),
  update_data: UpdateUserSchema,
});

const BulkDeleteSchema = z.object({
  user_ids: z.array(z.string().uuid()),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional().default('10'),
});

app.get('/', zValidator('query', UserListQuerySchema), async c => {
  try {
    const query = c.req.valid('query');

    const filters = {
      search: query.search,
      role: query.role,
      is_verified: query.is_verified ? query.is_verified === 'true' : undefined,
      created_from: query.created_from ? new Date(query.created_from) : undefined,
      created_to: query.created_to ? new Date(query.created_to) : undefined,
      include_deleted: query.include_deleted === 'true',
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: parseInt(query.page, 10),
      limit: parseInt(query.limit, 10),
    };

    if (filters.page < 1 || filters.limit < 1 || filters.limit > 100) {
      return c.json(errorResponse('Invalid pagination parameters'), 400);
    }

    const adminUserService = new AdminUserService();
    const result = await adminUserService.getUsers(filters);

    return c.json(successResponse(result, 'Users retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Users list error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get users'), 500 as any);
  }
});

app.get('/stats', async c => {
  try {
    const adminUserService = new AdminUserService();
    const stats = await adminUserService.getUserStats();

    return c.json(successResponse(stats, 'User statistics retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('User stats error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get user statistics'), 500 as any);
  }
});

app.get('/search', zValidator('query', SearchQuerySchema), async c => {
  try {
    const { q, limit } = c.req.valid('query');

    const adminUserService = new AdminUserService();
    const users = await adminUserService.searchUsers(q, parseInt(limit, 10));

    return c.json(successResponse(users, 'Users search completed successfully'), 200 as any);
  } catch (error) {
    console.error('User search error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to search users'), 500 as any);
  }
});

app.post('/', zValidator('json', CreateUserSchema), async c => {
  try {
    const userData = c.req.valid('json');
    const currentUser = c.get('user');

    const adminUserService = new AdminUserService();
    const newUser = await adminUserService.createUser({
      ...userData,
      created_by: currentUser.id,
    });

    return c.json(successResponse(newUser, 'User created successfully'), 201 as any);
  } catch (error) {
    console.error('User creation error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to create user'), 500 as any);
  }
});

app.get('/:id', async c => {
  try {
    const id = c.req.param('id');
    const include_deleted = c.req.query('include_deleted') === 'true';

    const adminUserService = new AdminUserService();
    const user = await adminUserService.getUserById(id, include_deleted);

    if (!user) {
      return c.json(errorResponse('User not found'), 404);
    }

    return c.json(successResponse(user, 'User retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('User details error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get user details'), 500 as any);
  }
});

app.put('/:id', zValidator('json', UpdateUserSchema), async c => {
  try {
    const id = c.req.param('id');
    const updateData = c.req.valid('json');
    const currentUser = c.get('user');

    const adminUserService = new AdminUserService();
    const updatedUser = await adminUserService.updateUser(id, {
      ...updateData,
      updated_by: currentUser.id,
    });

    return c.json(successResponse(updatedUser, 'User updated successfully'), 200 as any);
  } catch (error) {
    console.error('User update error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to update user'), 500 as any);
  }
});

app.delete('/:id', async c => {
  try {
    const id = c.req.param('id');
    const currentUser = c.get('user');

    if (id === currentUser.id) {
      return c.json(errorResponse('Cannot delete your own account'), 400 as any);
    }

    const adminUserService = new AdminUserService();
    const result = await adminUserService.softDeleteUser(id, currentUser.id);

    return c.json(successResponse(result, 'User deleted successfully'), 200 as any);
  } catch (error) {
    console.error('User delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to delete user'), 500 as any);
  }
});

app.post('/:id/undo-delete', async c => {
  try {
    const id = c.req.param('id');

    const adminUserService = new AdminUserService();
    const restoredUser = await adminUserService.undoSoftDelete(id);

    return c.json(successResponse(restoredUser, 'User restored successfully'), 200 as any);
  } catch (error) {
    console.error('User undo delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to restore user'), 500 as any);
  }
});

app.delete('/:id/permanent', async c => {
  try {
    const id = c.req.param('id');
    const currentUser = c.get('user');

    if (id === currentUser.id) {
      return c.json(errorResponse('Cannot permanently delete your own account'), 400);
    }

    const adminUserService = new AdminUserService();
    const result = await adminUserService.permanentDeleteUser(id);

    return c.json(successResponse(result, 'User permanently deleted'), 200 as any);
  } catch (error) {
    console.error('User permanent delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to permanently delete user'), 500 as any);
  }
});

app.put('/bulk-update', zValidator('json', BulkUpdateSchema), async c => {
  try {
    const { user_ids, update_data } = c.req.valid('json');
    const currentUser = c.get('user');

    if (user_ids.includes(currentUser.id) && update_data.role && update_data.role !== 'ADMIN') {
      return c.json(errorResponse('Cannot change your own admin role'), 400);
    }

    const adminUserService = new AdminUserService();
    const result = await adminUserService.bulkUpdateUsers(user_ids, {
      ...update_data,
      updated_by: currentUser.id,
    });

    return c.json(successResponse(result, 'Users updated successfully'), 200 as any);
  } catch (error) {
    console.error('Bulk user update error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to update users'), 500 as any);
  }
});

app.delete('/bulk-delete', zValidator('json', BulkDeleteSchema), async c => {
  try {
    const { user_ids } = c.req.valid('json');
    const currentUser = c.get('user');

    if (user_ids.includes(currentUser.id)) {
      return c.json(errorResponse('Cannot delete your own account'), 400);
    }

    const adminUserService = new AdminUserService();
    const result = await adminUserService.bulkSoftDeleteUsers(user_ids, currentUser.id);

    return c.json(successResponse(result, 'Users deleted successfully'), 200 as any);
  } catch (error) {
    console.error('Bulk user delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to delete users'), 500 as any);
  }
});

export default app;
