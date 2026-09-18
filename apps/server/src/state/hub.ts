import type { WebSocket } from 'ws';
import {
  MessageType,
  clientRegisterSchema,
  findScene,
  generateId,
  projectData,
  sceneChangeFailedSchema,
  sceneChangeSchema,
  sceneChangedSchema,
  sceneCurrentSchema,
  sessionCreateSchema,
  sessionJoinSchema,
  type Envelope,
  type SessionCreatedPayload,
  type SessionJoinedPayload,
} from '@bmvr/shared';
import { logger } from '../logger';
import { SESSION_IDLE_TTL_MS } from '../config';
import { SessionManager, type Session } from './sessions';

export type ClientRole = 'ADVISOR' | 'QUEST';

export interface ClientEntry {
  id: string;
  ws: WebSocket;
  ip: string;
  host: string;
  role?: ClientRole;
  deviceName?: string;
  sessionId?: string;
  connectedAt: number;
  lastSeen: number;
}

interface HubStats {
  totalConnections: number;
  messagesProcessed: number;
  connectedClients: number;
}

export class Hub {
  readonly sessions: SessionManager;
  startedAt: number | null = null;
  private clients = new Map<string, ClientEntry>();
  private cleanupTimer: NodeJS.Timeout | undefined;
  private stats: HubStats = { totalConnections: 0, messagesProcessed: 0, connectedClients: 0 };

  constructor() {
    this.sessions = new SessionManager();
    this.cleanupTimer = setInterval(() => {
      const removed = this.sessions.cleanup(SESSION_IDLE_TTL_MS);
      if (removed > 0) logger.info('SESSION', `${removed} sesión(es) expirada(s)`);
    }, 60_000);
  }

  registerClient(ws: WebSocket, ip: string, host: string): string {
    const id = generateId();
    this.clients.set(id, { id, ws, ip, host, connectedAt: Date.now(), lastSeen: Date.now() });
    this.stats.totalConnections += 1;
    this.stats.connectedClients = this.clients.size;
    return id;
  }

  getClient(clientId: string): ClientEntry | undefined {
    return this.clients.get(clientId);
  }

  dispose(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  handleMessage(clientId: string, raw: string): void {
    this.stats.messagesProcessed += 1;
    const client = this.clients.get(clientId);
    if (!client) return;

    let msg: Envelope;
    try {
      msg = JSON.parse(raw) as Envelope;
    } catch {
      this.sendError(client, 'INVALID_JSON', 'El mensaje no es JSON válido');
      return;
    }
    if (!msg || typeof msg.type !== 'string') {
      this.sendError(client, 'INVALID_JSON', 'Estructura de mensaje inválida');
      return;
    }

    client.lastSeen = Date.now();
    this.dispatch(client, msg);
  }

  handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    this.clients.delete(clientId);
    this.stats.connectedClients = this.clients.size;

    if (!client.sessionId) {
      logger.info('WS', `cliente desconectado ${client.id}`);
      return;
    }
    const session = this.sessions.findById(client.sessionId);
    if (!session) return;

    if (client.role === 'ADVISOR' && session.advisorId === clientId) {
      session.advisorId = null;
      session.lastActivity = Date.now();
      logger.info('SESSION', `${session.code} · advisor desconectado`);
      return;
    }
    if (client.role === 'QUEST') {
      const quest = session.quests.get(clientId);
      session.quests.delete(clientId);
      session.lastActivity = Date.now();
      logger.info('WS', `Quest desconectado ${client.id} (${quest?.deviceName ?? '?'})`);
      this.notifyAdvisor(session, MessageType.QuestDisconnected, {
        clientId,
        sessionId: session.id,
      });
    }
  }

  getStats(): HubStats {
    return { ...this.stats };
  }

  getSessionsSnapshot() {
    return this.sessions.list().map((s) => ({
      id: s.id,
      code: s.code,
      projectId: s.projectId,
      advisorConnected: s.advisorId !== null,
      quests: [...s.quests.values()],
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
    }));
  }

  getClientsSnapshot() {
    return [...this.clients.values()].map((c) => ({
      id: c.id,
      role: c.role ?? null,
      deviceName: c.deviceName ?? null,
      sessionId: c.sessionId ?? null,
      ip: c.ip,
      lastSeen: c.lastSeen,
    }));
  }

