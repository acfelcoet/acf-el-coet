# 🔒 Guía de Seguridad - ACF EL COET

## Qué es público y qué es secreto

La web es estática (GitHub Pages): **todo lo que llega al navegador es público**.
Por eso hay que distinguir dos cosas:

| Dato | ¿Secreto? | Dónde va |
|------|-----------|----------|
| `apiKey`, `projectId`, `appId`, `messagingSenderId` | ❌ No | `js/firebase-config.js` |
| `vapidKey` (clave pública de Web Push) | ❌ No | `js/firebase-config.js` |
| **Clave de servicio** (`service account .json`) | ✅ **Sí** | Secretos de GitHub |
| Tokens de dispositivo (`fcmTokens`) | ⚠️ Privados | Firestore (nadie los lee) |

`apiKey` de Firebase **no es una contraseña**: solo identifica el proyecto.
Si se filtra no da acceso a datos por sí sola; lo que protege los datos son
las reglas de Firestore y las restricciones de la clave. Cualquier intento de
"esconderla" en una web estática es inútil, porque el navegador la necesita.

## Reglas de la protección

1. **Reglas de Firestore** (`firestore.rules`)
   - `fcmTokens`: se puede crear/actualizar el propio token, **nunca leer
     ni listar**. Así nadie obtiene la lista de dispositivos.
   - Todo lo demás está cerrado.
2. **Clave de servicio fuera del repositorio**
   - Vive solo en *Settings → Secrets and variables → Actions*.
   - `.gitignore` bloquea los nombres habituales (`*service-account*.json`,
     `serviceAccount*.json`, `config.local.json`).
3. **Restringir la clave de API** (recomendado)
   - Google Cloud Console → *APIs y servicios* → *Credenciales* → la clave
     del navegador → *Restricciones de aplicación*: sitios web
     `acfelcoet.github.io/*` y tu dominio si lo hubiera.
   - *Restricciones de API*: solo las que uses
     (Firebase Cloud Messaging API, Cloud Firestore API).
4. **Dominios autorizados** en Firebase Authentication.
5. **HTTPS**: GitHub Pages lo da por defecto. Sin HTTPS no hay service
   worker ni push (excepto en `localhost`).
6. **Si algo se filtra**: rota la clave en Firebase Console, borra el secret
   antiguo en GitHub y vuelve a crearlo.

## Sobre los avisos push

- El navegador solo **escribe** su token; la lectura está prohibida por reglas.
- El envío lo hace GitHub Actions con la clave de servicio, que se salta las
  reglas. Nunca se envía la clave al navegador.
- Cualquiera puede registrar un token (la web es pública). El riesgo se limita
  a dispositivos falsos que consumen cuota de envío; si ocurre, revisa la
  colección en la consola y borra documentos sospechosos.
- El aviso incluye solo el título y el texto que tú escribes: no metas datos
  personales en las notificaciones, porque se muestran en la pantalla de
  bloqueo.

## Referencias

- [Reglas de Firestore](https://firebase.google.com/docs/rules)
- [Seguridad en FCM](https://firebase.google.com/docs/cloud-messaging/security)
- [HTTPS en GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site)
