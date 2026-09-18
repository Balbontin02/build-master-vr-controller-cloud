import { z } from 'zod';

export const envelopeSchema = z.object({
  type: z.string().min(1).max(64),
  messageId: z.string().min(1).max(64),
  timestamp: z.number().int().positive(),
  payload: z.unknown().optional(),
});

export const roleSchema = z.enum(['ADVISOR', 'QUEST']);

export const clientRegisterSchema = z.object({
  role: roleSchema,
  deviceName: z.string().min(1).max(40),
});

export const sessionCreateSchema = z
  .object({
    resumeCode: z.string().min(1).max(20).optional(),
    resumeToken: z.string().min(1).max(64).optional(),
  })
  .optional();

export const sessionJoinSchema = z.object({
  code: z.string().min(1).max(20),
  token: z.string().min(1).max(64).optional(),
});

export const sceneChangeSchema = z.object({
  sceneId: z.string().min(1).max(64),
});

export const sceneChangedSchema = z.object({
  sceneId: z.string().min(1).max(64),
  title: z.string().max(120).optional(),
  source: z.enum(['command', 'manual']).optional(),
});

export const sceneCurrentSchema = z.object({
  sceneId: z.string().min(1).max(64),
  title: z.string().max(120).optional(),
});

export const sceneChangeFailedSchema = z.object({
  sceneId: z.string().min(1).max(64),
  reason: z.string().max(120).optional(),
});