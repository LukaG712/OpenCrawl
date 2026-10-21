import { FastifyInstance, FastifyReply } from 'fastify';
import { scrapeUrl } from '../../services/scrape';
import { ScrapeOptions, ScrapeResult } from '../../utils/types';

export function registerScrapeRoutes(app: FastifyInstance) {
  app.post('/scrape', async (request: any, reply: FastifyReply) => {
    try {
      const body = request.body as ScrapeOptions;

      if (!body.url) {
        reply.code(400).send({
          success: false,
          error: 'URL is required',
        });
        return;
      }

      // Validate URL
      try {
        new URL(body.url);
      } catch {
        reply.code(400).send({
          success: false,
          error: 'Invalid URL format',
        });
        return;
      }

      const result: ScrapeResult = await scrapeUrl(body);

      if (!result.success) {
        reply.code(500).send({
          success: false,
          error: result.error || 'Failed to scrape URL',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        data: result.data,
      });
    } catch (err) {
      app.log.error(`Scrape error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}
