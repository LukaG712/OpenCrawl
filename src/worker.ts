import { Job } from 'bullmq';
import { createCrawlWorker } from './queue/crawlQueue';
import { createBatchScrapeWorker } from './queue/batchScrapeQueue';
import { crawl } from './services/crawl';
import { scrapeUrl } from './services/scrape';
import { sendWebhook } from './utils/webhook';
import { CrawlOptions, BatchScrapeOptions } from './utils/types';
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

async function main() {
  logger.info('Starting workers...');

  // Crawl worker
  const crawlWorker = createCrawlWorker(processCrawlJob);

  // Batch scrape worker
  const batchScrapeWorker = createBatchScrapeWorker(processBatchScrapeJob);

  crawlWorker.on('error', (err) => {
    logger.error(`Crawl worker error: ${err.message}`);
  });

  batchScrapeWorker.on('error', (err) => {
    logger.error(`Batch scrape worker error: ${err.message}`);
  });

  logger.info('All workers are ready');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down workers...');
    await crawlWorker.close();
    await batchScrapeWorker.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down workers...');
    await crawlWorker.close();
    await batchScrapeWorker.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(`Fatal worker error: ${err.message}`);
  process.exit(1);
});
