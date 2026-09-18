import type { QuestInfo, SceneChangeSource } from './types';

export const MessageType = {
  ClientRegister: 'client.register',
  ClientRegistered: 'client.registered',
  SessionCreate: 'session.create',
  SessionCreated: 'session.created',
  SessionJoin: 'session.join',
  SessionJoined: 'session.joined',
  SessionLeave: 'session.leave',
  SessionClosed: 'session.closed',
  SceneChange: 'scene.change',
  SceneChanged: 'scene.changed',
  SceneChangeFailed: 'scene.change.failed',
  SceneCurrent: 'scene.current',
  QuestConnected: 'quest.connected',
  QuestDisconnected: 'quest.disconnected',
  Ping: 'ping',
  Pong: 'pong',
  Error: 'error',
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

export interface Envelope {
  type: string;
  messageId: string;
  timestamp: number;
  payload?: unknown;
}

export interface ClientRegisterPayload {
  role: 'ADVISOR' | 'QUEST';
  deviceName: string;
}

export interface ClientRegisteredPayload {
  clientId: string;
  role: 'ADVISOR' | 'QUEST';
  deviceName: string;
}

export interface SessionCreatePayload {
  resumeCode?: string;
  resumeToken?: string;
}

export interface SessionCreatedPayload {
  sessionId: string;
  code: string;
  token: string;
  projectId: string;
  projectName: string;
  projectTourName: string;
  projectTourUrl: string;
  shortCodePrefix: string;
  joinUrl: string;
  groups: { id: string; label: string; order: number }[];
  scenes: { id: string; title: string; label: string; group: string; order: number }[];
  quests: QuestInfo[];
}

export interface SessionJoinPayload {
  code: string;
  token?: string;
}

export interface SessionJoinedPayload {
  clientId: string;
  sessionId: string;
  code: string;
  projectId: string;
  projectName: string;
  projectTourName: string;
  projectTourUrl: string;
  groups: { id: string; label: string; order: number }[];
  scenes: { id: string; title: string; label: string; group: string; order: number }[];
}

export interface SceneChangePayload {
  sceneId: string;
  title?: string;
}

export interface SceneChangedPayload {
  sceneId: string;
  title?: string;
  source?: SceneChangeSource;
}

export interface SceneChangeFailedPayload {
  sceneId: string;
  reason?: string;
}

export interface QuestConnectedPayload {
  clientId: string;
  deviceName: string;
  sessionId: string;
  code: string;
}

export interface QuestDisconnectedPayload {
  clientId: string;
  sessionId: string;
}

export interface SessionClosedPayload {
  sessionId: string;
  reason?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface ServerConfigPayload {
  version: string;
  httpPort: number;
  httpsPort: number;
  wsPath: string;
  localIps: string[];
  requestHost: string;
  baseUrl: string;
  wsUrl: string;
  wssUrl: string;
  project: {
    id: string;
    name: string;
    shortCodePrefix: string;
    tourName: string;
    tourUrl: string;
  };
}

export interface BookmarkletInfo {
  name: string;
  version: string;
  bundle: string;
  bookmarklet: string;
}

export function createEnvelope(type: string, payload?: unknown, messageId?: string): Envelope {
  return { type, messageId: messageId ?? generateId(), timestamp: Date.now(), payload };
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Alfabeto base32 Crockford: sin caracteres ambiguos (I, L, O, U). */
export const TOKEN_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Token de sesión corto y fácil de tipear (por defecto 6 caracteres).
 * 256 % 32 === 0, por lo que el módulo no introduce sesgo.
 */
export function generateToken(length = 6): string {
  const chars: string[] = [];
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) chars.push(TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length]);
  } else {
    for (let i = 0; i < length; i += 1) {
      chars.push(TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)]);
    }
  }
  return chars.join('');
}

/** Normaliza lo que tipea el usuario: quita espacios/guiones y pasa a mayúsculas. */
export function normalizeToken(token: string): string {
  return token.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}