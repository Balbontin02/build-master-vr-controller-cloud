import http from 'node:http';
import https from 'node:https';
import { createApp } from './http/app';
import { createWsServer } from './ws/server';
import { Hub } from './state/hub';
import { ensureCertificate } from './tls';
import { getLocalIPv4s } from './ip';
import { logger } from './logger';
import {
  APP_NAME,
  APP_VERSION,
  CERTS_DIR,
  CONTROLLER_DIST,
  HTTPS_PORT,
  HTTP_PORT,
  WS_PATH,
  IS_PRODUCTION,
  ALLOWED_ORIGINS,
} from './config';

function printUrls(protocol: 'HTTP' | 'HTTPS', port: number): void {
  const ips = getLocalIPv4s();
  const hosts = ['localhost', ...ips];
  logger.info('SYSTEM', `${protocol} en http${protocol === 'HTTPS' ? 's' : ''}://<host>:${port}`);
  for (const host of hosts) {
    logger.info('SYSTEM', `  http${protocol === 'HTTPS' ? 's' : ''}://${host}:${port}/control`);
  }
}

function main(): void {
  const hub = new Hub();
  hub.startedAt = Date.now();

  const ctx = { httpsPort: HTTPS_PORT };

  const httpServer = http.createServer(createApp(hub, ctx, ALLOWED_ORIGINS));

  let httpsServer: https.Server | null = null;
  if (!IS_PRODUCTION) {
    const cert = ensureCertificate(CERTS_DIR);
    httpsServer = https.createServer({ key: cert.key, cert: cert.cert }, createApp(hub, ctx, ALLOWED_ORIGINS));
  }

  createWsServer(httpServer, httpsServer, hub);

  const host = IS_PRODUCTION ? '0.0.0.0' : undefined;
  httpServer.listen(HTTP_PORT, host, () => {
    logger.info('SYSTEM', `${APP_NAME} v${APP_VERSION} iniciado ${IS_PRODUCTION ? '(production)' : '(development)'}`);
    logger.info('SYSTEM', `WebSocket path: ${WS_PATH}`);
    logger.info('SYSTEM', `Controller estático: ${CONTROLLER_DIST}`);
    if (!IS_PRODUCTION) {
      printUrls('HTTP', HTTP_PORT);
    } else {
      logger.info('SYSTEM', `HTTP escuchando en puerto ${HTTP_PORT}`);
    }
  });

  if (httpsServer) {
    httpsServer.listen(HTTPS_PORT, host, () => {
      printUrls('HTTPS', HTTPS_PORT);
      logger.info(
        'SYSTEM',
        'Importante: el Quest debe abrir https://IP:3443 UNA vez para aceptar el certificado self-signed (necesario para wss desde la página https del tour D5).',
      );
    });
  }

  const shutdown = () => {
    logger.info('SYSTEM', 'Apagando…');
    httpServer.close();
    httpsServer?.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();