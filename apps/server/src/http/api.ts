import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { projectData } from '@bmvr/shared';
import { APP_VERSION, BOOKMARKLET_DIST, HTTP_PORT, WS_PATH } from '../config';
import { getLocalIPv4s } from '../ip';
import type { Hub } from '../state/hub';

export interface ApiContext {
  httpsPort: number;
}

export function createApiRouter(hub: Hub, ctx: ApiContext): Router {
  const router = Router();

  router.get('/config', (_req, res) => {
    const localIps = getLocalIPv4s();
    const hostname = (_req.headers.host ?? 'localhost').split(':')[0];
    const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const host = isLoopback ? (localIps[0] ?? 'localhost') : hostname;
    const baseUrl = `http://${host}:${HTTP_PORT}`;
    res.json({
      version: APP_VERSION,
      httpPort: HTTP_PORT,
      httpsPort: ctx.httpsPort,
      wsPath: WS_PATH,
      localIps,
      requestHost: hostname,
      baseUrl,
      wsUrl: `ws://${host}:${HTTP_PORT}${WS_PATH}`,
      wssUrl: `wss://${host}:${ctx.httpsPort}${WS_PATH}`,
      project: {
        id: projectData.project.id,
        name: projectData.project.name,
        shortCodePrefix: projectData.project.shortCodePrefix,
        tourName: projectData.project.tourName,
        tourUrl: projectData.project.tourUrl,
      },
    });
  });

  router.get('/health', (_req, res) => {
    res.json({ ok: true, uptime: Math.round(process.uptime()), version: APP_VERSION });
  });

  router.get('/bookmarklet', (_req, res) => {
    const file = path.join(BOOKMARKLET_DIST, 'build-master-vr-connect.bookmarklet.txt');
    const bundleFile = path.join(BOOKMARKLET_DIST, 'quest-bridge.min.js');
    if (!fs.existsSync(file) || !fs.existsSync(bundleFile)) {
      res.status(500).json({
        error: 'BOOKMARKLET_NOT_BUILT',
        message: 'El bookmarklet aún no existe. Ejecuta: npm run build:bookmarklet',
      });
      return;
    }
    const bookmarklet = fs.readFileSync(file, 'utf8');
    const bundle = fs.readFileSync(bundleFile, 'utf8');
    res.json({ name: 'BUILD MASTER VR CONNECT', version: APP_VERSION, bookmarklet, bundle });
  });

  router.get('/diagnostics', (_req, res) => {
    res.json({
      server: {
        version: APP_VERSION,
        httpPort: HTTP_PORT,
        httpsPort: ctx.httpsPort,
        wsPath: WS_PATH,
        localIps: getLocalIPv4s(),
        uptime: Math.round(process.uptime()),
        startedAt: hub.startedAt ?? null,
      },
      ws: hub.getStats(),
      sessions: hub.getSessionsSnapshot(),
      clients: hub.getClientsSnapshot(),
    });
  });

  return router;
}