/**
 * Talking Points por escena.
 *
 * Información PRIVADA del asesor: le recuerda qué mencionar mientras el cliente
 * ve la escena en el Quest. NUNCA se envían por WebSocket, ni se incluyen en el
 * bundle del Quest Bridge (este módulo solo se exporta desde index.ts, no desde
 * lite.ts). Son datos exclusivos del controlador.
 *
 * Textos breves y profesionales. Usa "[Agregar talking point]" como placeholder
 * hasta que el equipo comercial confirme la información real de cada escena.
 */

import { scenes } from './scenes';

const RAW_TALKING_POINTS: Record<string, string[]> = {
  // EXT-01 (EXTERIOR)
  scene_10cbbbac77e94dcfbd40544f7e5ca0c9: [
    'Arquitectura contemporánea y sobria, con líneas rectas y una composición muy limpia.',
    'La fachada utiliza una combinación de tonos cálidos, concreto y grandes superficies de cristal, lo que le da una apariencia moderna sin sentirse fría.',
    'Un punto interesante es que la arquitectura tiene una estética atemporal: no depende de elementos demasiado llamativos que puedan pasar de moda rápidamente.',
    // 'La repetición de los marcos verticales y horizontales genera una fachada ordenada y con mucha presencia',
    // 'El proyecto se integra con una zona predominantemente residencial, pero al mismo tiempo introduce una arquitectura mucho más contemporánea',
    // 'La vegetación no está simplemente agregada como decoración; forma parte de la composición de la fachada',
    // 'Cada nivel incorpora jardineras que ayudan a romper la sensación de concreto',
    // 'El diseño genera una relación más cercana entre arquitectura y naturaleza',
    // 'Tonalidades neutras y cálidas',
    // 'Concreto/apariencia pétrea',
    // 'Elementos metálicos oscuros para un mejor contraste',
  ],
  // RECEPCIÓN
  scene_e3abad37db7b4b10a1eac5379ae180db: [
    'Recepción con elevador, sala de espera y escaleras',
    'Diseño cálido y moderno',
  ],
  // KHALO
  scene_1056366944ff4c0ea1255a255cbae991: [
    'Presentar la zona social principal',
    'Mencionar la fluidez entre los espacios',
    '[Agregar talking point]',
  ],
  // KHALO-SOCIAL
  scene_83f6c5b4bf95470b9c1a56612e2ec800: [
    'Espacio pensado para la convivencia',
    'Relacionar esta zona con el área principal',
    '[Agregar talking point]',
  ],
  // KHALO-RECÁMARA
  scene_f05f2960ede549e8a5049421acea4bb0: [
    'Presentar la zona de descanso',
    'Señalar la sensación de amplitud',
    '[Agregar talking point]',
    '[Agregar talking point]',
  ],
  // KHALO-BAÑO
  scene_d8dba49f8bfd4cb69ec8a69839a569b5: [
    'Presentar el baño principal',
    'Destacar la funcionalidad del espacio',
    '[Agregar talking point]',
  ],
  // CURIE
  scene_ba0544d9a07849f48e8f929eafd36af9: [
    'Presentar el segundo departamento',
    'Comparar con la propuesta KHALO si aplica',
    '[Agregar talking point]',
  ],
  // CURIE-SOCIAL
  scene_0b11b2f7b82e4c40ad230f1b4b465a40: [
    'Espacio social de la propuesta CURIE',
    'Señalar cómo aprovecha la luz y la vista',
    '[Agregar talking point]',
  ],
  // CURIE-RECÁMARA
  scene_d5fdbbb843dc4402aa551fb348834f4f: [
    'Presentar la recámara de CURIE',
    'Mencionar la distribución funcional',
    '[Agregar talking point]',
  ],
  // CURIE-BAÑO
  scene_8344fe9f97f44b9d97026bd56ff24b1a: [
    'Presentar el baño de CURIE',
    'Destacar acabados y funcionalidad',
    '[Agregar talking point]',
  ],
  // CURIE-VESTIDOR
  scene_50aa9d0f5bca4ad8899a8def91f67e0a: [
    'Presentar el vestidor',
    'Señalar la capacidad de almacenamiento',
    '[Agregar talking point]',
  ],
  // HADID
  scene_fb19255e417540129bf17d85582e9e68: [
    'Presentar la propuesta HADID',
    'Destacar la personalidad del espacio',
    '[Agregar talking point]',
  ],
  // HADID-SOCIAL
  scene_e77da8803220467586cdb138fff60b0b: [
    'Espacio social de HADID',
    'Mencionar la integración con el exterior',
    '[Agregar talking point]',
  ],
  // HADID-RECÁMARA
  scene_abae892d16a640febb1e2f462426f273: [
    'Presentar la recámara de HADID',
    'Señalar la sensación de confort',
    '[Agregar talking point]',
  ],
  // HADID-BAÑO
  scene_9aea8b14117047be9ba111a2536ed2f6: [
    'Presentar el baño de HADID',
    'Destacar el diseño y la funcionalidad',
    '[Agregar talking point]',
  ],
  // EXT-02 ROOF TOP (ROOF 01)
  scene_4ba113552db441ffa9b19890d8f26538: [
    'Presentar la terraza: vista y amplitud',
    'Señalar el potencial para entretenimiento',
    '[Agregar talking point]',
  ],
  // EXT-03 ROOF TOP (ROOF 02)
  scene_a5993c62a64d409f8da7242164c95d26: [
    'Segunda vista de la terraza',
    'Cerrar la presentación del proyecto',
    '[Agregar talking point]',
  ],
};

export const TALKING_POINTS: Record<string, string[]> = RAW_TALKING_POINTS;

/** Devuelve los Talking Points de una escena (vacío si no tiene). */
export function getTalkingPoints(sceneId: string): string[] {
  return TALKING_POINTS[sceneId] ?? [];
}

/** Devuelve el total de Talking Points definidos (para verificación). */
export function countTalkingPoints(): number {
  return scenes.filter((s) => (TALKING_POINTS[s.id]?.length ?? 0) > 0).length;
}