import express from 'express';
import path from 'node:path';
import { BOOKMARKLET_DIST, CONTROLLER_DIST, WS_PATH } from '../config';
import { createApiRouter, type ApiContext } from './api';
import type { Hub } from '../state/hub';

export function createApp(hub: Hub, ctx: ApiContext, allowedOrigins: string[]): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : ['*'];

  app.use((_req, res, next) => {
    const origin = _req.headers.origin;
    if (origin && (corsOrigins.includes('*') || corsOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (corsOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use('/api', createApiRouter(hub, ctx));

  app.get('/quest-bridge.min.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(path.join(BOOKMARKLET_DIST, 'quest-bridge.min.js'), (err) => {
      if (err) res.status(404).send('Quest bridge no disponible. Ejecuta: npm run build:bookmarklet');
    });
  });

  app.get('/sw.js', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(CONTROLLER_DIST, 'sw.js'), (err) => {
      if (err) res.status(404).send('Service Worker no disponible');
    });
  });

  app.use(express.static(CONTROLLER_DIST, { index: 'index.html', maxAge: '1h' }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === WS_PATH) {
      next();
      return;
    }
    res.sendFile(path.join(CONTROLLER_DIST, 'index.html'), (err) => {
      if (err) next(err);
    });
  });

  return app;
}