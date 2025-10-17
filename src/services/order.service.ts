import { and, desc, eq, ilike, sql, count, gte, lte, asc, InferSelectModel } from 'drizzle-orm';
import { AppError } from '../utils/error-handler';
import { db } from '@/db/db';
import { orderItems, orders, products, users } from '@/db/schema';

export type Order = InferSelectModel<typeof orders>;
export type OrderItem = InferSelectModel<typeof orderItems>;

export interface OrderFilters {
  search?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  payment_status?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  user_id?: string;
  date_from?: Date;
  date_to?: Date;
  sortBy?: 'created_at' | 'updated_at' | 'total_amount' | 'status' | 'order_number' | 'payment_status';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface OrderWithDetails extends Omit<Order, 'created_by' | 'updated_by' | 'deleted_at' | 'deleted_by' | 'payment_id'> {
  customer: {
    id: string;
    name: string;
    email: string;
    phone_number?: string;
  };
  items: (Omit<OrderItem, 'updated_at' | 'product_name' | 'product_image' | 'product_weight'> & {
    product: {
      id: string;
      name: string;
      images: string[];
    };
  })[];
  items_count: number;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersGrowthRate: number;
}

export interface CreateOrderData {
  user_id: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
  shipping_address: {
    name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  billing_address?: {
    name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  payment_method?: string;
  notes?: string;
  coupon_code?: string;
}

export class OrderService {
  private db: typeof db;

  constructor(env?: any) {
    this.db = db;
  }

  // Generate unique order number
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp.slice(-6)}${random}`;
  }

  // Get orders with filters and pagination
  async getOrders(filters: OrderFilters = {}): Promise<{
    orders: OrderWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      search,
      status,
      payment_status,
      user_id,
      date_from,
      date_to,
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
    } = filters;

    // Build where conditions
    const whereConditions = [];

    if (search) {
      whereConditions.push(
        sql`(${orders.order_number} ILIKE ${`%${search}%`} OR ${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`})`
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

    if (date_from) {
      whereConditions.push(gte(orders.created_at, date_from));
    }

    if (date_to) {
      whereConditions.push(lte(orders.created_at, date_to));
    }

    // Build sort order
    let orderByClause;
    switch (sortBy) {
      case 'order_number':
        orderByClause = sortOrder === 'asc' ? asc(orders.order_number) : desc(orders.order_number);
        break;
      case 'total_amount':
        orderByClause = sortOrder === 'asc' ? asc(orders.total_amount) : desc(orders.total_amount);
        break;
      case 'status':
        orderByClause = sortOrder === 'asc' ? asc(orders.status) : desc(orders.status);
        break;
      case 'payment_status':
        orderByClause = sortOrder === 'asc' ? asc(orders.payment_status) : desc(orders.payment_status);
        break;
      case 'created_at':
        orderByClause = sortOrder === 'asc' ? asc(orders.created_at) : desc(orders.created_at);
        break;
      case 'updated_at':
        orderByClause = sortOrder === 'asc' ? asc(orders.updated_at) : desc(orders.updated_at);
        break;
      default:
        orderByClause = desc(orders.created_at);
    }

    // Get total count
    let totalQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id));

    if (whereConditions.length > 0) {
      totalQuery = totalQuery.where(and(...whereConditions)) as any;
    }

    const [{ count: total }] = await totalQuery;

    // Get orders with customer details
    let ordersQuery = this.db
      .select({
        // Order fields
        id: orders.id,
        order_number: orders.order_number,
        user_id: orders.user_id,
        status: orders.status,
        payment_status: orders.payment_status,
        payment_method: orders.payment_method,
        total_amount: orders.total_amount,
        subtotal: orders.subtotal,
        tax_amount: orders.tax_amount,
        shipping_amount: orders.shipping_amount,
        discount_amount: orders.discount_amount,
        shipping_address: orders.shipping_address,
        billing_address: orders.billing_address,
        notes: orders.notes,
        tracking_number: orders.tracking_number,
        estimated_delivery: orders.estimated_delivery,
        delivered_at: orders.delivered_at,
        cancelled_at: orders.cancelled_at,
        cancellation_reason: orders.cancellation_reason,
        payment_transaction_id: orders.payment_transaction_id,
        created_at: orders.created_at,
        updated_at: orders.updated_at,
        // Customer fields
        customer_name: users.name,
        customer_email: users.email,
        customer_phone: users.phone_number,
      })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .limit(limit)
      .offset(offset)
      .orderBy(orderByClause);

    if (whereConditions.length > 0) {
      ordersQuery = ordersQuery.where(and(...whereConditions)) as any;
    }

    const ordersResult = await ordersQuery;

    // Get order items for each order
    const orderIds = ordersResult.map(order => order.id);
    const itemsResult = await this.db
      .select({
        id: orderItems.id,
        order_id: orderItems.order_id,
        product_id: orderItems.product_id,
        quantity: orderItems.quantity,
        unit_price: orderItems.unit_price,
        total_price: orderItems.total_price,
        product_snapshot: orderItems.product_snapshot,
        created_at: orderItems.created_at,
        // Product fields
        product_name: products.name,
        product_images: products.images,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.product_id, products.id))
      .where(sql`${orderItems.order_id} = ANY(${orderIds})`);

    // Group items by order
    const itemsByOrder = itemsResult.reduce((acc, item) => {
      if (!acc[item.order_id]) {
        acc[item.order_id] = [];
      }
      acc[item.order_id].push({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        product_snapshot: item.product_snapshot,
        created_at: item.created_at,
        product: {
          id: item.product_id,
          name: item.product_name || (item.product_snapshot as any)?.name,
          images: item.product_images || (item.product_snapshot as any)?.images,
        },
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Combine orders with items
    const ordersWithDetails: OrderWithDetails[] = ordersResult.map(order => ({
      id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      total_amount: order.total_amount,
      subtotal: order.subtotal,
      tax_amount: order.tax_amount,
      shipping_amount: order.shipping_amount,
      discount_amount: order.discount_amount,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      notes: order.notes,
      tracking_number: order.tracking_number,
      estimated_delivery: order.estimated_delivery,
      delivered_at: order.delivered_at,
      cancelled_at: order.cancelled_at,
      cancellation_reason: order.cancellation_reason,
      payment_transaction_id: order.payment_transaction_id,
      created_at: order.created_at,
      updated_at: order.updated_at,
      customer: {
        id: order.user_id,
        name: order.customer_name || 'Unknown Customer',
        email: order.customer_email || '',
        phone_number: order.customer_phone || undefined,
      },
      items: itemsByOrder[order.id] || [],
      items_count: (itemsByOrder[order.id] || []).length,
    }));

    const totalPages = Math.ceil(total / limit);
    const page = Math.floor(offset / limit) + 1;

    return {
      orders: ordersWithDetails,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Get order by ID with full details
  async getOrderById(id: string): Promise<OrderWithDetails | null> {
    const orderResult = await this.db
      .select({
        // Order fields
        id: orders.id,
        order_number: orders.order_number,
        user_id: orders.user_id,
        status: orders.status,
        payment_status: orders.payment_status,
        payment_method: orders.payment_method,
        total_amount: orders.total_amount,
        subtotal: orders.subtotal,
        tax_amount: orders.tax_amount,
        shipping_amount: orders.shipping_amount,
        discount_amount: orders.discount_amount,
        shipping_address: orders.shipping_address,
        billing_address: orders.billing_address,
        notes: orders.notes,
        tracking_number: orders.tracking_number,
        estimated_delivery: orders.estimated_delivery,
        delivered_at: orders.delivered_at,
        cancelled_at: orders.cancelled_at,
        cancellation_reason: orders.cancellation_reason,
        payment_transaction_id: orders.payment_transaction_id,
        created_at: orders.created_at,
        updated_at: orders.updated_at,
        // Customer fields
        customer_name: users.name,
        customer_email: users.email,
        customer_phone: users.phone_number,
      })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (orderResult.length === 0) {
      return null;
    }

    const orderData = orderResult[0];

    // Get order items
    const itemsResult = await this.db
      .select({
        id: orderItems.id,
        order_id: orderItems.order_id,
        product_id: orderItems.product_id,
        quantity: orderItems.quantity,
        unit_price: orderItems.unit_price,
        total_price: orderItems.total_price,
        product_snapshot: orderItems.product_snapshot,
        created_at: orderItems.created_at,
        // Product fields
        product_name: products.name,
        product_images: products.images,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.product_id, products.id))
      .where(eq(orderItems.order_id, id));

    const items = itemsResult.map(item => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      product_snapshot: item.product_snapshot,
      created_at: item.created_at,
      product: {
        id: item.product_id,
        name: item.product_name || (item.product_snapshot as any)?.name,
        images: item.product_images || (item.product_snapshot as any)?.images,
      },
      updated_at: new Date(),
      product_name: '',
      product_image: null,
      product_weight: null,
    }));

    return {
      id: orderData.id,
      order_number: orderData.order_number,
      user_id: orderData.user_id,
      status: orderData.status,
      payment_status: orderData.payment_status,
      payment_method: orderData.payment_method,
      total_amount: orderData.total_amount,
      subtotal: orderData.subtotal,
      tax_amount: orderData.tax_amount,
      shipping_amount: orderData.shipping_amount,
      discount_amount: orderData.discount_amount,
      shipping_address: orderData.shipping_address,
      billing_address: orderData.billing_address,
      notes: orderData.notes,
      tracking_number: orderData.tracking_number,
      estimated_delivery: orderData.estimated_delivery,
      delivered_at: orderData.delivered_at,
      cancelled_at: orderData.cancelled_at,
      cancellation_reason: orderData.cancellation_reason,
      payment_transaction_id: orderData.payment_transaction_id,
      created_at: orderData.created_at,
      updated_at: orderData.updated_at,
      customer: {
        id: orderData.user_id,
        name: orderData.customer_name || 'Unknown Customer',
        email: orderData.customer_email || '',
        phone_number: orderData.customer_phone || undefined,
      },
      items,
      items_count: items.length,
    };
  }

  // Update order status
  async updateOrderStatus(
    id: string,
    status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED',
    trackingNumber?: string,
    cancellationReason?: string
  ): Promise<OrderWithDetails> {
    const existingOrder = await this.getOrderById(id);
    if (!existingOrder) {
      throw new AppError('Order not found', 404);
    }

    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    // Set status-specific timestamps and data
    switch (status) {
      case 'SHIPPED':
        updateData.estimated_delivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        if (trackingNumber) {
          updateData.tracking_number = trackingNumber;
        }
        break;
      case 'DELIVERED':
        updateData.delivered_at = new Date();
        break;
      case 'CANCELLED':
        updateData.cancelled_at = new Date();
        if (cancellationReason) {
          updateData.cancellation_reason = cancellationReason;
        }
        // Restore product stock
        for (const item of existingOrder.items) {
          await this.db
            .update(products)
            .set({
              stock_quantity: sql`${products.stock_quantity} + ${item.quantity}`,
              updated_at: new Date(),
            } as any)
            .where(eq(products.id, item.product_id));
        }
        break;
    }

    await this.db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id));

    const updatedOrder = await this.getOrderById(id);
    if (!updatedOrder) {
      throw new AppError('Failed to retrieve updated order', 500);
    }

    return updatedOrder;
  }

  // Get order statistics
  async getOrderStats(timeRangeDays: number = 30): Promise<OrderStats> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - timeRangeDays);

    // Get total counts by status
    const statusCounts = await this.db
      .select({
        status: orders.status,
        count: count(),
      })
      .from(orders)
      .groupBy(orders.status);

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Get total revenue
    const [revenueResult] = await this.db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total_amount}), 0)`,
        totalOrders: count(),
      })
      .from(orders)
      .where(eq(orders.payment_status, 'PAID'));

    // Get growth rate (compare with previous period)
    const previousDateThreshold = new Date();
    previousDateThreshold.setDate(previousDateThreshold.getDate() - (timeRangeDays * 2));

    const [currentPeriodOrders] = await this.db
      .select({ count: count() })
      .from(orders)
      .where(gte(orders.created_at, dateThreshold));

    const [previousPeriodOrders] = await this.db
      .select({ count: count() })
      .from(orders)
      .where(and(
        gte(orders.created_at, previousDateThreshold),
        lte(orders.created_at, dateThreshold)
      ));

    const ordersGrowthRate = previousPeriodOrders.count > 0
      ? ((currentPeriodOrders.count - previousPeriodOrders.count) / previousPeriodOrders.count) * 100
      : 0;

    const totalOrders = revenueResult.totalOrders;
    const totalRevenue = revenueResult.totalRevenue;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      pendingOrders: statusMap['PENDING'] || 0,
      confirmedOrders: statusMap['CONFIRMED'] || 0,
      processingOrders: statusMap['PROCESSING'] || 0,
      shippedOrders: statusMap['SHIPPED'] || 0,
      deliveredOrders: statusMap['DELIVERED'] || 0,
      cancelledOrders: statusMap['CANCELLED'] || 0,
      totalRevenue,
      averageOrderValue,
      ordersGrowthRate,
    };
  }

  // Get recent orders
  async getRecentOrders(limit: number = 10): Promise<OrderWithDetails[]> {
    const result = await this.getOrders({
      sortBy: 'created_at',
      sortOrder: 'desc',
      limit,
      offset: 0,
    });

    return result.orders;
  }

  // Delete order (soft delete by cancelling)
  async deleteOrder(id: string, reason?: string): Promise<void> {
    const existingOrder = await this.getOrderById(id);
    if (!existingOrder) {
      throw new AppError('Order not found', 404);
    }

    if (existingOrder.status === 'DELIVERED') {
      throw new AppError('Cannot delete delivered orders', 400);
    }

    await this.updateOrderStatus(id, 'CANCELLED', undefined, reason || 'Deleted by admin');
  }

  // Update payment status
  async updatePaymentStatus(
    id: string,
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  ): Promise<OrderWithDetails> {
    const existingOrder = await this.getOrderById(id);
    if (!existingOrder) {
      throw new AppError('Order not found', 404);
    }

    await this.db
      .update(orders)
      .set({
        payment_status: paymentStatus,
        updated_at: new Date(),
      } as any)
      .where(eq(orders.id, id));

    const updatedOrder = await this.getOrderById(id);
    if (!updatedOrder) {
      throw new AppError('Failed to retrieve updated order', 500);
    }

    return updatedOrder;
  }
}
