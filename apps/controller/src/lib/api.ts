import type { BookmarkletInfo, ServerConfigPayload } from '@shared';

export interface Diagnostics {
  server: {
    version: string;
    httpPort: number;
    httpsPort: number;
    wsPath: string;
    localIps: string[];
    uptime: number;
    startedAt: number | null;
  };
  ws: {
    totalConnections: number;
    messagesProcessed: number;
    connectedClients: number;
  };
  sessions: {
    id: string;
    code: string;
    projectId: string;
    advisorConnected: boolean;
    quests: { clientId: string; deviceName: string; connected: boolean; lastSeen?: number }[];
    createdAt: number;
    lastActivity: number;
  }[];
  clients: {
    id: string;
    role: string | null;
    deviceName: string | null;
    sessionId: string | null;
    ip: string;
    lastSeen: number;
  }[];
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.message ?? '';
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status} ${detail}`.trim());
  }
  return (await res.json()) as T;
}

export function getConfig(): Promise<ServerConfigPayload> {
  return getJson<ServerConfigPayload>('/api/config');
}

export function getBookmarklet(): Promise<BookmarkletInfo> {
  return getJson<BookmarkletInfo>('/api/bookmarklet');
}

export function getDiagnostics(): Promise<Diagnostics> {
  return getJson<Diagnostics>('/api/diagnostics');
}