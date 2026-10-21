import { FastifyInstance, FastifyReply } from 'fastify';
import { ExtractOptions } from '../../utils/types';
import { createExtractJob, getExtractJobStatus, deleteExtractJob } from '../../queue/extractQueue';
import logger from '../../utils/logger';

export function registerExtractRoutes(app: FastifyInstance) {
  // POST /extract - Start an extraction job
  app.post('/extract', async (request: any, reply: FastifyReply) => {
    try {
      const body = request.body as ExtractOptions & { webhook?: string };

      if (!body.prompt) {
        reply.code(400).send({
          success: false,
          error: 'Prompt is required',
        });
        return;
      }

      const jobId = await createExtractJob({
        urls: body.urls,
        prompt: body.prompt,
        schema: body.schema,
        allowExternalLinks: body.allowExternalLinks,
        includeSubdomains: body.includeSubdomains,
      });

      reply.code(200).send({
        success: true,
        jobId,
        url: `/extract/${jobId}`,
      });
    } catch (err) {
      logger.error(`Extract error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // GET /extract/:jobId - Get extraction job status
  app.get('/extract/:jobId', async (request: any, reply: FastifyReply) => {
    try {
      const { jobId } = request.params;
      const job = await getExtractJobStatus(jobId);

      if (!job) {
        reply.code(404).send({
          success: false,
          error: `Job not found: ${jobId}`,
        });
        return;
      }

      reply.code(200).send({
        success: true,
        status: job.status,
        data: job.result,
        error: job.error,
      });
    } catch (err) {
      logger.error(`Extract status error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // DELETE /extract/:jobId - Delete an extraction job
  app.delete('/extract/:jobId', async (request: any, reply: FastifyReply) => {
    try {
      const { jobId } = request.params;
      await deleteExtractJob(jobId);

      reply.code(200).send({
        success: true,
        message: `Job ${jobId} deleted`,
      });
    } catch (err) {
      logger.error(`Extract delete error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}
