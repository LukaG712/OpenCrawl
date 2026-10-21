import { startServer } from './api/server';
import logger from './utils/logger';

async function main() {
  await startServer();
}

main().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  process.exit(0);
});
