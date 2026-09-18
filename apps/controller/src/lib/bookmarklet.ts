export interface BookmarkletCfg {
  ws?: string;
  wss?: string;
  code?: string;
  token?: string;
  deviceName?: string;
  debug?: boolean;
}

/**
 * Envuelve el bundle minificado del Quest Bridge en un bookmarklet.
 * window.__BMVR_CFG__ se inyecta ANTES de ejecutar el bundle.
 */
export function buildBookmarklet(bundle: string, cfg: BookmarkletCfg = {}): string {
  if (Object.keys(cfg).length === 0) {
    return `javascript:${bundle}`;
  }
  const prefix = `window.__BMVR_CFG__=${JSON.stringify(cfg)};`;
  return `javascript:${prefix}${bundle}`;
}