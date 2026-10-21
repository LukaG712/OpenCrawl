import { FastifyInstance, FastifyReply } from 'fastify';
import { mapUrl } from '../../services/map';
import { MapOptions } from '../../utils/types';

export function registerMapRoutes(app: FastifyInstance) {
  app.post('/map', async (request: any, reply: FastifyReply) => {
    try {
      const body = request.body as MapOptions;

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

      const result = await mapUrl(body);

      if (!result.success) {
        reply.code(500).send({
          success: false,
          error: result.error || 'Failed to map URL',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        links: result.links,
      });
    } catch (err) {
      app.log.error(`Map error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}
