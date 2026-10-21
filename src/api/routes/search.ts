import { FastifyInstance, FastifyReply } from 'fastify';
import { search } from '../../services/search';
import { SearchOptions } from '../../utils/types';

export function registerSearchRoutes(app: FastifyInstance) {
  app.post('/search', async (request: any, reply: FastifyReply) => {
    try {
      const body = request.body as SearchOptions;

      if (!body.query) {
        reply.code(400).send({
          success: false,
          error: 'Search query is required',
        });
        return;
      }

      const result = await search(body);

      if (!result.success) {
        reply.code(500).send({
          success: false,
          error: result.error || 'Search failed',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        data: result.data,
      });
    } catch (err) {
      app.log.error(`Search error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}
