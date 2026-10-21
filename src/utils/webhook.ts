import logger from '../utils/logger';

export async function sendWebhook(url: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!url) {
    return false;
  }

  try {
    logger.info(`Sending webhook to ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OpenCrawl-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      logger.info(`Webhook sent successfully to ${url}`);
      return true;
    } else {
      logger.warn(`Webhook failed with status ${response.status} for ${url}`);
      return false;
    }
  } catch (err) {
    logger.error(`Webhook error for ${url}: ${(err as Error).message}`);
    return false;
  }
}
