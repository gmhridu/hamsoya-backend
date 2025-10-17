import { Hono } from 'hono';
import { successResponse, errorResponse } from '../../utils/response-builder';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminProductService } from '../../services/admin-product.service';
import { AdminCategoryService } from '../../services/admin-category.service';
import { AdminOrderService } from '../../services/admin-order.service';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';
import { AppError } from '../../utils/error-handler';
import type { HonoEnv } from '../../types/hono';

const app = new Hono<HonoEnv>();

app.use('*', authMiddleware, adminMiddleware);

interface DashboardStats {
  users: {
    total_users: number;
    verified_users: number;
    unverified_users: number;
    users_this_month: number;
    users_growth_rate: number;
  };
  products: {
    total_products: number;
    active_products: number;
    inactive_products: number;
    featured_products: number;
    out_of_stock_products: number;
    low_stock_products: number;
    products_this_month: number;
    products_growth_rate: number;
    average_product_price: number;
  };
  categories: {
    total_categories: number;
    active_categories: number;
    inactive_categories: number;
    categories_this_month: number;
    categories_growth_rate: number;
    average_products_per_category: number;
  };
  orders: {
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
  };
  overview: {
    total_revenue: number;
    total_orders: number;
    total_customers: number;
    total_products: number;
    revenue_growth: number;
    order_growth: number;
    customer_growth: number;
    product_growth: number;
  };
}

app.get('/stats', async c => {
  try {
    const adminUserService = new AdminUserService();
    const adminProductService = new AdminProductService();
    const adminCategoryService = new AdminCategoryService();
    const adminOrderService = new AdminOrderService();

    const [userStats, productStats, categoryStats, orderStats] = await Promise.all([
      adminUserService.getUserStats(),
      adminProductService.getProductStats(),
      adminCategoryService.getCategoryStats(),
      adminOrderService.getOrderStats(),
    ]);

    const dashboardStats: DashboardStats = {
      users: {
        total_users: userStats.total_users,
        verified_users: userStats.verified_users,
        unverified_users: userStats.unverified_users,
        users_this_month: userStats.users_this_month,
        users_growth_rate: userStats.users_growth_rate,
      },
      products: {
        total_products: productStats.total_products,
        active_products: productStats.active_products,
        inactive_products: productStats.inactive_products,
        featured_products: productStats.featured_products,
        out_of_stock_products: productStats.out_of_stock_products,
        low_stock_products: productStats.low_stock_products,
        products_this_month: productStats.products_this_month,
        products_growth_rate: productStats.products_growth_rate,
        average_product_price: productStats.average_product_price,
      },
      categories: {
        total_categories: categoryStats.total_categories,
        active_categories: categoryStats.active_categories,
        inactive_categories: categoryStats.inactive_categories,
        categories_this_month: categoryStats.categories_this_month,
        categories_growth_rate: categoryStats.categories_growth_rate,
        average_products_per_category: categoryStats.average_products_per_category,
      },
      orders: {
        total_orders: orderStats.total_orders,
        pending_orders: orderStats.pending_orders,
        confirmed_orders: orderStats.confirmed_orders,
        processing_orders: orderStats.processing_orders,
        shipped_orders: orderStats.shipped_orders,
        delivered_orders: orderStats.delivered_orders,
        cancelled_orders: orderStats.cancelled_orders,
        total_revenue: orderStats.total_revenue,
        average_order_value: orderStats.average_order_value,
        orders_this_month: orderStats.orders_this_month,
        orders_growth_rate: orderStats.orders_growth_rate,
        revenue_this_month: orderStats.revenue_this_month,
        revenue_growth_rate: orderStats.revenue_growth_rate,
      },
      overview: {
        total_revenue: orderStats.total_revenue,
        total_orders: orderStats.total_orders,
        total_customers: userStats.total_users,
        total_products: productStats.total_products,
        revenue_growth: orderStats.revenue_growth_rate,
        order_growth: orderStats.orders_growth_rate,
        customer_growth: userStats.users_growth_rate,
        product_growth: productStats.products_growth_rate,
      },
    };

    return c.json(successResponse(dashboardStats, 'Dashboard statistics retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get dashboard statistics'), 500 as any);
  }
});

app.get('/recent-activity', async c => {
  try {
    const limit = parseInt(c.req.query('limit') || '10', 10);

    const adminUserService = new AdminUserService();
    const adminProductService = new AdminProductService();
    const adminOrderService = new AdminOrderService();

    const [recentUsers, recentProducts, recentOrders] = await Promise.all([
      adminUserService.getUsers({
        sortBy: 'created_at',
        sortOrder: 'desc',
        limit: Math.min(limit, 5)
      }),
      adminProductService.getProducts({
        sortBy: 'created_at',
        sortOrder: 'desc',
        limit: Math.min(limit, 5)
      }),
      adminOrderService.getOrders({
        sortBy: 'created_at',
        sortOrder: 'desc',
        limit: Math.min(limit, 5)
      }),
    ]);

    const recentActivity = {
      recent_users: recentUsers.users.slice(0, 5),
      recent_products: recentProducts.products.slice(0, 5),
      recent_orders: recentOrders.orders.slice(0, 5),
    };

    return c.json(successResponse(recentActivity, 'Recent activity retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Recent activity error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get recent activity'), 500 as any);
  }
});

app.get('/alerts', async c => {
  try {
    const adminProductService = new AdminProductService();
    const adminOrderService = new AdminOrderService();

    const [lowStockProducts, pendingOrders] = await Promise.all([
      adminProductService.getProducts({
        low_stock: true,
        stock_threshold: 10,
        limit: 20
      }),
      adminOrderService.getOrders({
        status: 'PENDING',
        limit: 20
      }),
    ]);

    const alerts = {
      low_stock_products: lowStockProducts.products.filter(p => p.is_low_stock),
      pending_orders: pendingOrders.orders,
      low_stock_count: lowStockProducts.products.filter(p => p.is_low_stock).length,
      pending_orders_count: pendingOrders.orders.length,
    };

    return c.json(successResponse(alerts, 'Admin alerts retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Admin alerts error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get admin alerts'), 500 as any);
  }
});

app.get('/top-performers', async c => {
  try {
    const limit = parseInt(c.req.query('limit') || '5', 10);

    const adminProductService = new AdminProductService();
    const topSellingProducts = await adminProductService.getTopSellingProducts(limit);

    const topPerformers = {
      top_selling_products: topSellingProducts,
    };

    return c.json(successResponse(topPerformers, 'Top performers retrieved successfully'), 200 as any);
  } catch (error) {
    console.error('Top performers error:', error);
    if (error instanceof AppError) {
      return c.json(errorResponse(error.message), error.statusCode as any);
    }
    return c.json(errorResponse('Failed to get top performers'), 500 as any);
  }
});

export default app;
