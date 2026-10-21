import { FastifyInstance, FastifyReply } from 'fastify';
import { AgentOptions } from '../../utils/types';
import { createAgentJob, getAgentJobStatus, deleteAgentJob } from '../../queue/agentQueue';
import logger from '../../utils/logger';

export function registerAgentRoutes(app: FastifyInstance) {
  // POST /agent - Start an agent job
  app.post('/agent', async (request: any, reply: FastifyReply) => {
    try {
      const body = request.body as AgentOptions;

      if (!body.prompt) {
        reply.code(400).send({
          success: false,
          error: 'Prompt is required',
        });
        return;
      }

      const jobId = await createAgentJob(body);

      reply.code(200).send({
        success: true,
        jobId,
        url: `/agent/${jobId}`,
      });
    } catch (err) {
      logger.error(`Agent error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // GET /agent/:jobId - Get agent job status
  app.get('/agent/:jobId', async (request: any, reply: FastifyReply) => {
    try {
      const { jobId } = request.params;
      const job = await getAgentJobStatus(jobId);

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
        sources: job.sources,
        error: job.error,
      });
    } catch (err) {
      logger.error(`Agent status error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // DELETE /agent/:jobId - Delete an agent job
  app.delete('/agent/:jobId', async (request: any, reply: FastifyReply) => {
    try {
      const { jobId } = request.params;
      await deleteAgentJob(jobId);

      reply.code(200).send({
        success: true,
        message: `Job ${jobId} deleted`,
      });
    } catch (err) {
      logger.error(`Agent delete error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}
