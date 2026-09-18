# Build Master VR Controller

Control remoto en LAN de tours inmobiliarios 360°/VR (D5 Render + KRPano) abiertos en Meta Quest Browser.
El asesor cambia escenas desde laptop/tablet y el Quest ejecuta `krpano.call("loadscene(scene_id)")` de forma remota.

## Cómo funciona

- **Servidor** (Node/Express/ws): sirve el control web, crea sesiones (`ZIMA-XXXX` + token), enruta mensajes WebSocket y valida contra una whitelist de escenas.
- **Control** (React+Vite): página del asesor con QR de unión, escenas por grupo y estado de conexión.
- **Bridge (Quest)**: un bookmarklet de 10 KB (bundle minificado) se ejecuta en la página del tour D5 dentro del Quest Browser. Detecta `window.krpano`, se conecta al servidor por WebSocket y cambia escenas.
- **Doble puerto**: HTTP (3000) para el control en LAN y HTTPS (3443, certificado self-signed) para que el Quest use `wss` desde la página https del tour (evita el bloqueo de mixed content de Chromium).

## Arquitectura

```
apps/controller/       React + Vite + Tailwind (SPA del asesor)
apps/server/           Express HTTP+HTTPS + ws hub + sesiones + API
apps/quest-bridge/     Bridge que se inyecta en el Quest (bookmarklet)
packages/shared/       Tipos, protocolo, whitelist de escenas, validación Zod
```

Flujo de mensajes WebSocket (envelope `{type, messageId, timestamp, payload}`):

```
advisor --scene.change--> hub --(whitelist)--> quest --krpano.call--> loadscene
quest  --scene.changed--> hub ------------------------> advisor (confirmación)
```

## Requisitos

- Node.js >= 20 (probado con v22)
- npm >= 10

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev        # servidor (tsx watch) + controller (vite) en paralelo
```

## Build y verificación

```bash
npm run build      # typecheck shared + bookmarklet + controller + server
npm test           # 36 tests (vitest)
npm run lint       # eslint --max-warnings 0
npm run typecheck
```

## Ejecución

```bash
npm start          # arranca el servidor (apps/server/dist/index.js)
```

En el primer arranque se genera el certificado self-signed (`apps/server/certs/`). Los logs muestran las URLs de acceso:

- Control (asesor): `http://IP:3000/control`
- Bookmarklet/setup: `http://IP:3000/setup`

> Importante: el Quest debe abrir `https://IP:3443` **una vez** y aceptar el certificado, para que `wss` funcione desde la página https del tour D5.

## Uso (resumen)

1. Abre `http://IP:3000/control` en la laptop/tablet → crea sesión → se muestra el QR y el link de unión.
2. En el Quest, abre el tour D5 y ejecuta el bookmarklet (ver `docs/META-QUEST-SETUP.md` para el workaround del `javascript:` en favoritos de Meta Quest Browser).
3. El Quest entra el código de sesión + token (o escanea el QR) y se conecta.
4. Desde el control selecciona una escena (RECEPCIÓN, KHALO-RECÁMARA, etc.) y el Quest carga la escena al instante.

## PWA (controlador del asesor)

El controlador `/control` es una **Progressive Web App** instalable. El Quest Bridge y el tour D5 **no** se ven afectados.

- **Instalar**: botón **App** en el header del controlador (o `beforeinstallprompt`). En iOS: Compartir → Añadir a pantalla de inicio.
- **Manifest**: `apps/controller/public/manifest.webmanifest` (name "Build Master VR Controller", short "BM VR", `display: standalone`, `start_url: /control`).
- **Service Worker**: `apps/controller/public/sw.js` — cachea el shell para que la UI cargue sin conexión. El WebSocket siempre requiere el servidor local: si no hay conexión la UI muestra **🔴 QUEST DESCONECTADO** (nunca simula conexión).
- **Iconos**: generados desde `BM isotipo blanco.png` (blanco sobre fondo oscuro, proporciones respetadas) en `apps/controller/public/icons/`.

### Limitación PWA sobre LAN/HTTP

Los Service Workers y la instalación PWA requieren un **contexto seguro** (HTTPS o localhost):

- `http://localhost:3000` → PWA completa (offline + instalación).
- `http://192.168.x.x:3000` → la app funciona normal, pero **sin** instalación ni offline (el registro del SW se omite silenciosamente).
- `https://IP:3443/control` → PWA completa sobre LAN (mismo servidor, certificado self-signed aceptado una vez). Recomendado para instalar en el teléfono del asesor.

## Talking Points

Información **privada del asesor** que aparece por escena (expandible/collapsable) bajo la escena actual. El cliente en el Quest **nunca** los ve: no viajan por WebSocket ni se incluyen en el bundle del Quest Bridge.

- **Dónde se editan**: `packages/shared/src/talkingPoints.ts` (clave = sceneId, lista de strings). Usa `"[Agregar talking point]"` como placeholder.
- Comportamiento: se actualizan automáticamente al cambiar de escena. Si una escena no tiene talking points, la sección se oculta.
- Regla de privacidad: los mensajes WebSocket (`scene.change`) solo contienen `sceneId`.

## Seguridad

- Sin `eval`/`new Function`: el bridge solo ejecuta `krpano.call("loadscene(id)")` para IDs validados contra la whitelist.
- El join de sesión exige token (el código solo se rechaza).
- Rate limit por cliente y tamaño máximo de mensaje en el WS.

## Configuración (variables de entorno)

| Variable     | Default | Descripción                          |
| ------------ | ------- | ------------------------------------ |
| `PORT`       | `3000`  | Puerto HTTP                          |
| `HTTP_PORT`  | `3000`  | Puerto HTTP (alternativo a `PORT`)   |
| `HTTPS_PORT` | `3443`  | Puerto HTTPS (wss para el Quest)     |

## Escenas (proyecto ZIMÁ)

Whitelist de 17 escenas con grupos GENERAL, KHALO, CURIE, HADID y ROOFTOP en `packages/shared/src/scenes.ts` (única fuente de verdad).

## Branding

Logos oficiales de Build Master (blancos, usados sobre fondos oscuros):

- `apps/controller/public/branding/BM logotipo blanco.png` — espacios con anchura (header/bienvenida).
- `apps/controller/public/branding/BM isotipo blanco.png` — espacios reducidos (icono, header).

No duplicar: copiar/pegar los archivos en esa carpeta y referenciarlos desde ahí. Los iconos PWA derivan del isotipo y se regeneran con PowerShell/.NET si cambian los tamaños.

## Documentación

- `docs/META-QUEST-SETUP.md` — configuración paso a paso del Quest 3S + workaround del bookmarklet.