  private dispatch(client: ClientEntry, msg: Envelope): void {
    switch (msg.type) {
      case MessageType.ClientRegister:
        return this.onRegister(client, msg);
      case MessageType.SessionCreate:
        return this.onCreateSession(client, msg);
      case MessageType.SessionJoin:
        return this.onJoinSession(client, msg);
      case MessageType.SessionLeave:
        return this.onLeaveSession(client, msg);
      case MessageType.SceneChange:
        return this.onSceneChange(client, msg);
      case MessageType.SceneChanged:
        return this.onSceneChanged(client, msg);
      case MessageType.SceneCurrent:
        return this.onSceneCurrent(client, msg);
      case MessageType.SceneChangeFailed:
        return this.onSceneChangeFailed(client, msg);
      case MessageType.Ping:
        this.reply(client, MessageType.Pong, undefined, msg.messageId);
        return;
      case MessageType.Pong:
        return;
      default:
        this.sendError(
          client,
          'UNKNOWN_MESSAGE_TYPE',
          `Tipo de mensaje no soportado: ${msg.type}`,
          msg.messageId,
        );
    }
  }

  private onRegister(client: ClientEntry, msg: Envelope): void {
    if (client.role) {
      this.sendError(client, 'ALREADY_REGISTERED', 'El cliente ya está registrado', msg.messageId);
      return;
    }
    const parsed = clientRegisterSchema.safeParse(msg.payload);
    if (!parsed.success) {
      this.sendError(client, 'INVALID_PAYLOAD', 'payload de registro inválido', msg.messageId);
      return;
    }
    client.role = parsed.data.role;
    client.deviceName = parsed.data.deviceName;
    this.reply(
      client,
      MessageType.ClientRegistered,
      { clientId: client.id, role: client.role, deviceName: client.deviceName },
      msg.messageId,
    );
    logger.info('WS', `${client.role} registrado: ${client.deviceName} (${client.id})`);
  }

  private onCreateSession(client: ClientEntry, msg: Envelope): void {
    if (client.role !== 'ADVISOR') {
      this.sendError(client, 'INVALID_ROLE', 'Solo el asesor puede crear sesiones', msg.messageId);
      return;
    }
    const parsed = sessionCreateSchema.safeParse(msg.payload);
    if (!parsed.success) {
      this.sendError(client, 'INVALID_PAYLOAD', 'payload de sesión inválido', msg.messageId);
      return;
    }

    const resume = parsed.data ?? {};
    let session: Session;
    if (resume.resumeCode && resume.resumeToken) {
      const found = this.sessions.findByCode(resume.resumeCode);
      if (!found || found.token !== resume.resumeToken) {
        this.sendError(client, 'INVALID_RESUME', 'No se pudo reanudar la sesión', msg.messageId);
        return;
      }
      session = found;
      logger.info('SESSION', `${session.code} · asesor reanudó sesión`);
    } else {
      session = this.sessions.create();
      logger.info('SESSION', `nueva sesión creada ${session.code}`);
    }

    if (client.sessionId && client.sessionId !== session.id) {
      const old = this.sessions.findById(client.sessionId);
      if (old && old.advisorId === client.id) old.advisorId = null;
    }
    if (session.advisorId && session.advisorId !== client.id) {
      const current = this.clients.get(session.advisorId);
      if (current) {
        this.sendError(
          client,
          'SESSION_BUSY',
          'La sesión ya tiene un asesor conectado',
          msg.messageId,
        );
        return;
      }
    }

    session.advisorId = client.id;
    client.sessionId = session.id;
    session.lastActivity = Date.now();

    const payload: SessionCreatedPayload = {
      sessionId: session.id,
      code: session.code,
      token: session.token,
      projectId: projectData.project.id,
      projectName: projectData.project.name,
      projectTourName: projectData.project.tourName,
      projectTourUrl: projectData.project.tourUrl,
      shortCodePrefix: projectData.project.shortCodePrefix,
      joinUrl: `http://${client.host}/quest?session=${session.code}&token=${session.token}`,
      groups: projectData.groups.map((g) => ({ id: g.id, label: g.label, order: g.order })),
      scenes: projectData.scenes.map((s) => ({
        id: s.id,
        title: s.title,
        label: s.label,
        group: s.group,
        order: s.order,
      })),
      quests: [...session.quests.values()].map((q) => ({ ...q, connected: true })),
    };
    this.reply(client, MessageType.SessionCreated, payload, msg.messageId);
  }

