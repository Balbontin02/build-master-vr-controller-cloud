import { describe, expect, it } from 'vitest';
import { MessageType } from '@bmvr/shared';
import { Hub } from '../src/state/hub';

class FakeWs {
  readyState = 1;
  sent: string[] = [];
  isAlive = true;
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {}
  terminate(): void {}
  ping(): void {}
  on(): void {}
}

function envelope(type: string, payload?: unknown): object {
  return { type, messageId: `id-${Math.random().toString(36).slice(2)}`, timestamp: Date.now(), payload };
}

function send(hub: Hub, id: string, msg: object): void {
  hub.handleMessage(id, JSON.stringify(msg));
}

function findByType(
  ws: FakeWs,
  type: string,
): { type: string; messageId: string; payload: Record<string, unknown> } | undefined {
  for (let i = ws.sent.length - 1; i >= 0; i -= 1) {
    const msg = JSON.parse(ws.sent[i]);
    if (msg.type === type) return msg;
  }
  return undefined;
}

function requireMsg(
  ws: FakeWs,
  type: string,
): { type: string; messageId: string; payload: Record<string, unknown> } {
  const msg = findByType(ws, type);
  if (!msg) throw new Error(`Mensaje ${type} no recibido`);
  return msg;
}

function connect(hub: Hub): { id: string; ws: FakeWs } {
  const ws = new FakeWs();
  const id = hub.registerClient(ws as never, '127.0.0.1', 'localhost');
  return { id, ws };
}

const RECEPCION = 'scene_e3abad37db7b4b10a1eac5379ae180db';
const KHALO_RECAMARA = 'scene_f05f2960ede549e8a5049421acea4bb0';

describe('Hub (flujo end-to-end)', () => {
  it('advisor crea sesiÃ³n y quest se une', () => {
    const hub = new Hub();
    const advisor = connect(hub);
    const quest = connect(hub);

    send(hub, advisor.id, envelope(MessageType.ClientRegister, { role: 'ADVISOR', deviceName: 'LAPTOP' }));
    send(hub, advisor.id, envelope(MessageType.SessionCreate));

const created = requireMsg(advisor.ws, MessageType.SessionCreated);
    const code = String(created.payload.code);
    const token = String(created.payload.token);
    expect(created).toBeDefined();
    expect(code).toMatch(/^ZIMA-\d{4}$/);
    expect(token.length).toBeGreaterThan(0);

    send(hub, quest.id, envelope(MessageType.ClientRegister, { role: 'QUEST', deviceName: 'ZIMA-QUEST-01' }));
    send(hub, quest.id, envelope(MessageType.SessionJoin, { code, token }));

    expect(findByType(quest.ws, MessageType.SessionJoined)).toBeDefined();
    const questConnected = requireMsg(advisor.ws, MessageType.QuestConnected);
    expect(questConnected).toBeDefined();
    expect(questConnected.payload.deviceName).toBe('ZIMA-QUEST-01');
  });

  it('quest no puede unirse con cÃ³digo sin token', () => {
    const hub = new Hub();
    const advisor = connect(hub);
    const quest = connect(hub);

    send(hub, advisor.id, envelope(MessageType.ClientRegister, { role: 'ADVISOR', deviceName: 'LAPTOP' }));
    send(hub, advisor.id, envelope(MessageType.SessionCreate));
    const created = requireMsg(advisor.ws, MessageType.SessionCreated);

    send(hub, quest.id, envelope(MessageType.ClientRegister, { role: 'QUEST', deviceName: 'Q' }));
    send(hub, quest.id, envelope(MessageType.SessionJoin, { code: created.payload.code }));

    const err = findByType(quest.ws, MessageType.Error);
    expect(err?.payload.code).toBe('SESSION_UNAUTHORIZED');
  });

  it('scene.change llega al quest y scene.changed vuelve al advisor', () => {
    const hub = new Hub();
    const advisor = connect(hub);
    const quest = connect(hub);

    send(hub, advisor.id, envelope(MessageType.ClientRegister, { role: 'ADVISOR', deviceName: 'LAPTOP' }));
    send(hub, advisor.id, envelope(MessageType.SessionCreate));
    const created = requireMsg(advisor.ws, MessageType.SessionCreated);

    send(hub, quest.id, envelope(MessageType.ClientRegister, { role: 'QUEST', deviceName: 'Q' }));
    send(hub, quest.id, envelope(MessageType.SessionJoin, { code: created.payload.code, token: created.payload.token }));

    send(hub, advisor.id, envelope(MessageType.SceneChange, { sceneId: RECEPCION }));
    const forwarded = findByType(quest.ws, MessageType.SceneChange);
    expect(forwarded?.payload.sceneId).toBe(RECEPCION);
    expect(forwarded?.payload.title).toBe('RECEPCIÓN');

    send(hub, quest.id, envelope(MessageType.SceneChanged, { sceneId: RECEPCION, source: 'command' }));
    const confirmed = findByType(advisor.ws, MessageType.SceneChanged);
    expect(confirmed?.payload.sceneId).toBe(RECEPCION);
  });

  it('rechaza scene.change con escena no permitida', () => {
    const hub = new Hub();
    const advisor = connect(hub);

    send(hub, advisor.id, envelope(MessageType.ClientRegister, { role: 'ADVISOR', deviceName: 'LAPTOP' }));
    send(hub, advisor.id, envelope(MessageType.SessionCreate));

    send(hub, advisor.id, envelope(MessageType.SceneChange, { sceneId: 'scene_hackeada' }));
    const err = findByType(advisor.ws, MessageType.Error);
    expect(err?.payload.code).toBe('INVALID_SCENE');
  });

  it('rechaza scene.change sin quest conectado', () => {
    const hub = new Hub();
    const advisor = connect(hub);

    send(hub, advisor.id, envelope(MessageType.ClientRegister, { role: 'ADVISOR', deviceName: 'LAPTOP' }));
    send(hub, advisor.id, envelope(MessageType.SessionCreate));

    send(hub, advisor.id, envelope(MessageType.SceneChange, { sceneId: KHALO_RECAMARA }));
    const err = findByType(advisor.ws, MessageType.Error);
    expect(err?.payload.code).toBe('NO_QUEST_CONNECTED');
  });

  it('un quest no puede crear sesiones', () => {
    const hub = new Hub();
    const quest = connect(hub);
    send(hub, quest.id, envelope(MessageType.ClientRegister, { role: 'QUEST', deviceName: 'Q' }));
    send(hub, quest.id, envelope(MessageType.SessionCreate));
    const err = findByType(quest.ws, MessageType.Error);
    expect(err?.payload.code).toBe('INVALID_ROLE');
  });

  it('desconexiÃ³n del quest notifica al advisor', () => {
    const hub = new Hub();
    const advisor = connect(hub);
    const quest = connect(hub);

    send(hub, advisor.id, envelope(MessageType.ClientRegister, { role: 'ADVISOR', deviceName: 'LAPTOP' }));
    send(hub, advisor.id, envelope(MessageType.SessionCreate));
    const created = requireMsg(advisor.ws, MessageType.SessionCreated);

    send(hub, quest.id, envelope(MessageType.ClientRegister, { role: 'QUEST', deviceName: 'Q' }));
    send(hub, quest.id, envelope(MessageType.SessionJoin, { code: created.payload.code, token: created.payload.token }));

    hub.handleDisconnect(quest.id);
    const disconnected = findByType(advisor.ws, MessageType.QuestDisconnected);
    expect(disconnected?.payload.clientId).toBe(quest.id);
  });
});
