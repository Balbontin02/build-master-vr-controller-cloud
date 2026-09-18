import type { Project, ProjectData, Scene, SceneGroup } from './types';

export const sceneGroups: SceneGroup[] = [
  { id: 'general', label: 'GENERAL', order: 1 },
  { id: 'khalo', label: 'KHALO', order: 2 },
  { id: 'curie', label: 'CURIE', order: 3 },
  { id: 'hadid', label: 'HADID', order: 4 },
  { id: 'rooftop', label: 'ROOFTOP', order: 5 },
];

const RAW_SCENES: Array<Pick<Scene, 'id' | 'title' | 'group' | 'label'>> = [
  { id: 'scene_10cbbbac77e94dcfbd40544f7e5ca0c9', title: 'EXT-01', group: 'general', label: 'EXTERIOR' },
  { id: 'scene_e3abad37db7b4b10a1eac5379ae180db', title: 'RECEPCIÓN', group: 'general', label: 'RECEPCIÓN' },
  { id: 'scene_1056366944ff4c0ea1255a255cbae991', title: 'KHALO', group: 'khalo', label: 'KHALO' },
  { id: 'scene_83f6c5b4bf95470b9c1a56612e2ec800', title: 'KHALO-SOCIAL', group: 'khalo', label: 'SOCIAL' },
  { id: 'scene_f05f2960ede549e8a5049421acea4bb0', title: 'KHALO-RECÁMARA', group: 'khalo', label: 'RECÁMARA' },
  { id: 'scene_d8dba49f8bfd4cb69ec8a69839a569b5', title: 'KHALO-BAÑO', group: 'khalo', label: 'BAÑO' },
  { id: 'scene_ba0544d9a07849f48e8f929eafd36af9', title: 'CURIE', group: 'curie', label: 'CURIE' },
  { id: 'scene_0b11b2f7b82e4c40ad230f1b4b465a40', title: 'CURIE-SOCIAL', group: 'curie', label: 'SOCIAL' },
  { id: 'scene_d5fdbbb843dc4402aa551fb348834f4f', title: 'CURIE-RECÁMARA', group: 'curie', label: 'RECÁMARA' },
  { id: 'scene_8344fe9f97f44b9d97026bd56ff24b1a', title: 'CURIE-BAÑO', group: 'curie', label: 'BAÑO' },
  { id: 'scene_50aa9d0f5bca4ad8899a8def91f67e0a', title: 'CURIE-VESTIDOR', group: 'curie', label: 'VESTIDOR' },
  { id: 'scene_fb19255e417540129bf17d85582e9e68', title: 'HADID', group: 'hadid', label: 'HADID' },
  { id: 'scene_e77da8803220467586cdb138fff60b0b', title: 'HADID-SOCIAL', group: 'hadid', label: 'SOCIAL' },
  { id: 'scene_abae892d16a640febb1e2f462426f273', title: 'HADID-RECÁMARA', group: 'hadid', label: 'RECÁMARA' },
  { id: 'scene_9aea8b14117047be9ba111a2536ed2f6', title: 'HADID-BAÑO', group: 'hadid', label: 'BAÑO' },
  { id: 'scene_4ba113552db441ffa9b19890d8f26538', title: 'EXT-02 ROOF TOP', group: 'rooftop', label: 'ROOF 01' },
  { id: 'scene_a5993c62a64d409f8da7242164c95d26', title: 'EXT-03 ROOF TOP', group: 'rooftop', label: 'ROOF 02' },
];

export const scenes: Scene[] = RAW_SCENES.map((s, i) => ({ ...s, order: i + 1 }));

export const project: Project = {
  id: 'zima',
  name: 'ZIMÁ',
  shortCodePrefix: 'ZIMA',
  tourId: 'main',
  tourName: 'Tour principal ZIMÁ',
  tourUrl:
    'https://showreel.d5render.com/personal-krpano?directory=https://usa.asset.d5cdn.com/tourProject/pano_roam_1780957287272_112345/&tourId=2064110744520667137',
};

export const projectData: ProjectData = { project, groups: sceneGroups, scenes };

const sceneById = new Map(scenes.map((s) => [s.id, s]));

export function findScene(id: string): Scene | undefined {
  return sceneById.get(id);
}

export function isValidSceneId(id: string): boolean {
  return sceneById.has(id);
}

export function scenesByGroup(groupId: string): Scene[] {
  return scenes.filter((s) => s.group === groupId);
}