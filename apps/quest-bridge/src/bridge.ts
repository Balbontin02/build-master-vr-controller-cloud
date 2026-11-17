import {
  MessageType,
  findScene,
  isValidSceneId,
  normalizeToken,
  KRPANO_LOAD_TIMEOUT_MS,
  type Envelope,
} from '@bmvr/shared/lite';
import { readConfig, writeConfig } from './config';
import {
  bindSceneChangeListener,
  changeScene,
  getCurrentSceneId,
  isKrpanoReady,
  waitForKrpano,
} from './krpano';
import { ReconnectingWs } from './ws';
import { destroyOverlay, mountOverlay, updateOverlay } from './overlay';
import type { BridgeConfig, OverlayState } from './types';

interface PendingChange {
  sceneId: string;
  startedAt: number;
}

export interface BuildMasterVrApi {
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  status: () => string;
  currentScene: () => string | null;
  changeScene: (sceneId: string) => boolean;
  setConfig: (cfg: Partial<BridgeConfig>) => void;
  __initialized: boolean;
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createBridge(overrides: Partial<BridgeConfig> = {}): BuildMasterVrApi {
  const cfg: BridgeConfig = { ...readConfig(), ...overrides };

  let ws: ReconnectingWs | null = null;
  let joined = false;
  let sessionId: string | null = null;
  let currentSceneId: string | null = null;
  let pending: PendingChange | null = null;
  let stopKrpanoWait: (() => void) | null = null;
  let watcherTimer: number | undefined;
  let timeoutTimer: number | undefined;

  const debug = cfg.debug === true;
  const log = (...args: unknown[]) => {
    if (debug) console.log('[BMVR]', ...args);
  };

  const sceneLabel = (id: string | null): string => {
    if (!id) return '—';
    const scene = findScene(id);
    return scene ? scene.label : id;
  };

  const overlay = (status: OverlayState['status'], detail?: string): void => {
    updateOverlay({ status, scene: sceneLabel(currentSceneId), detail });
  };

  function send(type: string, payload?: unknown): void {
    const msg: Envelope = { type, messageId: genId(), timestamp: Date.now(), payload };
    const ok = ws?.send(JSON.stringify(msg)) ?? false;
    if (!ok) log('send fallido (offline):', type);
  }

  function registerAndJoin(): void {
    send(MessageType.ClientRegister, { role: 'QUEST', deviceName: cfg.deviceName || 'META QUEST' });
    const code = cfg.code?.trim().toUpperCase();
    if (code) {
      overlay('joining');
      send(MessageType.SessionJoin, { code, token: cfg.token ? normalizeToken(cfg.token) : undefined });
    } else {
      promptForCode();
    }
  }

  function promptForCode(): void {
    const answer = window.prompt('Código de sesión Build Master VR (ej. ZIMA-7421):', '');
    if (!answer || !answer.trim()) return;
    cfg.code = answer.trim().toUpperCase();
    if (!cfg.token) {
      const tokenAnswer = window.prompt('Token de sesión Build Master VR:', '');
      if (!tokenAnswer || !tokenAnswer.trim()) return;
      cfg.token = normalizeToken(tokenAnswer);
    }
    writeConfig(cfg);
    overlay('joining');
    send(MessageType.SessionJoin, { code: cfg.code, token: cfg.token });
  }

  function resolveWsUrl(): string {
    const secure = window.location.protocol === 'https:';
    if (secure && cfg.wss) return cfg.wss;
    if (!secure && cfg.ws) return cfg.ws;
    if (cfg.wss) return cfg.wss;
    if (cfg.ws) return cfg.ws;
    const productionWss = process.env.PRODUCTION_WSS_URL;
    if (productionWss && secure) {
      return productionWss;
    }
    const answer = window.prompt('Servidor Build Master VR (IP:puerto, ej. 192.168.1.50:3000):', '');
    if (!answer || !answer.trim()) throw new Error('NO_SERVER');
    const clean = answer.trim().replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '');
    return `ws://${clean}/ws`;
  }

  function connect(): void {
    if (ws) {
      ws.close();
      ws = null;
    }
    let url: string;
    try {
      url = resolveWsUrl();
    } catch {
      overlay('error', 'Servidor no configurado');
      return;
    }
    log('conectando a', url);
    overlay('connecting');
    ws = new ReconnectingWs({
      url,
      onOpen: () => {
        log('ws abierto');
        registerAndJoin();
      },
      onClose: () => {
        joined = false;
        overlay('disconnected');
      },
      onError: (message) => {
        overlay('error', message);
      },
      onMessage: (data) => handleRaw(data),
    });
    ws.connect();
  }

