import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(serverRoot, '..');

export function loadDotEnv(file = path.join(repoRoot, '.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] == null || process.env[k] === '') process.env[k] = v;
  }
}

export function loadConfig(env = process.env) {
  const adapters = new Set(String(env.ADAPTERS ?? 'local').split(',').map((s) => s.trim()).filter(Boolean));
  if (adapters.size === 0) adapters.add('local');
  return {
    port: Number(env.PORT || 8000),
    bindHost: env.BIND_HOST || '127.0.0.1',
    databaseUrl: env.DATABASE_URL || 'postgresql://clinic:clinic@127.0.0.1:5432/clinic',
    redisUrl: env.REDIS_URL ?? 'redis://127.0.0.1:6379/0',
    adapters,
    deskPin: env.DESK_PIN ?? '2468',
    internalToken: env.INTERNAL_TOKEN || 'dev-internal-token-change-me',
    toolToken: env.BOLNA_TOOL_TOKEN || 'dev-tool-token-change-me',
    webhookToken: env.BOLNA_WEBHOOK_TOKEN || 'dev-webhook-token-change-me',
    publicBaseUrl: env.PUBLIC_BASE_URL || 'http://127.0.0.1:8000',
    simulatorEnabled: env.SIMULATOR_ENABLED === '1' || env.SIMULATOR_ENABLED === 'true',
    staffDevPins: env.STAFF_DEV_PINS || '',
    kafkaBrokers: env.KAFKA_BOOTSTRAP_SERVERS || '',
    traceDir: env.TRACE_DIR || path.join(repoRoot, 'data', 'traces'),
    livekitPublicUrl: env.LIVEKIT_PUBLIC_URL || 'ws://127.0.0.1:7880',
    trustPrivatePeers: env.TRUST_PRIVATE_PEERS === '1',
    mcpIdentityUrl: env.MCP_IDENTITY_URL || '',
    mcpBookingUrl: env.MCP_BOOKING_URL || '',
    mcpRecordsUrl: env.MCP_RECORDS_URL || '',
    mcpDeskUrl: env.MCP_DESK_URL || '',
    clinicId: Number(env.CLINIC_ID || 1),
    holdIntervalMs: Number(env.HOLD_INTERVAL_MS || 60000),
    repoRoot,
    serverRoot,
  };
}

export function mcpUrl(config, mcp) {
  if (mcp === 'identity') return config.mcpIdentityUrl;
  if (mcp === 'booking') return config.mcpBookingUrl;
  if (mcp === 'records') return config.mcpRecordsUrl;
  if (mcp === 'desk') return config.mcpDeskUrl;
  return '';
}
