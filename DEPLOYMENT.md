# Deployment Guide — Build Master VR Controller

Este documento explica cómo desplegar el controlador en Vercel manteniendo la funcionalidad WebSocket completa con el Meta Quest.

---

## 1. Arquitectura de Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Controller (React + Vite) — Static Site                  │  │
│  │  https://build-master-vr.vercel.app                       │  │
│  │  - Sirve la UI del asesor                                 │  │
│  │  - Sirve el bookmarklet (quest-bridge.min.js)             │  │
│  │  - NO ejecuta WebSocket server                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS + WSS (configurado via ENV)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           SERVIDOR WEBSOCKET PERSISTENTE (Node.js)              │
│  Railway / Fly.io / Render / VPS / etc.                         │
│  - Express + ws (WebSocket server)                              │
│  - Puerto único HTTPS/WSS (ej. 443)                             │
│  - Certificados TLS válidos (Let's Encrypt / auto)              │
│  - Endpoint: wss://mi-servidor.railway.app/ws                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        META QUEST                                 │
│  - Abre tour D5 (HTTPS)                                         │
│  - Ejecuta bookmarklet BUILD MASTER VR CONNECT                  │
│  - Bridge conecta a wss://mi-servidor.railway.app/ws            │
│  - window.krpano.controla escenas                               │
└─────────────────────────────────────────────────────────────────┘
```

**Punto clave**: Vercel NO soporta WebSocket servers persistentes en serverless functions. El servidor WebSocket DEBE ejecutarse en un servicio que mantenga procesos Node.js persistentes (Railway, Fly.io, Render, VPS, etc.).

---

## 2. Desarrollo Local

### Instalación

```bash
npm install
```

### Ejecución (modo desarrollo completo)

```bash
npm run dev
```

Esto inicia:
- **Servidor** (puerto 3000 HTTP + 3443 HTTPS + WebSocket `/ws`)
- **Controlador** (Vite dev server, proxy al servidor)

### URLs locales

- Controlador: `http://localhost:3000/control`
- Setup Quest: `http://localhost:3000/setup`
- API Config: `http://localhost:3000/api/config`
- Bookmarklet: `http://localhost:3000/quest-bridge.min.js`

### Certificados locales

El servidor genera certificados self-signed en `apps/server/certs/`. La primera vez que el Quest acceda a `https://<IP-LAN>:3443` deberá aceptar la advertencia de certificado.

---

## 3. Build de Producción

### Variables de entorno requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PRODUCTION_WSS_URL` | URL completa del WebSocket server en producción (wss://) | `wss://mi-servidor.railway.app/ws` |
| `VITE_WS_URL` | URL WSS para el controller en Vercel (Vite) | `wss://mi-servidor.railway.app/ws` |

### Build completo para producción

```bash
PRODUCTION_WSS_URL=wss://mi-servidor.railway.app/ws VITE_WS_URL=wss://mi-servidor.railway.app/ws npm run build:prod
```

O en pasos separados:

```bash
# 1. Build del bookmarklet con WSS de producción inyectado
PRODUCTION_WSS_URL=wss://mi-servidor.railway.app/ws npm run build:bookmarklet:prod

# 2. Build del controlador (Vite usa VITE_WS_URL)
VITE_WS_URL=wss://mi-servidor.railway.app/ws npm run build:controller

# 3. Build del servidor (para deployment separado)
npm run build:server
```

### Artefactos generados

- `apps/controller/dist/` → Static site para Vercel
- `apps/quest-bridge/dist/quest-bridge.min.js` → Bundle del bridge
- `apps/quest-bridge/dist/build-master-vr-connect.bookmarklet.txt` → Bookmarklet con WSS de producción preconfigurado
- `apps/server/dist/index.js` → Servidor WebSocket para deployment separado

---

## 4. Deployment en Vercel (Solo Controlador)

### Pasos

1. **Importar repositorio** en Vercel (GitHub/GitLab/Bitbucket)

2. **Configuración del proyecto**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build:controller`
   - **Output Directory**: `apps/controller/dist`
   - **Install Command**: `npm install`

3. **Variables de entorno en Vercel** (Project Settings → Environment Variables):
   ```
   VITE_WS_URL = wss://mi-servidor.railway.app/ws
   ```
   - Aplicar a: Production, Preview, Development

4. **Deploy**

### vercel.json (ya incluido)

El archivo `vercel.json` en la raíz configura:
- Build command y output directory
- SPA fallback (rewrites a `/index.html`)
- Headers para Service Worker y manifest
- Variables de entorno

---

## 5. Deployment del Servidor WebSocket (Persistente) — Railway

El servidor WebSocket **NO** se despliega en Vercel. Se despliega en Railway como servicio Node.js persistente.

### Railway (recomendado)

1. **Crear proyecto en Railway** → "Deploy from GitHub repo"
2. **Configurar servicio**:
   - **Root Directory**: `/` (raíz del monorepo)
   - **Build Command**: `npm run build:server`
   - **Start Command**: `npm run start --workspace apps/server`
   - **Variables de entorno**:
     ```
     NODE_ENV=production
     ALLOWED_ORIGINS=https://build-master-vr.vercel.app,https://showreel.d5render.com
     ```
     (Railway inyecta `PORT` automáticamente)
3. **Deploy** → Railway proporciona URL pública: `https://xxx.railway.app`
4. **WebSocket endpoint**: `wss://xxx.railway.app/ws`

**Cómo funciona en Railway**:
- Railway termina TLS en su edge (puerto 443 público)
- Tu servidor Node recibe tráfico HTTP plano en `process.env.PORT` (ej. 3000 interno)
- El servidor **NO crea servidor HTTPS ni certificados self-signed** en producción (`NODE_ENV=production`)
- WebSocket upgrades ocurren en el mismo puerto HTTP

### Fly.io / Render / VPS (alternativas)

El servidor es un proceso Node estándar. Para Fly.io/Render/VPS, el mismo principio: TLS termination externo, Node escucha HTTP en `process.env.PORT`.

---

## 6. Configuración del Quest Bridge en Producción

### Opción A: Bookmarklet con WSS preconfigurado (recomendado)

1. Ejecutar build de producción con `PRODUCTION_WSS_URL` configurado:
   ```bash
   PRODUCTION_WSS_URL=wss://mi-servidor.railway.app/ws npm run build:bookmarklet:prod
   ```
2. El archivo `apps/quest-bridge/dist/build-master-vr-connect.bookmarklet.txt` contiene el bookmarklet listo
3. Copiar el contenido y crear el favorito en el Quest Browser
4. Al ejecutarlo, el bridge conecta **directamente** a `wss://mi-servidor.railway.app/ws` sin pedir IP

### Opción B: Bookmarklet genérico + configuración manual

1. Build sin `PRODUCTION_WSS_URL` (o dejar vacío en Setup)
2. En el Quest, al ejecutar el bookmarklet, pedirá: "Servidor Build Master VR (IP:puerto)"
3. Introducir: `mi-servidor.railway.app` (sin protocolo ni puerto)
4. El bridge construirá `wss://mi-servidor.railway.app/ws`

### Opción C: Configurar desde la página /setup en Vercel

1. Abrir `https://build-master-vr.vercel.app/setup`
2. En sección "Producción (Vercel)" ingresar la URL WSS
3. Generar bookmarklet y copiarlo

---

## 7. Variables de Entorno Resumen

### Para Vercel (Controller)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `VITE_WS_URL` | Sí | URL WSS del servidor persistente |

### Para Build Local / CI

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `PRODUCTION_WSS_URL` | Sí | URL WSS para inyectar en bookmarklet (esbuild) |
| `VITE_WS_URL` | Sí | URL WSS para el controlador (Vite) |

### Para Servidor WebSocket (Producción - Railway)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `PORT` | No (Railway la provee) | Puerto HTTP (Railway termina TLS en el edge) |
| `NODE_ENV` | Sí | `production` para desactivar HTTPS local y certs self-signed |
| `ALLOWED_ORIGINS` | Recomendada | Lista de orígenes permitidos separados por coma (ej. `https://build-master-vr.vercel.app,https://showreel.d5render.com`) |

---

## 8. Verificación Post-Deployment

### Checklist

1. **Controller en Vercel carga**
   - Abrir `https://build-master-vr.vercel.app/control`
   - Verificar: "Servidor" pill muestra estado (conectado/desconectado)

2. **WebSocket Server accesible**
   - Verificar que `wss://mi-servidor.railway.app/ws` acepta conexiones
   - Probar con `wscat -c wss://mi-servidor.railway.app/ws`

3. **Bookmarklet funciona en Quest**
   - Abrir tour D5 en Quest Browser
   - Ejecutar favorito "BUILD MASTER VR CONNECT"
   - Ver overlay "BUILD MASTER VR" → "CONECTADO"

4. **Control de escenas**
   - En controlador: crear sesión → copiar código/token
   - En Quest: ingresar código/token si bookmarklet genérico
   - Seleccionar escena en controlador → verificar cambio en Quest

5. **Estados QUEST ONLINE/OFFLINE**
   - Desconectar Quest → controlador muestra "Esperando…"
   - Reconectar → controlador muestra "Conectado"

---

## 9. Limitaciones y Riesgos Conocidos

### Vercel + WebSockets

- **Vercel NO soporta WebSocket servers persistentes**. El servidor WebSocket debe estar en otro proveedor.
- Las Vercel Functions son serverless (stateless, timeout 10s-60s). No aptas para conexiones persistentes.
- Edge Functions tampoco mantienen conexiones WebSocket abiertas.

### Quest Bridge + HTTPS

- El tour D5 se sirve por HTTPS → navegador **bloquea ws://** (mixed content)
- **Obligatorio usar wss://** en producción
- El servidor WebSocket persistente **debe tener TLS válido** (Let's Encrypt, certificado del proveedor)

### Reconexión

- El bridge implementa reconexión exponencial (1s, 2s, 5s, 10s, 20s, 30s)
- El controlador también reconecta automáticamente
- No hay "conexiones zombie": heartbeat cada 30s cierra conexiones muertas

### Sesiones

- Las sesiones se mantienen en memoria del servidor WebSocket
- Si el servidor se reinicia, se pierden las sesiones activas
- El controlador guarda `sessionId`, `code`, `token` en `localStorage` para reanudar

### CORS

- Servidor configurado con `Access-Control-Allow-Origin: *` (desarrollo)
- En producción, restringir a dominios conocidos:
  - `https://build-master-vr.vercel.app`
  - `https://showreel.d5render.com` (origen del tour D5)

---

## 10. Próximos Pasos para Desplegar

1. **Crear servidor WebSocket persistente en Railway**
   - Deploy `apps/server` (monorepo root, build: `npm run build:server`, start: `npm run start --workspace apps/server`)
   - Variables: `NODE_ENV=production`, `ALLOWED_ORIGINS=https://build-master-vr.vercel.app,https://showreel.d5render.com`
   - Obtener URL WSS pública (ej. `wss://mi-app.railway.app/ws`)

2. **Configurar variables en Vercel**
   - `VITE_WS_URL = wss://mi-app.railway.app/ws`

3. **Deploy en Vercel**
   - Push a rama principal → auto-deploy
   - Verificar build exitoso

4. **Generar bookmarklet de producción**
   ```bash
   PRODUCTION_WSS_URL=wss://mi-app.railway.app/ws npm run build:bookmarklet:prod
   ```
   - Copiar `apps/quest-bridge/dist/build-master-vr-connect.bookmarklet.txt`
   - Crear favorito en Quest Browser

5. **Probar flujo completo**
   - Abrir controlador en Vercel
   - Abrir tour D5 en Quest
   - Ejecutar bookmarklet
   - Crear sesión → controlar escenas

---

## 11. Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Build producción (requiere PRODUCTION_WSS_URL y VITE_WS_URL)
PRODUCTION_WSS_URL=wss://xxx.railway.app/ws VITE_WS_URL=wss://xxx.railway.app/ws npm run build:prod

# Solo build controller para Vercel
VITE_WS_URL=wss://xxx.railway.app/ws npm run build:controller

# Solo build bookmarklet con WSS de producción
PRODUCTION_WSS_URL=wss://xxx.railway.app/ws npm run build:bookmarklet:prod

# Solo build server para Railway
npm run build:server

# Tests
npm run test

# Lint
npm run lint

# Typecheck
npm run typecheck

# Formatear
npm run format
```

---

## 12. Estructura de Archivos Relevantes para Deployment

```
├── vercel.json                    # Configuración Vercel (controller)
├── package.json                   # Scripts de build:prod, build:bookmarklet:prod
├── apps/
│   ├── controller/
│   │   ├── src/lib/ws.ts          # Hook WS: usa VITE_WS_URL o auto-detect
│   │   ├── src/pages/SetupPage.tsx # UI para generar bookmarklet con WSS prod
│   │   └── vite.config.ts         # Vite config
│   ├── quest-bridge/
│   │   ├── src/bridge.ts          # resolveWsUrl() usa process.env.PRODUCTION_WSS_URL
│   │   └── scripts/build-bookmarklet.mjs # Inyecta PRODUCTION_WSS_URL via esbuild define
│   └── server/
│       ├── src/index.ts           # Entry point servidor persistente (HTTP solo en prod)
│       ├── src/config.ts          # IS_PRODUCTION, ALLOWED_ORIGINS
│       └── tsup.config.ts         # Build config (Node.js, CJS)
└── DEPLOYMENT.md                  # Este archivo
```