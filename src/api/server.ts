import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { apiKeyAuth } from './middleware/auth';
import { registerScrapeRoutes } from './routes/scrape';
import { registerCrawlRoutes } from './routes/crawl';
import { registerMapRoutes } from './routes/map';
import config from '../config';
import logger from '../utils/logger';

const app = Fastify({
  logger: {
    level: config.logLevel,
  },
});

async function bootstrap() {
  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    keyGenerator: (request) => {
      return request.headers.authorization || request.ip;
    },
  });

  // Health check (no auth required)
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Apply auth to all API routes (skip health check)
  app.addHook('onRequest', async (request, reply) => {
    await apiKeyAuth(request, reply, () => {});
  });

  // Register routes
  registerScrapeRoutes(app);
  registerCrawlRoutes(app);
  registerMapRoutes(app);

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error(`Unhandled error: ${error.message}`);
    reply.code(500).send({
      success: false,
      error: 'Internal server error',
    });
  });

  return app;
}

export async function startServer() {
  await bootstrap();

  try {
    await app.listen({
      port: config.port,
      host: config.host,
    });
    logger.info(`Server listening on http://${config.host}:${config.port}`);
  } catch (err) {
    logger.error(`Failed to start server: ${(err as Error).message}`);
    process.exit(1);
  }
}

export { app };
