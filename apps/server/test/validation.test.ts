import { describe, expect, it } from 'vitest';
import {
  clientRegisterSchema,
  envelopeSchema,
  sceneChangeSchema,
  sessionCreateSchema,
  sessionJoinSchema,
} from '@bmvr/shared';

describe('validación de mensajes WebSocket', () => {
  it('acepta un envelope válido', () => {
    const result = envelopeSchema.safeParse({
      type: 'scene.change',
      messageId: 'abc-123',
      timestamp: 1787000000000,
      payload: { sceneId: 'scene_xyz' },
    });
    expect(result.success).toBe(true);
  });

  it('rechaza un envelope sin messageId', () => {
    const result = envelopeSchema.safeParse({
      type: 'scene.change',
      timestamp: 1787000000000,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza timestamp no numérico', () => {
    const result = envelopeSchema.safeParse({
      type: 'scene.change',
      messageId: 'a',
      timestamp: 'now',
    });
    expect(result.success).toBe(false);
  });

  it('acepta client.register con role QUEST', () => {
    const result = clientRegisterSchema.safeParse({ role: 'QUEST', deviceName: 'ZIMA-QUEST-01' });
    expect(result.success).toBe(true);
  });

  it('rechaza roles desconocidos', () => {
    const result = clientRegisterSchema.safeParse({ role: 'HACKER', deviceName: 'x' });
    expect(result.success).toBe(false);
  });

  it('rechaza deviceName vacío', () => {
    const result = clientRegisterSchema.safeParse({ role: 'QUEST', deviceName: '' });
    expect(result.success).toBe(false);
  });

  it('acepta session.join con código y token', () => {
    const result = sessionJoinSchema.safeParse({ code: 'ZIMA-7421', token: 'tok-1' });
    expect(result.success).toBe(true);
  });

  it('rechaza session.join sin código', () => {
    const result = sessionJoinSchema.safeParse({ token: 'tok-1' });
    expect(result.success).toBe(false);
  });

  it('acepta scene.change con sceneId válido', () => {
    const result = sceneChangeSchema.safeParse({
      sceneId: 'scene_e3abad37db7b4b10a1eac5379ae180db',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza scene.change sin sceneId', () => {
    const result = sceneChangeSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('acepta session.create vacío (sin payload)', () => {
    const result = sessionCreateSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });
});