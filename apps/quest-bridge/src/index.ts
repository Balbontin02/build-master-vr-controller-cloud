import { createBridge, type BuildMasterVrApi } from './bridge';

declare global {
  interface Window {
    __BUILDMASTERVR__?: BuildMasterVrApi;
  }
}

function bootstrap(): BuildMasterVrApi {
  const existing = window.__BUILDMASTERVR__;
  if (existing) {
    existing.reconnect();
    return existing;
  }
  const api = createBridge();
  window.__BUILDMASTERVR__ = api;
  api.connect();
  return api;
}

bootstrap();