import { Job } from 'bullmq';
import { createCrawlWorker } from './queue/crawlQueue';
import { createBatchScrapeWorker } from './queue/batchScrapeQueue';
import { getExtractQueue } from './queue/extractQueue';
import { getAgentQueue } from './queue/agentQueue';
import { crawl } from './services/crawl';
import { scrapeUrl } from './services/scrape';
import { extractFromUrls } from './services/extract';
import { runAgent } from './services/agent';
import { sendWebhook } from './utils/webhook';
import { CrawlOptions, BatchScrapeOptions, ExtractOptions, AgentOptions } from './utils/types';
import { cleanupExpiredSessions } from './services/scrape/browser';
import logger from './utils/logger';

async function processCrawlJob(job: Job<CrawlOptions>) {
  logger.info(`Processing crawl job ${job.id}`);

  const options = job.data;
  const results: any[] = [];
  const errors: any[] = [];

  const crawlResult = await crawl(options, (result) => {
    results.push(result);
    job.updateProgress({
      scrapedPages: results.length + errors.length,
      totalPages: options.limit || 100,
      results,
      errors,
    });
  });

  job.updateProgress({
    scrapedPages: crawlResult.scrapedPages,
    totalPages: crawlResult.totalPages,
    results: crawlResult.results,
    errors: crawlResult.errors,
  });

  // Send webhook if configured
  if (options.webhook) {
    await sendWebhook(options.webhook, {
      event: 'crawl.completed',
      jobId: job.id,
      status: 'completed',
      totalPages: crawlResult.totalPages,
      scrapedPages: crawlResult.scrapedPages,
      errors: crawlResult.errors.length,
    });
  }

  return {
    results: crawlResult.results,
    errors: crawlResult.errors,
    totalPages: crawlResult.totalPages,
    scrapedPages: crawlResult.scrapedPages,
  };
}

async function processBatchScrapeJob(job: Job<BatchScrapeOptions>) {
  logger.info(`Processing batch scrape job ${job.id} with ${job.data.urls.length} URLs`);

  const options = job.data;
  const results: any[] = [];
  const errors: any[] = [];

  for (let i = 0; i < options.urls.length; i++) {
    const url = options.urls[i];

    try {
      const scrapeOpts = {
        url,
        formats: options.scrapeOptions?.formats || ['markdown'],
        onlyMainContent: options.scrapeOptions?.onlyMainContent ?? true,
        timeout: options.scrapeOptions?.timeout || 30000,
        waitFor: options.scrapeOptions?.waitFor || 0,
      };

      const result = await scrapeUrl(scrapeOpts);

      if (result.success && result.data) {
        results.push({
          success: true,
          url,
          data: result.data,
          metadata: result.data.metadata,
        });
      } else {
        errors.push({ url, error: result.error || 'Unknown error' });
        results.push({
          success: false,
          url,
          error: result.error || 'Unknown error',
        });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      logger.error(`Error scraping ${url}: ${errorMsg}`);
      errors.push({ url, error: errorMsg });
      results.push({
        success: false,
        url,
        error: errorMsg,
      });
    }

    job.updateProgress({
      scrapedUrls: i + 1,
      totalUrls: options.urls.length,
      results,
      errors,
    });
  }

  // Send webhook if configured
  if (options.webhook) {
    await sendWebhook(options.webhook, {
      event: 'batch_scrape.completed',
      jobId: job.id,
      status: 'completed',
      totalUrls: options.urls.length,
      scrapedUrls: results.length,
      errors: errors.length,
    });
  }

  return {
    results,
    errors,
    totalUrls: options.urls.length,
    scrapedUrls: results.length,
  };
}

async function processExtractJob(job: Job<ExtractOptions>) {
  logger.info(`Processing extract job ${job.id}`);

  const options = job.data;

  try {
    const result = await extractFromUrls(options);

    await job.moveToCompleted({
      result,
      completedAt: new Date().toISOString(),
    }, '', true);

    job.updateProgress({ status: 'completed' });

    return { result };
  } catch (err) {
    const errorMsg = (err as Error).message;
    logger.error(`Extract job failed: ${errorMsg}`);

    await job.moveToFailed(new Error(errorMsg), '', true);
    job.updateProgress({ status: 'failed' });

    throw err;
  }
}

async function processAgentJob(job: Job<AgentOptions>) {
  logger.info(`Processing agent job ${job.id}`);

  const options = job.data;

  try {
    const { result, sources } = await runAgent(options);

    await job.moveToCompleted({
      result,
      sources,
      completedAt: new Date().toISOString(),
    }, '', true);

    job.updateProgress({ status: 'completed' });

    return { result, sources };
  } catch (err) {
    const errorMsg = (err as Error).message;
    logger.error(`Agent job failed: ${errorMsg}`);

    await job.moveToFailed(new Error(errorMsg), '', true);
    job.updateProgress({ status: 'failed' });

    throw err;
  }
}

async function main() {
  logger.info('Starting workers...');

  // Crawl worker
  const crawlWorker = createCrawlWorker(processCrawlJob);

  // Batch scrape worker
  const batchScrapeWorker = createBatchScrapeWorker(processBatchScrapeJob);

  // Extract worker
  const extractWorker = new (require('bullmq').Worker)('extract-queue', processExtractJob, {
    connection: require('./database/redis').getRedisClient(),
  });

  // Agent worker
  const agentWorker = new (require('bullmq').Worker)('agent-queue', processAgentJob, {
    connection: require('./database/redis').getRedisClient(),
  });

  crawlWorker.on('error', (err: Error) => {
    logger.error(`Crawl worker error: ${err.message}`);
  });

  batchScrapeWorker.on('error', (err: Error) => {
    logger.error(`Batch scrape worker error: ${err.message}`);
  });

  extractWorker.on('error', (err: Error) => {
    logger.error(`Extract worker error: ${err.message}`);
  });

  agentWorker.on('error', (err: Error) => {
    logger.error(`Agent worker error: ${err.message}`);
  });

  // Periodic session cleanup
  const cleanupInterval = setInterval(() => {
    cleanupExpiredSessions().catch((err: Error) => {
      logger.error(`Session cleanup error: ${err.message}`);
    });
  }, 5 * 60 * 1000); // Every 5 minutes

  logger.info('All workers are ready');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down workers...');
    clearInterval(cleanupInterval);
    await crawlWorker.close();
    await batchScrapeWorker.close();
    await extractWorker.close();
    await agentWorker.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down workers...');
    clearInterval(cleanupInterval);
    await crawlWorker.close();
    await batchScrapeWorker.close();
    await extractWorker.close();
    await agentWorker.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(`Fatal worker error: ${err.message}`);
  process.exit(1);
});
