import Fastify, { FastifyInstance } from 'fastify';

describe('Server API', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    // Build a test server without starting it
    server = Fastify({ logger: false });

    // Register the same routes as the real server
    const cors = await import('@fastify/cors');
    await server.register(cors.default, { origin: true, credentials: true });

    // Health check (no auth) — registered BEFORE auth hook
    server.get('/health', async () => {
      return { status: 'ok', timestamp: expect.any(String) };
    });

    // Apply auth hook to all routes AFTER health
    server.addHook('onRequest', async (request: any, reply: any) => {
      // Skip health check
      if (request.url === '/health') return;
      const { apiKeyAuth } = await import('../../src/api/middleware/auth');
      await apiKeyAuth(request, reply, () => {});
    });

    // Register scrape route
    const { registerScrapeRoutes } = await import('../../src/api/routes/scrape');
    registerScrapeRoutes(server);

    // Register search route
    const { registerSearchRoutes } = await import('../../src/api/routes/search');
    registerSearchRoutes(server);

    // Register map route
    const { registerMapRoutes } = await import('../../src/api/routes/map');
    registerMapRoutes(server);

    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Health Check', () => {
    it('returns ok status without auth', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('rejects requests without API key', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/scrape',
        payload: { url: 'https://example.com' },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Missing API key');
    });

    it('rejects requests with invalid API key', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/scrape',
        headers: { authorization: 'Bearer wrong-key' },
        payload: { url: 'https://example.com' },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid API key');
    });

    it('accepts requests with valid Bearer token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/scrape',
        headers: { authorization: 'Bearer Spectra-dev-key-change-me' },
        payload: { url: 'not-a-url' },
      });

      // Should pass auth and fail on URL validation
      expect(response.statusCode).toBe(400);
    });

    it('accepts requests with api-key query param', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/scrape?api-key=Spectra-dev-key-change-me',
        payload: { url: 'not-a-url' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Scrape Route Validation', () => {
    const validKey = 'Spectra-dev-key-change-me';

    it('rejects missing URL', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/scrape',
        headers: { authorization: `Bearer ${validKey}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('URL is required');
    });

    it('rejects invalid URL format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/scrape',
        headers: { authorization: `Bearer ${validKey}` },
        payload: { url: 'not-a-url' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Invalid URL format');
    });
  });

  describe('Search Route Validation', () => {
    const validKey = 'Spectra-dev-key-change-me';

    it('rejects missing query', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/search',
        headers: { authorization: `Bearer ${validKey}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Search query is required');
    });
  });

  describe('Map Route Validation', () => {
    const validKey = 'Spectra-dev-key-change-me';

    it('rejects missing URL', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/map',
        headers: { authorization: `Bearer ${validKey}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('URL is required');
    });

    it('rejects invalid URL format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/map',
        headers: { authorization: `Bearer ${validKey}` },
        payload: { url: 'invalid-url' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Invalid URL format');
    });
  });
});
