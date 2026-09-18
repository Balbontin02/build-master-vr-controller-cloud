import { describe, expect, it } from 'vitest';
import {
  findScene,
  isValidSceneId,
  project,
  projectData,
  scenes,
  sceneGroups,
} from '@bmvr/shared';

describe('scenes (whitelist ZIMÁ)', () => {
  it('tiene exactamente 17 escenas', () => {
    expect(scenes).toHaveLength(17);
  });

  it('los IDs de escena son únicos', () => {
    const ids = scenes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los títulos de escena son únicos', () => {
    const titles = scenes.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('todas las escenas pertenecen a un grupo conocido', () => {
    const groupIds = new Set(sceneGroups.map((g) => g.id));
    for (const scene of scenes) {
      expect(groupIds.has(scene.group), `grupo inválido para ${scene.id}`).toBe(true);
    }
  });

  it('encuentra la escena RECEPCIÓN', () => {
    const scene = findScene('scene_e3abad37db7b4b10a1eac5379ae180db');
    expect(scene).toBeDefined();
    expect(scene?.title).toBe('RECEPCIÓN');
  });

  it('encuentra la escena KHALO-RECÁMARA', () => {
    const scene = findScene('scene_f05f2960ede549e8a5049421acea4bb0');
    expect(scene?.title).toBe('KHALO-RECÁMARA');
  });

  it('rechaza IDs inexistentes', () => {
    expect(isValidSceneId('scene_no_existe')).toBe(false);
    expect(isValidSceneId('')).toBe(false);
  });

  it('el proyecto ZIMÁ usa el prefijo ZIMA', () => {
    expect(project.id).toBe('zima');
    expect(project.shortCodePrefix).toBe('ZIMA');
    expect(projectData.scenes).toHaveLength(17);
  });
});