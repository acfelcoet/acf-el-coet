# 🔒 Guía de Seguridad - ACF EL COET

## Qué es público y qué es secreto

La web es estática (GitHub Pages): **todo lo que llega al navegador es público**.

| Dato | ¿Secreto? | Dónde va |
|------|-----------|----------|
| `onesignalAppId` | ❌ No | `js/config.js` |
| Lista de suscriptores | ⚠️ Privada | En OneSignal, nunca en el repo |
| Clave de API de OneSignal (solo si un día se automatiza el envío) | ✅ **Sí** | Secretos de GitHub |

No hay claves privadas ni base de datos en el repositorio, así que no hay nada que rotar ni que se pueda filtrar desde el
código.

## Protecciones que hay que mantener

1. **HTTPS**: GitHub Pages lo da por defecto. Sin HTTPS no hay service worker
   ni avisos (excepto en `localhost`).
2. **Nada de claves en el repositorio**: si algún día se usa la API REST de
   OneSignal, la clave va en *Settings → Secrets and variables → Actions*,
   nunca en un archivo.
3. **Cuenta de OneSignal**: activa la verificación en dos pasos y no compartas
   el acceso. Quien entre al panel puede enviar avisos a todos los socios.
4. **Contraseñas y datos personales**: no metas datos personales en las
   notificaciones, porque se ven en la pantalla de bloqueo.
5. **Dominio**: si algún día se usa un dominio propio, actualízalo en OneSignal
   (Site URL) y en los enlaces del panel.

## Sobre los avisos push

- El navegador solo se suscribe; la lista de dispositivos la guarda OneSignal.
- El `onesignalAppId` es público por diseño: sin acceso al panel no se puede
  enviar nada.
- Los avisos llegan solo a quien ha pulsado *Activar avisos* y ha aceptado el
  permiso del navegador.

## Referencias

- [Seguridad en Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [HTTPS en GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site)
- [OneSignal - Web push](https://documentation.onesignal.com/docs/en/web-sdk-setup)
