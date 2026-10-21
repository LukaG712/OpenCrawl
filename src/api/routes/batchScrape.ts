import { FastifyInstance, FastifyReply } from 'fastify';
import { createBatchScrapeJob, getBatchScrapeJobStatus, cancelBatchScrapeJob } from '../../queue/batchScrapeQueue';
import { BatchScrapeOptions } from '../../utils/types';

export function registerBatchScrapeRoutes(app: FastifyInstance) {
  // Start a batch scrape job
  app.post('/batch_scrape', async (request: any, reply: FastifyReply) => {
    try {
      const body = request.body as BatchScrapeOptions;

      if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
        reply.code(400).send({
          success: false,
          error: 'At least one URL is required',
        });
        return;
      }

      // Validate URLs
      const invalidUrls: string[] = [];
      for (const url of body.urls) {
        try {
          new URL(url);
        } catch {
          invalidUrls.push(url);
        }
      }

      if (invalidUrls.length > 0) {
        reply.code(400).send({
          success: false,
          error: `Invalid URLs: ${invalidUrls.join(', ')}`,
        });
        return;
      }

      const jobId = await createBatchScrapeJob(body);

      reply.code(200).send({
        success: true,
        jobId,
        url: `http://${request.hostname}/batch_scrape/${jobId}`,
        message: 'Batch scrape job created. Use the jobId to check status.',
      });
    } catch (err) {
      app.log.error(`Batch scrape creation error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Failed to create batch scrape job',
      });
    }
  });

  // Get batch scrape job status
  app.get('/batch_scrape/:jobId', async (request: any, reply: FastifyReply) => {
    try {
      const jobId = request.params.jobId as string;
      const status = await getBatchScrapeJobStatus(jobId);

      if (!status) {
        reply.code(404).send({
          success: false,
          error: 'Batch scrape job not found',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        status: status.status,
        jobId: status.jobId,
        totalUrls: status.totalUrls,
        scrapedUrls: status.scrapedUrls,
        data: status.results,
        errors: status.errors || [],
        nextPollMs: status.status === 'scraping' ? 2000 : undefined,
      });
    } catch (err) {
      app.log.error(`Batch scrape status error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Failed to get batch scrape status',
      });
    }
  });

  // Cancel a batch scrape job
  app.delete('/batch_scrape/:jobId', async (request: any, reply: FastifyReply) => {
    try {
      const jobId = request.params.jobId as string;
      const cancelled = await cancelBatchScrapeJob(jobId);

      if (!cancelled) {
        reply.code(404).send({
          success: false,
          error: 'Batch scrape job not found',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        message: 'Batch scrape job cancelled',
      });
    } catch (err) {
      app.log.error(`Batch scrape cancel error: ${(err as Error).message}`);
      reply.code(500).send({
        success: false,
        error: 'Failed to cancel batch scrape job',
      });
    }
  });
}
