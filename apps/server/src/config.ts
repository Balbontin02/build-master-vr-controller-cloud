import path from 'node:path';

export const APP_NAME = 'Build Master VR Controller';
export const APP_VERSION = '0.1.0';

export const HTTP_PORT = Number(process.env.PORT ?? process.env.HTTP_PORT ?? 3000);
export const HTTPS_PORT = Number(process.env.HTTPS_PORT ?? 3443);
export const WS_PATH = '/ws';
export const MAX_MESSAGE_SIZE = 16 * 1024;
export const MAX_MESSAGES_PER_SECOND = 25;
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_TIMEOUT_MS = 60_000;
export const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;

export const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
export const CONTROLLER_DIST = path.join(ROOT_DIR, 'apps', 'controller', 'dist');
export const BOOKMARKLET_DIST = path.join(ROOT_DIR, 'apps', 'quest-bridge', 'dist');
export const CERTS_DIR = path.join(__dirname, '..', 'certs');

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];