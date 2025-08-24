import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { AuthHandler } from './handlers/auth';
import { PaymentHandler } from './handlers/payments';
import { SubscriptionHandler } from './handlers/subscriptions';
import { DownloadHandler } from './handlers/downloads';
import { AdminHandler } from './handlers/admin';

// Types para Cloudflare Workers
interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  MERCADOPAGO_ACCESS_TOKEN: string;
  MERCADOPAGO_PUBLIC_KEY: string;
  JWT_SECRET: string;
  EMAIL_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: [
    'https://fixly-taller.com',
    'https://www.fixly-taller.com',
    'http://localhost:3000'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'Fixly Taller API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rutas públicas (sin autenticación)
app.route('/api/auth', AuthHandler);
app.route('/api/downloads', DownloadHandler);

// Middleware JWT para rutas protegidas
app.use('/api/protected/*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Token requerido' }, 401);
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, c.env.JWT_SECRET);
    c.set('user', decoded);
    return next();
  } catch (error) {
    return c.json({ error: 'Token inválido' }, 401);
  }
});

// Rutas protegidas
app.route('/api/protected/payments', PaymentHandler);
app.route('/api/protected/subscriptions', SubscriptionHandler);
app.route('/api/protected/admin', AdminHandler);

// Webhook MercadoPago (público pero verificado)
app.post('/api/webhooks/mercadopago', async (c) => {
  try {
    const body = await c.req.json();
    const headers = c.req.headers;

    // Verificar webhook de MercadoPago
    const PaymentService = await import('./services/PaymentService');
    const result = await PaymentService.handleWebhook(body, headers, c.env);

    return c.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// Cron job para verificar suscripciones
app.get('/api/cron/check-subscriptions', async (c) => {
  try {
    const SubscriptionService = await import('./services/SubscriptionService');
    await SubscriptionService.checkExpiredSubscriptions(c.env);

    return c.json({ status: 'Subscriptions checked' });
  } catch (error) {
    return c.json({ error: 'Cron job failed' }, 500);
  }
});

// Error handler global
app.notFound((c) => {
  return c.json({ error: 'Endpoint no encontrado' }, 404);
});

app.onError((err, c) => {
  console.error('Global error:', err);
  return c.json({ 
    error: 'Error interno del servidor',
    message: err.message 
  }, 500);
});

export default app;
