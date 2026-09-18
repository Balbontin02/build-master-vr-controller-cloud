# Configuración del Meta Quest 3S

Guía para conectar el Quest 3S al Build Master VR Controller y cargar escenas desde el asesor.

## 1. Requisitos

- Quest 3S con Meta Quest Browser instalado y actualizado.
- Laptop/tablet y Quest en la **misma red LAN/Wi-Fi**.
- El servidor en ejecución (ver `README.md`).

## 2. Aceptar el certificado (una sola vez)

La página del tour D5 es `https://…`, así que Chromium/Quest Browser bloquea `ws://`. Por eso el servidor expone `wss://` en el puerto 3443 con certificado self-signed.

1. En el Quest, abre la URL `https://<IP-del-pc>:3443/`.
2. Verás un aviso de certificado no seguro → toca **Advanced / Continuar de todos modos**.
3. Si la página carga, el certificado queda aceptado y `wss` funcionará.

> IP del PC: mírala en los logs del servidor al arrancar (ej. `http://192.168.1.136:3000/control`). La IP debe ser **estática o reservada en el router** para no tener que repetir el paso.

## 3. Crear el favorito (bookmarklet) en el Quest — una sola vez por Quest

Meta Quest Browser **no ejecuta `javascript:` desde la barra de direcciones**, así que el método fiable es crear un favorito con el código. Esto se hace **una sola vez por Quest** y sirve para todas las sesiones, aunque reinicies el servidor.

1. En la laptop/tablet abre `http://IP:3000/setup`.
2. Deja la sección **Sesión (opcional)** **vacía** → el favorito queda **genérico** (solo incrusta la IP del servidor).
3. Copia el código del bookmarklet (empieza por `javascript:`) con **Copiar bookmarklet**.
4. En el Quest: abre una página cualquiera y agrégala a favoritos (**⋮ → Marcadores → Añadir marcador**).
5. Nómbralo `BUILD MASTER VR CONNECT` y pega el código en el campo **URL**.
6. Si el navegador recorta `javascript:` al pegar, escríbelo tú primero y pega el resto después.
7. Guarda. Si ya existía un favorito anterior, edítalo y reemplaza el código (una sola vez).

> Con el favorito genérico ya no tienes que regenerarlo al cambiar de sesión: al ejecutarlo te pedirá el código y el token por pantalla. Eso sí, si actualizas el código del bridge, actualiza el favorito **una sola vez** con el código nuevo de `/setup`.

## 4. Conectar el Quest a una sesión (cada presentación)

1. En la laptop/tablet abre `http://IP:3000/control` → **Nueva sesión**.
2. Anota el **código** (ej. `ZIMA-8123`) y el **token** (6 caracteres, ej. `8N42AC`; sin caracteres ambiguos).
3. En el Quest, abre el tour D5 en el Quest Browser.
4. Ejecuta el favorito `BUILD MASTER VR CONNECT` (**⋮ → Marcadores**).
5. El bridge te pedirá por pantalla el **código** y el **token** de la sesión → introdúcelos. No importa si escribes minúsculas, espacios o guiones: se normalizan solos (ej. `8n-42ac` funciona).
6. Verás el overlay **BUILD MASTER VR** con estado de conexión: *conectando… → conectado*.
7. En el control, el Quest aparece conectado (`QUEST · dispositivo`).

> Si al introducir el código/token te los vuelve a pedir, significa que no coinciden con una sesión activa: revísalos en el control o crea una sesión nueva.

## 5. Cambiar escenas

1. En el control selecciona una escena (RECEPCIÓN, KHALO-RECÁMARA, …).
2. El Quest ejecuta `krpano.call("loadscene(id)")`; al cargar, el overlay muestra la escena activa y el control recibe la confirmación.

Para probar: cambia de **RECEPCIÓN** a **KHALO-RECÁMARA** y de vuelta.

## 6. Reiniciar el servidor

- Las sesiones viven en la memoria del servidor: al reiniciarlo se pierden.
- No hace falta recrear el favorito: solo crea una **sesión nueva** en el control y, en el Quest, vuelve a ejecutar el favorito introduciendo el **código** y el **token** nuevos.

## 7. Si cambia la IP del servidor

El favorito tiene incrustada la IP con la que se generó: si la IP de la laptop cambia (reinicio del router, nueva red), hay que regenerar el favorito y re-aceptar el certificado. Pasos:

1. Arranca el servidor (`npm start`) y lee la **IP nueva** de los logs (ej. `http://192.168.1.136:3000/control`).
2. En cada Quest, abre `https://IP_NUEVA:3443` y acepta el certificado self-signed (una vez por Quest).
3. En la laptop abre `http://IP_NUEVA:3000/setup`, copia el código `javascript:` nuevo y **reemplaza la URL del favorito** en Quest Browser (sección 2 vacía = favorito genérico).
4. Abre el tour D5, ejecuta el favorito e introduce código + token del control.
5. Si instalaste la PWA desde `https://IP_VIEJA:3443`, desinstálala e instálala de nuevo desde `https://IP_NUEVA:3443/control`.

> Para no repetir esto: asigna una **IP fija o reserva DHCP** a la laptop en el router. Si Windows lo pide, permite Node.js en redes privadas (firewall).

## 8. Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| El overlay se queda en *conectando…* | El Quest no aceptó el certificado, o la IP cambió | Repite el paso 2 y usa la IP actual de los logs |
| `wss` da error en consola | Mixed content bloqueado | Acepta el certificado de `https://IP:3443` antes de ejecutar el bridge |
| Te pide la IP del servidor al ejecutar | El favorito es antiguo (sin servidor incrustado) | Regenera el favorito con el código actual de `/setup` |
| El join se rechaza (token inválido) | El código/token no corresponden a una sesión activa | Crea una sesión nueva en el control y reintroduce el código y el token |
| Te los vuelve a pedir en bucle | El código o el token no coinciden con la sesión activa | Revisa código y token en el control (el token son 6 caracteres) o crea sesión nueva |
| El favorito no pide sesión / no conecta | El favorito tiene una versión antigua del código | Actualiza el favorito con el código nuevo de `/setup` (sección 2 vacía) |
| El control no ve la escena cambiar | El bridge no detectó KRPano | Recarga la página del tour y vuelve a ejecutar el favorito (el bridge espera a `window.krpano`) |
| Tras cortar el Wi-Fi no reconecta | Reconexión automática con backoff | El bridge reintenta solo hasta 30s; si falla, vuelve a ejecutar el favorito |

## 9. Al terminar

- Cierra la sesión en el control (botón **Terminar**) para liberar el código.
- Puedes cerrar el servidor con `Ctrl+C`.