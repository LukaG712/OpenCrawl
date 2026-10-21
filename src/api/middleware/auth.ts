import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import config from '../../config';

export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  const authHeader = request.headers.authorization;
  const apiKey = (request.query as any)['api-key'] as string;

  const providedKey = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : apiKey;

  if (!providedKey) {
    reply.code(401).send({
      success: false,
      error: 'Missing API key. Provide it via Authorization: Bearer <key> or ?api-key=<key>',
    });
    return;
  }

  if (providedKey !== config.apiKey) {
    reply.code(401).send({
      success: false,
      error: 'Invalid API key',
    });
    return;
  }

  done();
}
