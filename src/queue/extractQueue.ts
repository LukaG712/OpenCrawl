import { Queue, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../database/redis';
import logger from '../utils/logger';
import { ExtractOptions, ExtractJob } from '../utils/types';

const EXTRACT_QUEUE_NAME = 'extract-queue';

let extractQueue: Queue | null = null;

export function getExtractQueue(): Queue {
  if (!extractQueue) {
    const connection = getRedisClient();
    extractQueue = new Queue(EXTRACT_QUEUE_NAME, { connection });
    logger.info('Extract queue initialized');
  }
  return extractQueue;
}

export async function createExtractJob(options: ExtractOptions): Promise<string> {
  const queue = getExtractQueue();
  const jobId = uuidv4();

  await queue.add('extract', options, {
    jobId,
    attempts: 1,
  });

  logger.info(`Created extract job: ${jobId}`);
  return jobId;
}

export async function getExtractJobStatus(jobId: string): Promise<ExtractJob | null> {
  const queue = getExtractQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const jobData = job.data as any;
  const jobProgress = job.progress as any;

  const extractJob: ExtractJob = {
    jobId,
    status: jobProgress?.status || 'extracting',
    options: jobData.options || optionsFromJob(job),
    result: jobData.result,
    error: jobData.error,
    createdAt: new Date(job.timestamp || Date.now()).toISOString(),
    completedAt: jobData.completedAt,
    webhook: jobData.webhook,
  };

  return extractJob;
}

function optionsFromJob(job: Job): ExtractOptions {
  return (job.data as any).options || { prompt: '' };
}

export async function deleteExtractJob(jobId: string): Promise<void> {
  const queue = getExtractQueue();
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
    logger.info(`Deleted extract job: ${jobId}`);
  }
}
