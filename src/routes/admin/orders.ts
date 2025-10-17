import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../../lib/zod-validator-fix';
import { successResponse, errorResponse } from '../../utils/response-builder';
import { AdminOrderService } from '../../services/admin-order.service';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';
import { AppError } from '../../utils/error-handler';
import type { HonoEnv } from '../../types/hono';

const app = new Hono<HonoEnv>();

app.use('*', authMiddleware, adminMiddleware);

const OrderListQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  payment_status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  user_id: z.string().uuid().optional(),
  amount_min: z.string().optional(),
  amount_max: z.string().optional(),
  created_from: z.string().optional(),
  created_to: z.string().optional(),
  include_deleted: z.string().optional().default('false'),
  sortBy: z.enum(['order_number', 'total_amount', 'status', 'payment_status', 'created_at', 'updated_at']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const UpdateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  payment_status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  notes: z.string().optional(),
  tracking_number: z.string().optional(),
  estimated_delivery: z.string().optional(),
  delivered_at: z.string().optional(),
});

const BulkUpdateStatusSchema = z.object({
  order_ids: z.array(z.string().uuid()),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional().default('10'),
});

app.get('/', zValidator('query', OrderListQuerySchema), async c => {
  try {
    const query = c.req.valid('query');

    const filters = {
      search: query.search,
      status: query.status,
      payment_status: query.payment_status,
      user_id: query.user_id,
      amount_min: query.amount_min ? parseInt(query.amount_min, 10) : undefined,
      amount_max: query.amount_max ? parseInt(query.amount_max, 10) : undefined,
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

    const adminOrderService = new AdminOrderService();
    const result = await adminOrderService.getOrders(filters);

    return c.json(successResponse(result, 'Orders retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Orders list error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get orders'), 500 as any);
  }
});

app.get('/stats', async c => {
  try {
    const adminOrderService = new AdminOrderService();
    const stats = await adminOrderService.getOrderStats();

    return c.json(successResponse(stats, 'Order statistics retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Order stats error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get order statistics'), 500 as any);
  }
});

app.get('/search', zValidator('query', SearchQuerySchema), async c => {
  try {
    const { q, limit } = c.req.valid('query');

    const adminOrderService = new AdminOrderService();
    const orders = await adminOrderService.searchOrders(q, parseInt(limit, 10));

    return c.json(successResponse(orders, 'Orders search completed successfully'), 200 as any);
  } catch (error) {
    console.error('Order search error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to search orders'), 500 as any);
  }
});

app.get('/:id', async c => {
  try {
    const id = c.req.param('id');
    const include_deleted = c.req.query('include_deleted') === 'true';

    const adminOrderService = new AdminOrderService();
    const order = await adminOrderService.getOrderById(id, include_deleted);

    if (!order) {
      return c.json(errorResponse('Order not found'), 404 as any);
    }

    return c.json(successResponse(order, 'Order retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Order details error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get order details'), 500 as any);
  }
});

app.put('/:id', zValidator('json', UpdateOrderSchema), async c => {
  try {
    const id = c.req.param('id');
    const updateData = c.req.valid('json');
    const currentUser = c.get('user');

    const processedUpdateData = {
      ...updateData,
      estimated_delivery: updateData.estimated_delivery ? new Date(updateData.estimated_delivery) : undefined,
      delivered_at: updateData.delivered_at ? new Date(updateData.delivered_at) : undefined,
      updated_by: currentUser.id,
    };

    const adminOrderService = new AdminOrderService();
    const updatedOrder = await adminOrderService.updateOrder(id, processedUpdateData);

    return c.json(successResponse(updatedOrder, 'Order updated successfully'), 200 as any);
  } catch (error) {
    console.error('Order update error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to update order'), 500 as any);
  }
});

app.delete('/:id', async c => {
  try {
    const id = c.req.param('id');
    const currentUser = c.get('user');

    const adminOrderService = new AdminOrderService();
    const result = await adminOrderService.softDeleteOrder(id, currentUser.id);

    return c.json(successResponse(result, 'Order deleted successfully'), 200 as any);
  } catch (error) {
    console.error('Order delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to delete order'), 500 as any);
  }
});

app.post('/:id/undo-delete', async c => {
  try {
    const id = c.req.param('id');

    const adminOrderService = new AdminOrderService();
    const restoredOrder = await adminOrderService.undoSoftDelete(id);

    return c.json(successResponse(restoredOrder, 'Order restored successfully'), 200 as any);
  } catch (error) {
    console.error('Order undo delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to restore order'), 500 as any);
  }
});

app.delete('/:id/permanent', async c => {
  try {
    const id = c.req.param('id');

    const adminOrderService = new AdminOrderService();
    const result = await adminOrderService.permanentDeleteOrder(id);

    return c.json(successResponse(result, 'Order permanently deleted'), 200 as any);
  } catch (error) {
    console.error('Order permanent delete error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to permanently delete order'), 500 as any);
  }
});

app.put('/bulk-update-status', zValidator('json', BulkUpdateStatusSchema), async c => {
  try {
    const { order_ids, status } = c.req.valid('json');
    const currentUser = c.get('user');

    const adminOrderService = new AdminOrderService();
    const result = await adminOrderService.bulkUpdateOrderStatus(order_ids, status, currentUser.id);

    return c.json(successResponse(result, 'Orders status updated successfully'), 200 as any);
  } catch (error) {
    console.error('Bulk order status update error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to update order status'), 500 as any);
  }
});

export default app;
