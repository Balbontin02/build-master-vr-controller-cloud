import { describe, expect, it } from 'vitest';
import { SessionManager } from '../src/state/sessions';

describe('SessionManager', () => {
  it('crea una sesión con código y token', () => {
    const manager = new SessionManager();
    const session = manager.create();
    expect(session.code).toMatch(/^ZIMA-\d{4}$/);
    expect(session.token).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(session.id.length).toBeGreaterThan(0);
  });

  it('genera códigos únicos en múltiples creaciones', () => {
    const manager = new SessionManager();
    const codes = new Set(Array.from({ length: 50 }, () => manager.create().code));
    expect(codes.size).toBeGreaterThan(40);
  });

  it('permite unirse con código + token correctos', () => {
    const manager = new SessionManager();
    const session = manager.create();
    const result = manager.verifyJoin(session.code, session.token);
    expect(result.ok).toBe(true);
    expect(result.session?.id).toBe(session.id);
  });

  it('rechaza unión sin token', () => {
    const manager = new SessionManager();
    const session = manager.create();
    const result = manager.verifyJoin(session.code);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('UNAUTHORIZED');
  });

  it('rechaza unión con token incorrecto', () => {
    const manager = new SessionManager();
    const session = manager.create();
    const result = manager.verifyJoin(session.code, 'WRONG-TOKEN');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('UNAUTHORIZED');
  });

  it('acepta token con espacios, guiones y minúsculas', () => {
    const manager = new SessionManager();
    const session = manager.create();
    const raw = ` ${session.token.slice(0, 3).toLowerCase()} - ${session.token.slice(3)} `;
    const result = manager.verifyJoin(session.code, raw);
    expect(result.ok).toBe(true);
  });

  it('rechaza unión a sesión inexistente', () => {
    const manager = new SessionManager();
    const result = manager.verifyJoin('ZIMA-0000', 'tok');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('SESSION_NOT_FOUND');
  });

  it('no distingue mayúsculas/minúsculas en el código', () => {
    const manager = new SessionManager();
    const session = manager.create();
    const result = manager.verifyJoin(session.code.toLowerCase(), session.token);
    expect(result.ok).toBe(true);
  });

  it('limpia sesiones inactivas sin clientes', () => {
    const manager = new SessionManager();
    const session = manager.create();
    session.lastActivity = Date.now() - 60_000;
    const removed = manager.cleanup(30_000);
    expect(removed).toBe(1);
    expect(manager.findById(session.id)).toBeUndefined();
  });

  it('no limpia sesiones con quests conectados', () => {
    const manager = new SessionManager();
    const session = manager.create();
    session.lastActivity = Date.now() - 60_000;
    session.quests.set('q1', { clientId: 'q1', deviceName: 'QUEST', connected: true });
    const removed = manager.cleanup(30_000);
    expect(removed).toBe(0);
  });
});