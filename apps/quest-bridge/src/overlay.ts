import type { OverlayState } from './types';

const ROOT_ID = 'bmvr-overlay';

let root: HTMLElement | null = null;
let dot: HTMLElement | null = null;
let statusText: HTMLElement | null = null;
let sceneText: HTMLElement | null = null;

function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function mountOverlay(): HTMLElement {
  if (root) {
    root.style.display = 'block';
    return root;
  }
  root = el('div', { id: ROOT_ID });
  root.style.cssText = [
    'position:fixed',
    'top:12px',
    'left:12px',
    'z-index:2147483000',
    'background:rgba(10,12,16,0.88)',
    'color:#e4e4e7',
    'font-family:system-ui,-apple-system,"Segoe UI",sans-serif',
    'font-size:12px',
    'line-height:1.35',
    'padding:10px 12px',
    'border-radius:12px',
    'border:1px solid rgba(255,255,255,0.14)',
    'max-width:260px',
    'backdrop-filter:blur(4px)',
    'box-shadow:0 6px 20px rgba(0,0,0,0.35)',
    'user-select:none',
  ].join(';');

  const head = el('div');
  head.style.cssText = 'display:flex;align-items:center;gap:8px;font-weight:600;font-size:11px;letter-spacing:0.06em;color:#a1a1aa;';
  dot = el('span');
  dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#71717a;flex:0 0 auto;';
  head.appendChild(dot);
  const title = el('span', {}, 'BUILD MASTER VR');
  head.appendChild(title);

  const closeBtn = el('button', { type: 'button', 'aria-label': 'Cerrar panel Build Master VR' }, '✕');
  closeBtn.style.cssText =
    'margin-left:auto;background:none;border:none;color:#71717a;font-size:11px;cursor:pointer;padding:0 2px;';
  closeBtn.addEventListener('click', () => hide());
  head.appendChild(closeBtn);

  const body = el('div');
  body.style.cssText = 'margin-top:6px;';
  statusText = el('div', {}, '…');
  statusText.style.cssText = 'font-weight:600;';
  sceneText = el('div', {}, '—');
  sceneText.style.cssText = 'color:#d4d4d8;margin-top:2px;word-break:break-word;';
  body.appendChild(statusText);
  body.appendChild(sceneText);

  root.appendChild(head);
  root.appendChild(body);
  document.documentElement.appendChild(root);
  return root;
}

export function updateOverlay(state: OverlayState): void {
  if (!root) return;
  if (!statusText || !sceneText || !dot) return;

  const colors: Record<OverlayState['status'], string> = {
    starting: '#71717a',
    'no-krpano': '#f59e0b',
    connecting: '#38bdf8',
    joining: '#38bdf8',
    ready: '#34d399',
    disconnected: '#f87171',
    error: '#f87171',
  };
  dot.style.background = colors[state.status];

  const labels: Record<OverlayState['status'], string> = {
    starting: 'INICIANDO…',
    'no-krpano': 'KRPANO NO DETECTADO',
    connecting: 'CONECTANDO…',
    joining: 'UNIENDO A SESIÓN…',
    ready: 'CONECTADO',
    disconnected: 'DESCONECTADO',
    error: 'ERROR',
  };
  statusText.textContent = labels[state.status] + (state.detail ? ` · ${state.detail}` : '');
  sceneText.textContent = `Escena: ${state.scene}`;
}

export function setOverlayVisible(v: boolean): void {
  if (root) root.style.display = v ? 'block' : 'none';
}

export function hide(): void {
  setOverlayVisible(false);
}

export function destroyOverlay(): void {
  if (root) {
    root.remove();
    root = null;
    dot = null;
    statusText = null;
    sceneText = null;
  }
}