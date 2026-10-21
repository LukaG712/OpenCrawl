import { FastifyInstance, FastifyReply } from 'fastify';
import { createCrawlJob, getCrawlJobStatus, cancelCrawlJob } from '../../queue/crawlQueue';
import { CrawlOptions } from '../../utils/types';

export function registerCrawlRoutes(app: FastifyInstance) {
  // Start a crawl job
  app.post('/crawl', async (request: any, reply: FastifyReply) => {
    try {
      const body = request.body as CrawlOptions;

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

      const jobId = await createCrawlJob(body);

      reply.code(200).send({
        success: true,
        jobId,
        url: `http://${request.hostname}/crawl/${jobId}`,
        message: 'Crawl job created. Use the jobId to check status.',
      });
    } catch (err) {
      app.log.error(`Crawl creation error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Failed to create crawl job',
      });
    }
  });

  // Get crawl job status
  app.get('/crawl/:jobId', async (request: any, reply: FastifyReply) => {
    try {
      const jobId = request.params.jobId as string;
      const status = await getCrawlJobStatus(jobId);

      if (!status) {
        reply.code(404).send({
          success: false,
          error: 'Crawl job not found',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        status: status.status,
        jobId: status.jobId,
        totalPages: status.totalPages,
        scrapedPages: status.scrapedPages,
        data: status.results,
        errors: status.errors || [],
        nextPollMs: status.status === 'scraping' ? 2000 : undefined,
      });
    } catch (err) {
      app.log.error(`Crawl status error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Failed to get crawl status',
      });
    }
  });

  // Cancel a crawl job
  app.delete('/crawl/:jobId', async (request: any, reply: FastifyReply) => {
    try {
      const jobId = request.params.jobId as string;
      const cancelled = await cancelCrawlJob(jobId);

      if (!cancelled) {
        reply.code(404).send({
          success: false,
          error: 'Crawl job not found',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        message: 'Crawl job cancelled',
      });
    } catch (err) {
      app.log.error(`Crawl cancel error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Failed to cancel crawl job',
      });
    }
  });
}
