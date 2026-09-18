export interface BridgeConfig {
  ws?: string;
  wss?: string;
  code?: string;
  token?: string;
  deviceName?: string;
  debug?: boolean;
}

export interface OverlayState {
  status: 'starting' | 'no-krpano' | 'connecting' | 'joining' | 'ready' | 'disconnected' | 'error';
  scene: string;
  detail?: string;
}

export type OverlayStatus = OverlayState['status'];