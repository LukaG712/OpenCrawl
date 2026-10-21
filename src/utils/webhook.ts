import crypto from 'crypto';
import logger from '../utils/logger';

export async function sendWebhook(
  url: string,
  payload: Record<string, unknown>,
  options?: { secret?: string }
): Promise<boolean> {
  if (!url) {
    return false;
  }

  try {
    const body = JSON.stringify(payload);

    // Generate webhook signature if secret is provided
    let signature = '';
    if (options?.secret) {
      signature = generateWebhookSignature(body, options.secret);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Trapper-Webhook/1.0',
    };

    if (signature) {
      headers['X-Trapper-Signature'] = signature;
    }

    logger.info(`Sending webhook to ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
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

export function generateWebhookSignature(body: string, secret: string): string {
  const timestamp = Date.now().toString();
  const payload = `${timestamp}.${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

export function verifyWebhookSignature(
  signature: string,
  body: string,
  secret: string
): boolean {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const signaturePart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestamp = timestampPart.split('=')[1];
    const expectedSignature = signaturePart.split('=')[1];

    // Check timestamp is within 5 minutes
    const ts = parseInt(timestamp, 10);
    if (Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
      return false;
    }

    const payload = `${timestamp}.${body}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const digest = hmac.digest('hex');

    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}
