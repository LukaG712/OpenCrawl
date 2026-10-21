import { Job } from 'bullmq';
import { createCrawlWorker } from './queue/crawlQueue';
import { crawl } from './services/crawl';
import { CrawlOptions } from './utils/types';
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

  return {
    results: crawlResult.results,
    errors: crawlResult.errors,
    totalPages: crawlResult.totalPages,
    scrapedPages: crawlResult.scrapedPages,
  };
}

async function main() {
  logger.info('Starting crawl worker...');

  const worker = createCrawlWorker(processCrawlJob);

  worker.on('error', (err) => {
    logger.error(`Worker error: ${err.message}`);
  });

  logger.info('Crawl worker is ready');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down worker...');
    await worker.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(`Fatal worker error: ${err.message}`);
  process.exit(1);
});
