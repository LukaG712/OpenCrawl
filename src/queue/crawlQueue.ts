import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../database/redis';
import logger from '../utils/logger';
import { CrawlOptions, CrawlJob } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';

const CRAWL_QUEUE_NAME = 'crawl-queue';

let crawlQueue: Queue | null = null;

export function getCrawlQueue(): Queue {
  if (!crawlQueue) {
    const connection = getRedisClient();
    crawlQueue = new Queue(CRAWL_QUEUE_NAME, { connection });
    logger.info('Crawl queue initialized');
  }
  return crawlQueue;
}

export async function createCrawlJob(options: CrawlOptions): Promise<string> {
  const queue = getCrawlQueue();
  const jobId = uuidv4();

  const job = await queue.add('crawl', options, {
    jobId,
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  logger.info(`Created crawl job: ${jobId}`);
  return jobId;
}

export async function getCrawlJobStatus(jobId: string): Promise<CrawlJob | null> {
  const queue = getCrawlQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const progress = (job.progress as any) as any;
  const state = await job.getState();

  const crawlJob: CrawlJob = {
    jobId,
    status: state === 'completed' ? 'completed' : state === 'failed' ? 'failed' : 'scraping',
    totalPages: progress?.totalPages || 0,
    scrapedPages: progress?.scrapedPages || 0,
    options: job.data as CrawlOptions,
    results: progress?.results || [],
    errors: progress?.errors || [],
    createdAt: new Date(job.timestamp || Date.now()).toISOString(),
  };

  if (state === 'completed' || state === 'failed') {
    crawlJob.completedAt = new Date().toISOString();
    const returnvalue = job.returnvalue as any;
    if (returnvalue) {
      crawlJob.results = returnvalue.results || [];
      crawlJob.errors = returnvalue.errors || [];
      crawlJob.totalPages = returnvalue.totalPages || 0;
      crawlJob.scrapedPages = returnvalue.scrapedPages || 0;
    }
  }

  return crawlJob;
}

export async function cancelCrawlJob(jobId: string): Promise<boolean> {
  const queue = getCrawlQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return false;
  }

  await job.remove();
  logger.info(`Cancelled crawl job: ${jobId}`);
  return true;
}

export function createCrawlWorker(processFn: (job: Job<CrawlOptions>) => Promise<any>): Worker {
  const connection = getRedisClient();
  const worker = new Worker(CRAWL_QUEUE_NAME, processFn, {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
