import { createApp, startServer } from './server.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('main');

async function main(): Promise<void> {
  logger.info('MCxOSC Backend Service starting...');

  const context = await createApp();
  await startServer(context);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
