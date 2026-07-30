import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnvironment } from 'dotenv';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { MongoMeetingStore } from './store.js';
import { LiveKitTokenIssuer } from './token.js';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
loadEnvironment({ path: path.resolve(moduleDirectory, '../../../.env') });

const config = loadConfig();
const store = new MongoMeetingStore(config.mongoUri, config.mongoCollection);
await store.initialize();

const app = createApp(config, store, new LiveKitTokenIssuer(config));
const server = app.listen(config.port, () => {
  console.log(`QuickMeet API listening on http://localhost:${config.port}`);
  console.log(`Demo mode: ${config.demoMode ? 'enabled' : 'disabled'}`);
  console.log('Meeting store: MongoDB');
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} received; shutting down QuickMeet API`);
  server.close((error) => {
    void store.close().finally(() => {
      if (error) {
        console.error('Failed to close QuickMeet API cleanly', error);
        process.exitCode = 1;
      }
    });
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
