# 🔔 Avisos push - ACF EL COET

Sistema de notificaciones: cuando se publica un cambio en la web, los
dispositivos que han activado los avisos reciben una notificación.

```
GitHub (push a main)
   └─> .github/workflows/notificar-cambios.yml
         └─> tools/notificar/index.js  (firebase-admin)
               ├─ lee los tokens guardados en Firestore (fcmTokens)
               └─> FCM HTTP v1  ──> móvil/PC suscrito
```

El navegador solo **escribe** su token. Nadie puede leer la lista de
dispositivos desde la web (ver `firestore.rules`).

---

## Puesta en marcha (una sola vez)

### 1. Activar Firestore

1. Firebase Console → proyecto **acfelcoet-d1f84**.
2. *Firestore Database* → **Crear base de datos** → modo producción →
   ubicación `europe-west` (o la más cercana).
3. Pestaña **Reglas** → pega el contenido de `firestore.rules` → Publicar.

### 2. Clave de Web Push (VAPID)

1. Firebase Console → ⚙️ *Configuración del proyecto* → **Cloud Messaging**.
2. En *Certificados push web* pulsa **Generar par de claves**.
3. Copia la clave pública en `js/firebase-config.js`:

```javascript
vapidKey: "BEl...tu_clave_publica..."
```

> Mientras siga el texto `REEMPLAZA_CON_TU_VAPID_KEY`, el botón de avisos
> se muestra desactivado y no se registra ningún dispositivo.

### 3. Clave de servicio (para enviar)

1. Firebase Console → ⚙️ *Configuración del proyecto* → **Cuentas de servicio**.
2. **Generar nueva clave privada** → descarga el `.json`.
3. GitHub → repositorio → *Settings* → *Secrets and variables* → *Actions*
   → **New repository secret**:
   - Nombre: `FIREBASE_SERVICE_ACCOUNT`
   - Valor: **todo el contenido del `.json`** (una sola línea, tal cual).

> El `.json` es la llave maestra del proyecto: no lo subas al repositorio
> (`.gitignore` ya bloquea los nombres habituales). Si se filtra, bórralo
> en Firebase Console y genera otro.

### 4. Dominios autorizados (si usas otro dominio)

Firebase Console → *Authentication* → *Settings* → **Dominios autorizados**:
añade `acfelcoet.github.io` (suele añadirse solo) y cualquier dominio propio.

---

## Cómo se envía

**Automático:** cada push a `main` que toque `*.html`, `css/`, `js/`, `img/`,
`icons/` o `manifest.json` envía un aviso deducido de los archivos cambiados
("S'ha actualitzat el Programa de Festes.").

**Manual:** GitHub → *Actions* → **Avisar de canvis en la web** →
*Run workflow* → escribe título y mensaje.

**Desde tu ordenador:**

```bash
FIREBASE_SERVICE_ACCOUNT="$(cat clave-servicio.json)" \
TITULO="Assemblea general" \
MENSAJE="Divendres 26 de juny a les 22:00 h a l'Ateneu" \
URL_DESTINO="junta.html" \
node tools/notificar/index.js
```

Sin enviar nada (comprobar el texto que saldría):

```bash
DRY_RUN=1 node tools/notificar/index.js
```

---

## Comportamiento

- Se envía en lotes de 500 dispositivos (máximo 5.000 por ejecución).
- Los tokens que Firebase marca como caducados se borran de Firestore.
- Si el secret no está configurado, el workflow **no falla**: avisa con un
  `warning` y termina.
- Un mismo cambio no se reenvía: el workflow solo corre con los cambios de
  la web, no con los de `tools/`, `.github/` ni `*.md`.

## Límites de Firebase (plan gratuito)

- Mensajería FCM: sin coste.
- Firestore: 20.000 escrituras/día y 50.000 lecturas/día.
  Cada suscripción gasta 1 escritura; una visita repetida, otra.
