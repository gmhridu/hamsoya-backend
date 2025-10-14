import { Hono } from 'hono';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';

import dashboardRoutes from './dashboard';
import userRoutes from './users';
import productRoutes from './products';
import categoryRoutes from './categories';
import orderRoutes from './orders';
import emailPerformanceRoutes from './email-performance';

const app = new Hono();

app.use('*', rateLimit({ windowMs: 60000, maxRequests: 100 }));
app.use('*', authMiddleware, adminMiddleware);

app.route('/dashboard', dashboardRoutes);
app.route('/users', userRoutes);
app.route('/products', productRoutes);
app.route('/categories', categoryRoutes);
app.route('/orders', orderRoutes);
app.route('/email-performance', emailPerformanceRoutes);

export default app;
