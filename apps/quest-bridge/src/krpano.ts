import { KRPANO_DETECT_TIMEOUT_MS } from '@bmvr/shared/lite';

type KrpanoApi = {
  get?: (attr: string) => unknown;
  call?: (command: string) => void;
  events?: { addListener?: (name: string, cb: () => void) => void };
  addChangeListener?: (varPath: string, cb: () => void) => void;
  addEventListener?: (name: string, cb: () => void) => void;
};

let krpano: KrpanoApi | null = null;
let listenersBound = false;

function findKrpano(): KrpanoApi | null {
  const w = window as unknown as Record<string, unknown>;
  try {
    if (typeof w.krpano === 'object' && w.krpano !== null) return w.krpano as KrpanoApi;
  } catch {
    /* ignore */
  }
  try {
    if (typeof w.krpanoJS === 'object' && w.krpanoJS !== null) return w.krpanoJS as KrpanoApi;
  } catch {
    /* ignore */
  }
  try {
    if (typeof w.activekrpanowindow === 'object' && w.activekrpanowindow !== null)
      return w.activekrpanowindow as KrpanoApi;
  } catch {
    /* ignore */
  }
  return null;
}

export function getKrpano(): KrpanoApi | null {
  if (!krpano) krpano = findKrpano();
  return krpano;
}

export function resetKrpano(): void {
  krpano = null;
}

export function isKrpanoReady(): boolean {
  return getKrpano() !== null;
}

export function waitForKrpano(onFound: () => void, timeoutMs = KRPANO_DETECT_TIMEOUT_MS): () => void {
  let stopped = false;
  let tries = 0;

  const stop = () => {
    stopped = true;
    if (interval) window.clearInterval(interval);
  };

  const interval = window.setInterval(() => {
    if (stopped) return;
    if (getKrpano()) {
      stop();
      onFound();
      return;
    }
    tries += 1;
    if (tries * 500 >= timeoutMs) {
      stop();
      onFound();
    }
  }, 500);

  return stop;
}

export function getCurrentSceneId(): string | null {
  const k = getKrpano();
  if (!k || typeof k.get !== 'function') return null;
  try {
    const scene = k.get('xml.scene');
    return typeof scene === 'string' && scene.length > 0 ? scene : null;
  } catch {
    return null;
  }
}

export function changeScene(sceneId: string): boolean {
  const k = getKrpano();
  if (!k || typeof k.call !== 'function') return false;
  try {
    k.call(`loadscene(${sceneId})`);
    return true;
  } catch {
    return false;
  }
}

export function bindSceneChangeListener(cb: () => void): void {
  const k = getKrpano();
  if (!k) return;
  if (listenersBound) return;

  try {
    if (k.events && typeof k.events.addListener === 'function') {
      k.events.addListener('onnewscene', cb);
      listenersBound = true;
      return;
    }
  } catch {
    /* try next */
  }
  try {
    if (typeof k.addChangeListener === 'function') {
      k.addChangeListener('xml.scene', cb);
      listenersBound = true;
      return;
    }
  } catch {
    /* try next */
  }
  try {
    if (typeof k.addEventListener === 'function') {
      k.addEventListener('onnewscene', cb);
      listenersBound = true;
    }
  } catch {
    /* polling fallback */
  }
}