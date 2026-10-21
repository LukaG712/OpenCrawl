import { FastifyInstance, FastifyReply } from 'fastify';
import { InteractOptions, InteractResult } from '../../utils/types';
import { interactWithPage } from '../../services/interact';
import logger from '../../utils/logger';

export function registerInteractRoutes(app: FastifyInstance) {
  app.post('/interact', async (request: any, reply: FastifyReply) => {
    try {
      const body = request.body as InteractOptions;

      if (!body.scrapeId && !body.prompt && !body.code && !body.actions) {
        reply.code(400).send({
          success: false,
          error: 'scrapeId is required, or provide prompt/code/actions to create a new session',
        });
        return;
      }

      const result: InteractResult = await interactWithPage(body);

      if (!result.success) {
        reply.code(500).send({
          success: false,
          error: result.error || 'Interaction failed',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        data: result.data,
        scrapeId: result.scrapeId,
      });
    } catch (err) {
      logger.error(`Interact error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}