  private onJoinSession(client: ClientEntry, msg: Envelope): void {
    if (client.role !== 'QUEST') {
      this.sendError(client, 'INVALID_ROLE', 'Solo el Quest puede unirse a una sesión', msg.messageId);
      return;
    }
    const parsed = sessionJoinSchema.safeParse(msg.payload);
    if (!parsed.success) {
      this.sendError(client, 'INVALID_PAYLOAD', 'payload de unión inválido', msg.messageId);
      return;
    }

    const result = this.sessions.verifyJoin(parsed.data.code, parsed.data.token);
    if (!result.ok || !result.session) {
      const unauthorized = result.error === 'UNAUTHORIZED';
      this.sendError(
        client,
        unauthorized ? 'SESSION_UNAUTHORIZED' : 'SESSION_NOT_FOUND',
        unauthorized ? 'Token de sesión inválido' : 'Sesión no encontrada',
        msg.messageId,
      );
      return;
    }

    const session = result.session;
    if (client.sessionId && client.sessionId !== session.id) {
      const old = this.sessions.findById(client.sessionId);
      if (old) old.quests.delete(client.id);
    }

    client.sessionId = session.id;
    session.quests.set(client.id, {
      clientId: client.id,
      deviceName: client.deviceName ?? 'META QUEST',
      connected: true,
      lastSeen: Date.now(),
    });
    session.lastActivity = Date.now();

    const payload: SessionJoinedPayload = {
      clientId: client.id,
      sessionId: session.id,
      code: session.code,
      projectId: projectData.project.id,
      projectName: projectData.project.name,
      projectTourName: projectData.project.tourName,
      projectTourUrl: projectData.project.tourUrl,
      groups: projectData.groups.map((g) => ({ id: g.id, label: g.label, order: g.order })),
      scenes: projectData.scenes.map((s) => ({
        id: s.id,
        title: s.title,
        label: s.label,
        group: s.group,
        order: s.order,
      })),
    };
    this.reply(client, MessageType.SessionJoined, payload, msg.messageId);
    this.notifyAdvisor(session, MessageType.QuestConnected, {
      clientId: client.id,
      deviceName: client.deviceName ?? 'META QUEST',
      sessionId: session.id,
      code: session.code,
    });
    logger.info('SESSION', `${session.code} · Quest unido (${client.deviceName ?? 'META QUEST'})`);
  }

  private onLeaveSession(client: ClientEntry, msg: Envelope): void {
    if (!client.sessionId) {
      this.sendError(client, 'NO_SESSION', 'No hay sesión activa', msg.messageId);
      return;
    }
    const session = this.sessions.findById(client.sessionId);
    if (!session) return;

    const sessionId = session.id;
    if (client.role === 'ADVISOR' && session.advisorId === client.id) {
      session.advisorId = null;
      session.lastActivity = Date.now();
      this.reply(client, MessageType.SessionClosed, { sessionId, reason: 'LEFT' }, msg.messageId);
    } else if (client.role === 'QUEST') {
      session.quests.delete(client.id);
      session.lastActivity = Date.now();
      this.reply(client, MessageType.SessionClosed, { sessionId, reason: 'LEFT' }, msg.messageId);
      this.notifyAdvisor(session, MessageType.QuestDisconnected, { clientId: client.id, sessionId });
    }
    client.sessionId = undefined;
    logger.info('SESSION', `cliente ${client.id} abandonó ${session.code}`);
  }

  private onSceneChange(client: ClientEntry, msg: Envelope): void {
    if (client.role !== 'ADVISOR') {
      this.sendError(client, 'INVALID_ROLE', 'Solo el asesor puede enviar comandos', msg.messageId);
      return;
    }
    const session = this.requireSession(client);
    if (!session) {
      this.sendError(client, 'NO_SESSION', 'Sin sesión activa', msg.messageId);
      return;
    }
    if (session.advisorId !== client.id) {
      this.sendError(client, 'UNAUTHORIZED', 'No eres el asesor de esta sesión', msg.messageId);
      return;
    }
    const parsed = sceneChangeSchema.safeParse(msg.payload);
    if (!parsed.success) {
      this.sendError(client, 'INVALID_PAYLOAD', 'payload de escena inválido', msg.messageId);
      return;
    }
    const scene = findScene(parsed.data.sceneId);
    if (!scene) {
      this.sendError(client, 'INVALID_SCENE', 'ID de escena no válido', msg.messageId);
      return;
    }

    const targets = [...session.quests.keys()];
    if (targets.length === 0) {
      this.sendError(client, 'NO_QUEST_CONNECTED', 'No hay ningún Quest conectado', msg.messageId);
      return;
    }

    for (const questId of targets) {
      this.sendTo(questId, {
        type: MessageType.SceneChange,
        messageId: msg.messageId,
        timestamp: Date.now(),
        payload: { sceneId: scene.id, title: scene.label },
      });
    }
    session.lastActivity = Date.now();
    logger.info('SCENE', `${session.code} · cambio a ${scene.label} (${scene.id})`);
  }

