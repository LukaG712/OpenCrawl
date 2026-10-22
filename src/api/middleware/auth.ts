import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import config from '../../config';

export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({
      success: false,
      error: 'Missing or invalid Authorization header. Use: Authorization: Bearer <key>',
    });
    return;
  }

  const providedKey = authHeader.slice(7);

  if (providedKey !== config.apiKey) {
    reply.code(401).send({
      success: false,
      error: 'Invalid API key',
    });
    return;
  }

  done();
}