  function handleSceneChange(msg: Envelope): void {
    const payload = msg.payload as { sceneId?: unknown } | undefined;
    const sceneId = typeof payload?.sceneId === 'string' ? payload.sceneId : '';

    if (!sceneId || !isValidSceneId(sceneId)) {
      send(MessageType.SceneChangeFailed, { sceneId: sceneId || '', reason: 'INVALID_SCENE' });
      return;
    }
    if (pending) {
      send(MessageType.SceneChangeFailed, { sceneId, reason: 'BUSY' });
      return;
    }
    if (!isKrpanoReady()) {
      send(MessageType.SceneChangeFailed, { sceneId, reason: 'KRPANO_NOT_READY' });
      return;
    }

    const ok = changeScene(sceneId);
    if (!ok) {
      send(MessageType.SceneChangeFailed, { sceneId, reason: 'EXECUTION_FAILED' });
      return;
    }

    pending = { sceneId, startedAt: Date.now() };
    overlay('ready', 'cambiando…');
    if (timeoutTimer) window.clearTimeout(timeoutTimer);
    timeoutTimer = window.setTimeout(() => {
      if (pending && pending.sceneId === sceneId) {
        pending = null;
        send(MessageType.SceneChangeFailed, { sceneId, reason: 'TIMEOUT' });
        overlay('ready');
      }
    }, KRPANO_LOAD_TIMEOUT_MS);
  }

  function onScenePossiblyChanged(): void {
    const id = getCurrentSceneId();
    if (!id) return;

    if (pending && id === pending.sceneId) {
      const scene = findScene(id);
      pending = null;
      if (timeoutTimer) window.clearTimeout(timeoutTimer);
      currentSceneId = id;
      send(MessageType.SceneChanged, {
        sceneId: id,
        title: scene ? scene.label : undefined,
        source: 'command',
      });
      overlay('ready');
      return;
    }

    if (id !== currentSceneId) {
      const scene = findScene(id);
      currentSceneId = id;
      send(MessageType.SceneChanged, {
        sceneId: id,
        title: scene ? scene.label : undefined,
        source: 'manual',
      });
      overlay('ready');
    }
  }

  function startSceneWatcher(): void {
    if (watcherTimer) return;
    bindSceneChangeListener(onScenePossiblyChanged);
    watcherTimer = window.setInterval(onScenePossiblyChanged, 1000);
  }

  function handleRaw(data: string): void {
    let msg: Envelope;
    try {
      msg = JSON.parse(data) as Envelope;
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;

    switch (msg.type) {
      case MessageType.SessionJoined: {
        const p = msg.payload as { sessionId?: string } | undefined;
        joined = true;
        sessionId = typeof p?.sessionId === 'string' ? p.sessionId : null;
        overlay('ready');
        log('sesión unida:', sessionId);
        break;
      }
      case MessageType.SessionClosed: {
        joined = false;
        sessionId = null;
        overlay('disconnected', 'sesión cerrada');
        break;
      }
      case MessageType.SceneChange:
        handleSceneChange(msg);
        break;
      case MessageType.Ping:
        send(MessageType.Pong, {});
        break;
      case MessageType.Error: {
        const p = msg.payload as { code?: string; message?: string } | undefined;
        const code = p?.code ?? '';
        if (code === 'SESSION_NOT_FOUND' || code === 'SESSION_UNAUTHORIZED') {
          delete cfg.code;
          delete cfg.token;
          writeConfig(cfg);
          promptForCode();
          return;
        }
        overlay('error', p?.message || code || 'error');
        break;
      }
      default:
        break;
    }
  }

  function onKrpanoFound(): void {
    const ready = isKrpanoReady();
    if (ready) {
      startSceneWatcher();
      onScenePossiblyChanged();
      connect();
    } else {
      overlay('no-krpano');
    }
  }

  function start(): void {
    mountOverlay();
    overlay('starting');
    if (isKrpanoReady()) {
      onKrpanoFound();
    } else {
      stopKrpanoWait = waitForKrpano(onKrpanoFound);
    }
  }

  function stop(): void {
    if (stopKrpanoWait) stopKrpanoWait();
    stopKrpanoWait = null;
    if (watcherTimer) window.clearInterval(watcherTimer);
    watcherTimer = undefined;
    if (timeoutTimer) window.clearTimeout(timeoutTimer);
    timeoutTimer = undefined;
    ws?.close();
    ws = null;
    destroyOverlay();
  }

  return {
    connect: () => {
      start();
    },
    disconnect: () => {
      stop();
    },
    reconnect: () => {
      ws?.reconnectNow();
    },
    status: () => {
      if (joined) return 'connected';
      if (ws) return 'connecting';
      return 'disconnected';
    },
    currentScene: () => getCurrentSceneId(),
    changeScene: (sceneId: string) => {
      if (!isValidSceneId(sceneId) || !isKrpanoReady()) return false;
      return changeScene(sceneId);
    },
    setConfig: (partial) => {
      Object.assign(cfg, partial);
    },
    __initialized: true,
  };
}