  private onSceneChanged(client: ClientEntry, msg: Envelope): void {
    if (client.role !== 'QUEST') {
      this.sendError(client, 'INVALID_ROLE', 'Solo el Quest puede reportar escena', msg.messageId);
      return;
    }
    const session = this.requireSession(client);
    if (!session) {
      this.sendError(client, 'NO_SESSION', 'Sin sesión activa', msg.messageId);
      return;
    }
    const parsed = sceneChangedSchema.safeParse(msg.payload);
    if (!parsed.success) {
      this.sendError(client, 'INVALID_PAYLOAD', 'payload de escena inválido', msg.messageId);
      return;
    }
    const scene = findScene(parsed.data.sceneId);
    if (!scene) {
      this.sendError(client, 'INVALID_SCENE', 'ID de escena no válido', msg.messageId);
      return;
    }
    this.forwardToAdvisor(session, MessageType.SceneChanged, {
      sceneId: scene.id,
      title: scene.label,
      source: parsed.data.source,
    });
  }

  private onSceneCurrent(client: ClientEntry, msg: Envelope): void {
    if (client.role !== 'QUEST') {
      this.sendError(client, 'INVALID_ROLE', 'Solo el Quest puede reportar escena', msg.messageId);
      return;
    }
    const session = this.requireSession(client);
    if (!session) {
      this.sendError(client, 'NO_SESSION', 'Sin sesión activa', msg.messageId);
      return;
    }
    const parsed = sceneCurrentSchema.safeParse(msg.payload);
    if (!parsed.success) {
      this.sendError(client, 'INVALID_PAYLOAD', 'payload de escena inválido', msg.messageId);
      return;
    }
    const scene = findScene(parsed.data.sceneId);
    if (!scene) {
      this.sendError(client, 'INVALID_SCENE', 'ID de escena no válido', msg.messageId);
      return;
    }
    this.forwardToAdvisor(session, MessageType.SceneCurrent, {
      sceneId: scene.id,
      title: scene.label,
    });
  }

  private onSceneChangeFailed(client: ClientEntry, msg: Envelope): void {
    if (client.role !== 'QUEST') {
      this.sendError(client, 'INVALID_ROLE', 'Solo el Quest puede reportar errores', msg.messageId);
      return;
    }
    const session = this.requireSession(client);
    if (!session) {
      this.sendError(client, 'NO_SESSION', 'Sin sesión activa', msg.messageId);
      return;
    }
    const parsed = sceneChangeFailedSchema.safeParse(msg.payload);
    if (!parsed.success) {
      this.sendError(client, 'INVALID_PAYLOAD', 'payload de error inválido', msg.messageId);
      return;
    }
    this.forwardToAdvisor(session, MessageType.SceneChangeFailed, {
      sceneId: parsed.data.sceneId,
      reason: parsed.data.reason,
    });
  }

  private requireSession(client: ClientEntry): Session | undefined {
    if (!client.sessionId) return undefined;
    return this.sessions.findById(client.sessionId);
  }

  private sendTo(clientId: string, msg: object): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== 1) return false;
    try {
      client.ws.send(JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  private reply(
    client: ClientEntry,
    type: string,
    payload: unknown,
    messageId?: string,
  ): void {
    this.sendTo(client.id, {
      type,
      messageId: messageId ?? generateId(),
      timestamp: Date.now(),
      payload,
    });
  }

  private sendError(client: ClientEntry, code: string, message: string, messageId?: string): void {
    this.reply(client, MessageType.Error, { code, message }, messageId);
  }

  private notifyAdvisor(session: Session, type: string, payload: unknown): void {
    if (session.advisorId) this.sendTo(session.advisorId, envelope(type, payload));
  }

  private forwardToAdvisor(session: Session, type: string, payload: unknown): void {
    if (session.advisorId) this.sendTo(session.advisorId, envelope(type, payload));
  }
}

function envelope(type: string, payload: unknown) {
  return { type, messageId: generateId(), timestamp: Date.now(), payload };
}