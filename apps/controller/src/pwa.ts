/**
 * Registro del Service Worker del controlador (PWA).
 *
 * Los Service Workers solo funcionan en contextos seguros (https o localhost).
 * Sobre http://192.168.x.x (LAN, servidor local) el registro no es posible:
 * se omite silenciosamente y la app sigue funcionando normalmente (sin modo
 * offline ni instalación). Sobre https://IP:3443 sí se registra.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        /* entorno sin soporte: la UI funciona igual */
      });
  });
}