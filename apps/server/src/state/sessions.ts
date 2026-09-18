import { generateId, generateToken, normalizeToken, projectData, type QuestInfo } from '@bmvr/shared';

export interface Session {
  id: string;
  code: string;
  token: string;
  projectId: string;
  advisorId: string | null;
  quests: Map<string, QuestInfo>;
  createdAt: number;
  lastActivity: number;
}

export type JoinError = 'SESSION_NOT_FOUND' | 'UNAUTHORIZED';

export interface JoinResult {
  ok: boolean;
  error?: JoinError;
  session?: Session;
}

export class SessionManager {
  private sessions = new Map<string, Session>();

  create(): Session {
    const session: Session = {
      id: generateId(),
      code: this.generateCode(),
      token: generateToken(),
      projectId: projectData.project.id,
      advisorId: null,
      quests: new Map(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  findByCode(code: string): Session | undefined {
    const normalized = code.trim().toUpperCase();
    for (const s of this.sessions.values()) {
      if (s.code === normalized) return s;
    }
    return undefined;
  }

  findById(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  verifyJoin(code: string, token?: string): JoinResult {
    const session = this.findByCode(code);
    if (!session) return { ok: false, error: 'SESSION_NOT_FOUND' };
    if (!token || normalizeToken(token) !== session.token) return { ok: false, error: 'UNAUTHORIZED' };
    session.lastActivity = Date.now();
    return { ok: true, session };
  }

  touch(sessionId: string): void {
    const s = this.sessions.get(sessionId);
    if (s) s.lastActivity = Date.now();
  }

  remove(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  list(): Session[] {
    return [...this.sessions.values()];
  }

  /** Elimina sesiones sin clientes conectados e inactivas por más de ttlMs. */
  cleanup(ttlMs: number): number {
    const now = Date.now();
    let removed = 0;
    for (const s of this.sessions.values()) {
      const hasClients = s.advisorId !== null || s.quests.size > 0;
      if (!hasClients && now - s.lastActivity > ttlMs) {
        this.sessions.delete(s.id);
        removed += 1;
      }
    }
    return removed;
  }

  private generateCode(): string {
    const n = Math.floor(1000 + Math.random() * 9000);
    return `${projectData.project.shortCodePrefix}-${n}`;
  }
}