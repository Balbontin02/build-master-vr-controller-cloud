export type Role = 'ADVISOR' | 'QUEST';

export interface Scene {
  id: string;
  title: string;
  label: string;
  group: string;
  order: number;
  /**
   * Talking Points: información privada del asesor.
   * Se almacenan fuera del bundle del Quest Bridge y NUNCA viajan por WebSocket.
   */
  talkingPoints?: string[];
}

export interface SceneGroup {
  id: string;
  label: string;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  shortCodePrefix: string;
  tourId: string;
  tourName: string;
  tourUrl: string;
}

export interface ProjectData {
  project: Project;
  groups: SceneGroup[];
  scenes: Scene[];
}

export type SceneChangeSource = 'command' | 'manual';

export interface QuestInfo {
  clientId: string;
  deviceName: string;
  connected: boolean;
  lastSeen?: number;
}