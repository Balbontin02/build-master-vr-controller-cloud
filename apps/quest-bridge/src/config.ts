import type { BridgeConfig } from './types';

const GLOBAL_CFG_KEY = '__BMVR_CFG__';

export function readConfig(): BridgeConfig {
  const w = window as unknown as Record<string, unknown>;
  const injected = w[GLOBAL_CFG_KEY];
  if (injected && typeof injected === 'object') {
    return { ...(injected as BridgeConfig) };
  }
  return {};
}

export function writeConfig(cfg: BridgeConfig): void {
  const w = window as unknown as Record<string, unknown>;
  w[GLOBAL_CFG_KEY] = cfg;
}