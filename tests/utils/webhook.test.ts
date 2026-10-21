import { generateWebhookSignature, verifyWebhookSignature } from '../../src/utils/webhook';

describe('Webhook Utilities', () => {
  const secret = 'test-secret-key';
  const body = JSON.stringify({ event: 'test', data: { id: 1 } });

  describe('generateWebhookSignature', () => {
    it('generates a signature with timestamp and hash', () => {
      const signature = generateWebhookSignature(body, secret);
      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });

    it('produces different signatures for different bodies', () => {
      const sig1 = generateWebhookSignature(body, secret);
      const sig2 = generateWebhookSignature(JSON.stringify({ event: 'other' }), secret);
      expect(sig1).not.toBe(sig2);
    });

    it('produces different signatures for different secrets', () => {
      const sig1 = generateWebhookSignature(body, secret);
      const sig2 = generateWebhookSignature(body, 'different-secret');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('verifies a valid signature', () => {
      const signature = generateWebhookSignature(body, secret);
      expect(verifyWebhookSignature(signature, body, secret)).toBe(true);
    });

    it('rejects a signature with wrong secret', () => {
      const signature = generateWebhookSignature(body, secret);
      expect(verifyWebhookSignature(signature, body, 'wrong-secret')).toBe(false);
    });

    it('rejects a signature with wrong body', () => {
      const signature = generateWebhookSignature(body, secret);
      expect(verifyWebhookSignature(signature, JSON.stringify({ other: 'data' }), secret)).toBe(false);
    });

    it('rejects an expired signature (older than 5 minutes)', () => {
      // Craft a signature with an old timestamp
      const oldTimestamp = (Date.now() - 6 * 60 * 1000).toString(); // 6 minutes ago
      const oldPayload = `${oldTimestamp}.${body}`;
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(oldPayload);
      const digest = hmac.digest('hex');
      const fakeSignature = `t=${oldTimestamp},v1=${digest}`;

      expect(verifyWebhookSignature(fakeSignature, body, secret)).toBe(false);
    });

    it('rejects malformed signature', () => {
      expect(verifyWebhookSignature('invalid', body, secret)).toBe(false);
      expect(verifyWebhookSignature('', body, secret)).toBe(false);
      expect(verifyWebhookSignature('t=123', body, secret)).toBe(false);
    });
  });
});
