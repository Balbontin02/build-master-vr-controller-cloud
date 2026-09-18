import type http from 'node:http';
import type https from 'node:https';
import type { Duplex } from 'node:stream';
import { WebSocketServer } from 'ws';
import {
  HEARTBEAT_INTERVAL_MS,
  MAX_MESSAGE_SIZE,
  MAX_MESSAGES_PER_SECOND,
  WS_PATH,
} from '../config';
import { logger } from '../logger';
import type { Hub } from '../state/hub';

export function createWsServer(
  httpServer: http.Server,
  httpsServer: https.Server | null,
  hub: Hub,
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_SIZE });

  const onUpgrade = (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (url.pathname !== WS_PATH) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  };

  httpServer.on('upgrade', onUpgrade);
  if (httpsServer) httpsServer.on('upgrade', onUpgrade);

  wss.on('connection', (ws, req) => {
    const ip = (req.socket.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
    const host = req.headers.host ?? 'unknown';
    const clientId = hub.registerClient(ws, ip, host);
    logger.info('WS', `nuevo cliente ${clientId} desde ${ip}`);

    (ws as unknown as Record<string, boolean>).isAlive = true;
    ws.on('pong', () => {
      (ws as unknown as Record<string, boolean>).isAlive = true;
    });

    let windowStart = Date.now();
    let count = 0;

    ws.on('message', (data) => {
      count += 1;
      if (Date.now() - windowStart > 1000) {
        windowStart = Date.now();
        count = 0;
      }
      if (count > MAX_MESSAGES_PER_SECOND) {
        logger.warn('WS', `rate limit excedido por ${clientId}`);
        ws.close(1008, 'rate limit');
        return;
      }
      const text = data.toString('utf8');
      if (text.length > MAX_MESSAGE_SIZE) {
        ws.close(1009, 'message too large');
        return;
      }
      hub.handleMessage(clientId, text);
    });

    ws.on('close', () => {
      hub.handleDisconnect(clientId);
    });

    ws.on('error', () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    });
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const isAlive = (ws as unknown as Record<string, boolean>).isAlive;
      if (isAlive === false) {
        ws.terminate();
        return;
      }
      (ws as unknown as Record<string, boolean>).isAlive = false;
      try {
        ws.ping();
      } catch {
        /* ignore */
      }
    });
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  return wss;
}