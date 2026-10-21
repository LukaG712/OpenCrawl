import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../database/redis';
import logger from '../utils/logger';
import { BatchScrapeOptions, BatchScrapeJob } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';

const BATCH_SCRAPE_QUEUE_NAME = 'batch-scrape-queue';

let batchScrapeQueue: Queue | null = null;

export function getBatchScrapeQueue(): Queue {
  if (!batchScrapeQueue) {
    const connection = getRedisClient();
    batchScrapeQueue = new Queue(BATCH_SCRAPE_QUEUE_NAME, { connection });
    logger.info('Batch scrape queue initialized');
  }
  return batchScrapeQueue;
}

export async function createBatchScrapeJob(options: BatchScrapeOptions): Promise<string> {
  const queue = getBatchScrapeQueue();
  const jobId = uuidv4();

  await queue.add('batch-scrape', options, {
    jobId,
    attempts: 1,
  });

  logger.info(`Created batch scrape job: ${jobId} with ${options.urls.length} URLs`);
  return jobId;
}

export async function getBatchScrapeJobStatus(jobId: string): Promise<BatchScrapeJob | null> {
  const queue = getBatchScrapeQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const progress = (job.progress as any) as any;
  const state = await job.getState();

  const batchJob: BatchScrapeJob = {
    jobId,
    status: state === 'completed' ? 'completed' : state === 'failed' ? 'failed' : 'scraping',
    totalUrls: progress?.totalUrls || 0,
    scrapedUrls: progress?.scrapedUrls || 0,
    options: job.data as BatchScrapeOptions,
    results: progress?.results || [],
    errors: progress?.errors || [],
    createdAt: new Date(job.timestamp || Date.now()).toISOString(),
  };

  if (state === 'completed' || state === 'failed') {
    batchJob.completedAt = new Date().toISOString();
    const returnValue = job.returnvalue as any;
    if (returnValue) {
      batchJob.results = returnValue.results || [];
      batchJob.errors = returnValue.errors || [];
      batchJob.totalUrls = returnValue.totalUrls || 0;
      batchJob.scrapedUrls = returnValue.scrapedUrls || 0;
    }
  }

  return batchJob;
}

export async function cancelBatchScrapeJob(jobId: string): Promise<boolean> {
  const queue = getBatchScrapeQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return false;
  }

  await job.remove();
  logger.info(`Cancelled batch scrape job: ${jobId}`);
  return true;
}

export function createBatchScrapeWorker(processFn: (job: Job<BatchScrapeOptions>) => Promise<any>): Worker {
  const connection = getRedisClient();
  const worker = new Worker(BATCH_SCRAPE_QUEUE_NAME, processFn, {
    connection,
    concurrency: 1,
  });

  worker.on('completed', (job) => {
    logger.info(`Batch scrape job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Batch scrape job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
