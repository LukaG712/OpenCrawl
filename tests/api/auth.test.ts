import { apiKeyAuth } from '../../src/api/middleware/auth';
import config from '../../src/config';

describe('API Key Authentication', () => {
  const mockRequest = (headers: Record<string, string>, query?: Record<string, string>) => {
    return {
      headers,
      query: query || {},
    } as any;
  };

  const mockReply = () => {
    const code: any = jest.fn().mockReturnThis();
    const send = jest.fn();
    return { code, send };
  };

  let request: any;
  let reply: any;
  let doneCalled = false;

  beforeEach(() => {
    request = mockRequest({});
    reply = mockReply();
    doneCalled = false;
  });

  describe('Missing API key', () => {
    it('rejects when no authorization header', async () => {
      request = mockRequest({});
      await apiKeyAuth(request, reply, () => { doneCalled = true; });

      expect(reply.code).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.stringContaining('Authorization') })
      );
      expect(doneCalled).toBe(false);
    });
  });

  describe('Bearer token authentication', () => {
    it('accepts valid Bearer token', async () => {
      request = mockRequest({ authorization: `Bearer ${config.apiKey}` });
      await apiKeyAuth(request, reply, () => { doneCalled = true; });

      expect(doneCalled).toBe(true);
      expect(reply.code).not.toHaveBeenCalled();
    });

    it('rejects invalid Bearer token', async () => {
      request = mockRequest({ authorization: 'Bearer wrong-key' });
      await apiKeyAuth(request, reply, () => { doneCalled = true; });

      expect(reply.code).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Invalid API key' })
      );
      expect(doneCalled).toBe(false);
    });

    it('rejects non-Bearer authorization header', async () => {
      request = mockRequest({ authorization: 'Token some-token' });
      await apiKeyAuth(request, reply, () => { doneCalled = true; });

      expect(reply.code).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.stringContaining('Authorization') })
      );
    });
  });

  describe('Query parameter authentication', () => {
    it('rejects api-key query param (Bearer only)', async () => {
      request = mockRequest({}, { 'api-key': config.apiKey });
      await apiKeyAuth(request, reply, () => { doneCalled = true; });

      expect(doneCalled).toBe(false);
      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('Priority', () => {
    it('uses Bearer token', async () => {
      request = mockRequest({ authorization: `Bearer ${config.apiKey}` }, { 'api-key': 'wrong-key' });
      await apiKeyAuth(request, reply, () => { doneCalled = true; });

      expect(doneCalled).toBe(true);
    });
  });
});
