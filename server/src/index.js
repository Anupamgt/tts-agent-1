import { createPool } from './db.js';
import { loadConfig, loadDotEnv } from './config.js';
import { createApi } from './http.js';
import { runIndexer } from './indexer.js';
import { createMcpServer } from './mcp.js';
import { createMetrics } from './metrics.js';
import { createRedis, rebuildRedis } from './redisbus.js';
import { seedDevPins } from './seedPins.js';
import { startHoldWorker } from './holds.js';

const MCP = {
  'mcp-identity': ['identity', 8011],
  'mcp-booking': ['booking', 8012],
  'mcp-records': ['records', 8013],
  'mcp-desk': ['desk', 8014],
};

const command = process.argv[2] || 'api';
loadDotEnv();
const config = loadConfig(process.env);
const db = createPool(config.databaseUrl);
const needsRedis = command === 'api' || command === 'clinic-trace-indexer';
const redis = await createRedis(needsRedis ? config.redisUrl : '');
const metrics = createMetrics();

if (command === 'api') {
  try {
    await seedDevPins(db, config);
    await rebuildRedis(db, redis);
  } catch (err) {
    console.error('startup data', err.message);
  }
  const server = createApi({ config, db, redis, metrics });
  server.listen(config.port, config.bindHost, () => {
    console.log(`api listening on ${config.bindHost}:${config.port}`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
} else if (MCP[command]) {
  const [name, fallback] = MCP[command];
  const port = Number(process.env.PORT || fallback);
  const server = createMcpServer({ name, db, config });
  server.listen(port, config.bindHost, () => {
    console.log(`${command} listening on ${config.bindHost}:${port}`);
  });
} else if (command === 'worker-holds') {
  console.log('worker-holds polling postgres');
  startHoldWorker(db, config.holdIntervalMs);
} else if (command === 'clinic-trace-indexer') {
  await runIndexer(db, redis, config);
} else {
  console.error(`unknown command ${command}`);
  console.error('commands: api, mcp-identity, mcp-booking, mcp-records, mcp-desk, worker-holds, clinic-trace-indexer');
  process.exit(1);
}
