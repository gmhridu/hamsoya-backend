import { and, count, desc, eq, ilike, isNull, or, sql, asc, gte, lte, inArray } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '../utils/error-handler';

import { orderItems, orders, products, users } from '@/db/schema';

// Type definitions
export type Order = InferSelectModel<typeof orders>;
export type OrderItem = InferSelectModel<typeof orderItems>;

// Zod schemas
const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  payment_status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  notes: z.string().optional(),
  tracking_number: z.string().optional(),
  estimated_delivery: z.date().optional(),
  delivered_at: z.date().optional(),
  updated_by: z.string().uuid(),
});

export interface AdminOrderFilters {
  search?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  payment_status?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  user_id?: string;
  amount_min?: number;
  amount_max?: number;
  created_from?: Date;
  created_to?: Date;
  include_deleted?: boolean;
  sortBy?: 'order_number' | 'total_amount' | 'status' | 'payment_status' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AdminOrderResponse {
  orders: AdminOrderWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AdminOrderWithDetails extends Omit<Order, 'created_by' | 'updated_by' | 'deleted_by' | 'cancelled_at' | 'cancellation_reason'> {
  customer: {
    id: string;
    name: string;
    email: string;
    phone_number?: string;
  };
  items: OrderItemWithProduct[];
  items_count: number;
  days_since_created?: number;
}

export interface OrderItemWithProduct extends Omit<OrderItem, 'product_snapshot'> {
  product: {
    id: string;
    name: string;
    images: string[];
    slug?: string;
  };
}

export interface AdminOrderStats {
  total_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  average_order_value: number;
  orders_this_month: number;
  orders_growth_rate: number;
  revenue_this_month: number;
  revenue_growth_rate: number;
}

export interface UpdateAdminOrderData {
  status?: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  payment_status?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  notes?: string;
  tracking_number?: string;
  estimated_delivery?: Date;
  delivered_at?: Date;
  updated_by: string;
}

export interface SoftDeleteResponse {
  success: boolean;
  message: string;
  undo_token?: string;
  undo_expires_at?: Date;
}

export class AdminOrderService {
  private get db() {
    // Lazy import to avoid initialization at module load time
    const { db } = require('@/db/db');
    return db;
  }

  async getOrders(filters: AdminOrderFilters = {}): Promise<AdminOrderResponse> {
    const {
      search,
      status,
      payment_status,
      user_id,
      amount_min,
      amount_max,
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
      whereConditions.push(isNull(orders.deleted_at));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(orders.order_number, `%${search}%`),
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          sql`${orders.shipping_address}::text ILIKE ${'%' + search + '%'}`
        )
      );
    }

    if (status) {
      whereConditions.push(eq(orders.status, status));
    }

    if (payment_status) {
      whereConditions.push(eq(orders.payment_status, payment_status));
    }

    if (user_id) {
      whereConditions.push(eq(orders.user_id, user_id));
    }

    if (amount_min !== undefined) {
      whereConditions.push(gte(orders.total_amount, amount_min));
    }

    if (amount_max !== undefined) {
      whereConditions.push(lte(orders.total_amount, amount_max));
    }

    if (created_from) {
      whereConditions.push(gte(orders.created_at, created_from));
    }

    if (created_to) {
      whereConditions.push(lte(orders.created_at, created_to));
    }

    const orderByColumn = orders[sortBy as keyof typeof orders] || orders.created_at;
    const orderDirection = sortOrder === 'asc' ? asc(orderByColumn as any) : desc(orderByColumn as any);

    const [ordersResult, totalResult] = await Promise.all([
      this.db
        .select({
          id: orders.id,
          user_id: orders.user_id,
          order_number: orders.order_number,
          status: orders.status,
          total_amount: orders.total_amount,
          subtotal: orders.subtotal,
          tax_amount: orders.tax_amount,
          shipping_amount: orders.shipping_amount,
          discount_amount: orders.discount_amount,
          shipping_address: orders.shipping_address,
          payment_method: orders.payment_method,
          payment_status: orders.payment_status,
          payment_id: orders.payment_id,
          notes: orders.notes,
          tracking_number: orders.tracking_number,
          estimated_delivery: orders.estimated_delivery,
          delivered_at: orders.delivered_at,
          created_at: orders.created_at,
          updated_at: orders.updated_at,
          deleted_at: orders.deleted_at,
          customer: {
            id: users.id,
            name: users.name,
            email: users.email,
            phone_number: users.phone_number,
          },
          items_count: sql<number>`COALESCE(COUNT(${orderItems.id}), 0)`,
          days_since_created: sql<number>`EXTRACT(DAY FROM NOW() - ${orders.created_at})`,
        })
        .from(orders)
        .leftJoin(users, eq(orders.user_id, users.id))
        .leftJoin(orderItems, eq(orders.id, orderItems.order_id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .groupBy(orders.id, users.id)
        .orderBy(orderDirection)
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: count() })
        .from(orders)
        .leftJoin(users, eq(orders.user_id, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined),
    ]);

    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const items = await this.getOrderItems(order.id);
        return {
          ...order,
          items,
        } as AdminOrderWithDetails;
      })
    );

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      orders: ordersWithItems,
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

  async getOrderById(id: string, include_deleted = false): Promise<AdminOrderWithDetails | null> {
    const whereConditions = [eq(orders.id, id)];

    if (!include_deleted) {
      whereConditions.push(isNull(orders.deleted_at));
    }

    const result = await this.db
      .select({
        id: orders.id,
        user_id: orders.user_id,
        order_number: orders.order_number,
        status: orders.status,
        total_amount: orders.total_amount,
        subtotal: orders.subtotal,
        tax_amount: orders.tax_amount,
        shipping_amount: orders.shipping_amount,
        discount_amount: orders.discount_amount,
        shipping_address: orders.shipping_address,
        payment_method: orders.payment_method,
        payment_status: orders.payment_status,
        payment_id: orders.payment_id,
        notes: orders.notes,
        tracking_number: orders.tracking_number,
        estimated_delivery: orders.estimated_delivery,
        delivered_at: orders.delivered_at,
        created_at: orders.created_at,
        updated_at: orders.updated_at,
        deleted_at: orders.deleted_at,
        created_by: orders.created_by,
        updated_by: orders.updated_by,
        deleted_by: orders.deleted_by,
        customer: {
          id: users.id,
          name: users.name,
          email: users.email,
          phone_number: users.phone_number,
        },
        items_count: sql<number>`COALESCE(COUNT(${orderItems.id}), 0)`,
        days_since_created: sql<number>`EXTRACT(DAY FROM NOW() - ${orders.created_at})`,
      })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .leftJoin(orderItems, eq(orders.id, orderItems.order_id))
      .where(and(...whereConditions))
      .groupBy(orders.id, users.id)
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const order = result[0];
    const items = await this.getOrderItems(order.id);

    return {
      ...order,
      items,
    } as unknown as AdminOrderWithDetails;
  }

  private async getOrderItems(orderId: string): Promise<OrderItemWithProduct[]> {
    const items = await this.db
      .select({
        id: orderItems.id,
        order_id: orderItems.order_id,
        product_id: orderItems.product_id,
        quantity: orderItems.quantity,
        unit_price: orderItems.unit_price,
        total_price: orderItems.total_price,
        product_name: orderItems.product_name,
        product_image: orderItems.product_image,
        product_weight: orderItems.product_weight,
        created_at: orderItems.created_at,
        updated_at: orderItems.updated_at,
        product: {
          id: products.id,
          name: products.name,
          images: products.images,
          slug: products.slug,
        },
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.product_id, products.id))
      .where(eq(orderItems.order_id, orderId))
      .orderBy(orderItems.created_at);

    return items as OrderItemWithProduct[];
  }

  async updateOrder(id: string, updateData: UpdateAdminOrderData): Promise<AdminOrderWithDetails> {
    const existingOrder = await this.getOrderById(id);
    if (!existingOrder) {
      throw new AppError('Order not found', 404);
    }

    const validatedData = updateOrderSchema.safeParse(updateData);
    if (!validatedData.success) {
      throw new AppError(validatedData.error.issues.map(e => e.message).join(', '), 400);
    }

    const updatePayload: any = { ...validatedData.data, updated_at: new Date() };

    if (validatedData.data.status === 'DELIVERED' && !validatedData.data.delivered_at) {
      updatePayload.delivered_at = new Date();
    }

    await this.db
      .update(orders)
      .set(updatePayload)
      .where(eq(orders.id, id))
      .returning({ id: orders.id });

    const updatedOrder = await this.getOrderById(id);
    return updatedOrder!;
  }

  async softDeleteOrder(id: string, deleted_by: string): Promise<SoftDeleteResponse> {
    const existingOrder = await this.getOrderById(id);
    if (!existingOrder) {
      throw new AppError('Order not found', 404);
    }

    if (existingOrder.deleted_at) {
      throw new AppError('Order is already deleted', 400);
    }

    if (existingOrder.status === 'DELIVERED') {
      throw new AppError('Cannot delete delivered orders', 400);
    }

    await this.db
      .update(orders)
      .set({
        deleted_at: new Date(),
        deleted_by,
        updated_at: new Date(),
      } as any)
      .where(eq(orders.id, id))
      .returning({ id: orders.id });

    const undo_token = `undo_order_${id}_${Date.now()}`;
    const undo_expires_at = new Date(Date.now() + 5000); // 5 seconds

    return {
      success: true,
      message: 'Order deleted successfully',
      undo_token,
      undo_expires_at,
    };
  }

  async undoSoftDelete(id: string): Promise<AdminOrderWithDetails> {
    const existingOrder = await this.getOrderById(id, true);
    if (!existingOrder) {
      throw new AppError('Order not found', 404);
    }

    if (!existingOrder.deleted_at) {
      throw new AppError('Order is not deleted', 400);
    }

    await this.db
      .update(orders)
      .set({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date(),
      } as any)
      .where(eq(orders.id, id))
      .returning({ id: orders.id });

    const restoredOrder = await this.getOrderById(id);
    return restoredOrder!;
  }

  async permanentDeleteOrder(id: string): Promise<{ message: string }> {
    const existingOrder = await this.getOrderById(id, true);
    if (!existingOrder) {
      throw new AppError('Order not found', 404);
    }

    await this.db.delete(orderItems).where(eq(orderItems.order_id, id));
    await this.db.delete(orders).where(eq(orders.id, id));

    return { message: 'Order permanently deleted' };
  }

  async bulkUpdateOrderStatus(
    orderIds: string[],
    status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED',
    updated_by: string
  ): Promise<{ updated_count: number; message: string }> {
    if (orderIds.length === 0) {
      throw new AppError('No order IDs provided', 400);
    }

    const updateData: any = {
      status,
      updated_by,
      updated_at: new Date(),
    };

    if (status === 'DELIVERED') {
      (updateData as any).delivered_at = new Date();
    }

    await this.db
      .update(orders)
      .set(updateData)
      .where(and(
        inArray(orders.id, orderIds),
        isNull(orders.deleted_at)
      ))
      .returning({ id: orders.id });

    return {
      updated_count: orderIds.length,
      message: `${orderIds.length} orders updated to ${status}`,
    };
  }

  async getOrderStats(): Promise<AdminOrderStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueData,
      averageOrderData,
      ordersThisMonth,
      ordersLastMonth,
      revenueThisMonth,
      revenueLastMonth,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(orders).where(isNull(orders.deleted_at)),
      this.db.select({ count: count() }).from(orders).where(and(eq(orders.status, 'PENDING'), isNull(orders.deleted_at))),
      this.db.select({ count: count() }).from(orders).where(and(eq(orders.status, 'CONFIRMED'), isNull(orders.deleted_at))),
      this.db.select({ count: count() }).from(orders).where(and(eq(orders.status, 'PROCESSING'), isNull(orders.deleted_at))),
      this.db.select({ count: count() }).from(orders).where(and(eq(orders.status, 'SHIPPED'), isNull(orders.deleted_at))),
      this.db.select({ count: count() }).from(orders).where(and(eq(orders.status, 'DELIVERED'), isNull(orders.deleted_at))),
      this.db.select({ count: count() }).from(orders).where(and(eq(orders.status, 'CANCELLED'), isNull(orders.deleted_at))),
      this.db.select({
        total_revenue: sql<number>`COALESCE(SUM(${orders.total_amount}), 0)`
      }).from(orders).where(and(eq(orders.payment_status, 'PAID'), isNull(orders.deleted_at))),
      this.db.select({
        average_order_value: sql<number>`COALESCE(AVG(${orders.total_amount}), 0)`
      }).from(orders).where(isNull(orders.deleted_at)),
      this.db.select({ count: count() }).from(orders).where(and(gte(orders.created_at, thirtyDaysAgo), isNull(orders.deleted_at))),
      this.db.select({ count: count() }).from(orders).where(and(
        gte(orders.created_at, new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000)),
        lte(orders.created_at, thirtyDaysAgo),
        isNull(orders.deleted_at)
      )),
      this.db.select({
        revenue: sql<number>`COALESCE(SUM(${orders.total_amount}), 0)`
      }).from(orders).where(and(
        gte(orders.created_at, thirtyDaysAgo),
        eq(orders.payment_status, 'PAID'),
        isNull(orders.deleted_at)
      )),
      this.db.select({
        revenue: sql<number>`COALESCE(SUM(${orders.total_amount}), 0)`
      }).from(orders).where(and(
        gte(orders.created_at, new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000)),
        lte(orders.created_at, thirtyDaysAgo),
        eq(orders.payment_status, 'PAID'),
        isNull(orders.deleted_at)
      )),
    ]);

    const currentMonthOrderCount = ordersThisMonth[0]?.count || 0;
    const lastMonthOrderCount = ordersLastMonth[0]?.count || 0;
    const orderGrowthRate = lastMonthOrderCount > 0 ? ((currentMonthOrderCount - lastMonthOrderCount) / lastMonthOrderCount) * 100 : 0;

    const currentMonthRevenue = revenueThisMonth[0]?.revenue || 0;
    const lastMonthRevenue = revenueLastMonth[0]?.revenue || 0;
    const revenueGrowthRate = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    return {
      total_orders: totalOrders[0]?.count || 0,
      pending_orders: pendingOrders[0]?.count || 0,
      confirmed_orders: confirmedOrders[0]?.count || 0,
      processing_orders: processingOrders[0]?.count || 0,
      shipped_orders: shippedOrders[0]?.count || 0,
      delivered_orders: deliveredOrders[0]?.count || 0,
      cancelled_orders: cancelledOrders[0]?.count || 0,
      total_revenue: revenueData[0]?.total_revenue || 0,
      average_order_value: Math.round((averageOrderData[0]?.average_order_value || 0) * 100) / 100,
      orders_this_month: currentMonthOrderCount,
      orders_growth_rate: Math.round(orderGrowthRate * 100) / 100,
      revenue_this_month: currentMonthRevenue,
      revenue_growth_rate: Math.round(revenueGrowthRate * 100) / 100,
    };
  }

  async searchOrders(query: string, limit = 10): Promise<AdminOrderWithDetails[]> {
    const result = await this.db
      .select({
        id: orders.id,
        user_id: orders.user_id,
        order_number: orders.order_number,
        status: orders.status,
        total_amount: orders.total_amount,
        subtotal: orders.subtotal,
        tax_amount: orders.tax_amount,
        shipping_amount: orders.shipping_amount,
        discount_amount: orders.discount_amount,
        shipping_address: orders.shipping_address,
        payment_method: orders.payment_method,
        payment_status: orders.payment_status,
        payment_id: orders.payment_id,
        notes: orders.notes,
        tracking_number: orders.tracking_number,
        estimated_delivery: orders.estimated_delivery,
        delivered_at: orders.delivered_at,
        created_at: orders.created_at,
        updated_at: orders.updated_at,
        deleted_at: orders.deleted_at,
        created_by: orders.created_by,
        updated_by: orders.updated_by,
        deleted_by: orders.deleted_by,
        customer: {
          id: users.id,
          name: users.name,
          email: users.email,
          phone_number: users.phone_number,
        },
      })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .where(and(
        or(
          ilike(orders.order_number, `%${query}%`),
          ilike(users.name, `%${query}%`),
          ilike(users.email, `%${query}%`)
        ),
        isNull(orders.deleted_at)
      ))
      .limit(limit)
      .orderBy(desc(orders.created_at));

    return result.map(order => ({
      ...order,
      items: [],
      items_count: 0,
      days_since_created: Math.floor((Date.now() - order.created_at.getTime()) / (1000 * 60 * 60 * 24)),
    })) as unknown as AdminOrderWithDetails[];
  }
}
