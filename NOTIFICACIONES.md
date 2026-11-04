# 🔔 Avisos push - ACF EL COET

Todo el envío lo gestiona **OneSignal**. En el repositorio no hay ninguna
clave, ni base de datos, ni workflows: solo el botón que ve el socio y un
identificador público.

```
móvil del socio  ──Activar avisos──>  OneSignal  ──panel──>  notificación
     (service worker + caché de la PWA)
```

## Configurar (una sola vez, ~5 minutos)

1. Crea una cuenta gratuita en **https://onesignal.com**.
2. **Settings → Push & In-App → Web → New App/Website**:
   - Nombre: `ACF El Coet`
   - Site URL: `https://acfelcoet.github.io/acf-el-coet/`
   - Tipo de integración: **Custom Code** (el resto lo hace el código).
3. **Settings → Keys & IDs** → copia el **OneSignal App ID** (empieza por unos
   dígitos y guiones, no es secreto) y pégalo en `js/config.js`:

```javascript
window.ACF_CONFIG = {
  onesignalAppId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  entorn: "produccio"
};
```

La copia de pruebas (`/copia/`) tiene su propio archivo con
`entorn: "prova"`. Puedes usar el **mismo App ID** en los dos.

4. Publica y abre la web en el móvil → botón **Activar avisos** → Aceptar.

> Mientras siga `REEMPLAZA_CON_TU_APP_ID`, el botón aparece desactivado y
> nadie se suscribe.

## Enviar un aviso

**Desde el panel de OneSignal** (móvil u ordenador): *Messages → New Push* →
escribes título y mensaje → *Send*. Listo. No hay nada que mantener.

Para enviar **solo a los dispositivos de prueba** (los de `/copia/`):
en *Audience* añade el filtro **User Tag** `entorn` = `prova`.

Para abrir una página concreta al tocar el aviso: *Launch URL*, por ejemplo
`https://acfelcoet.github.io/acf-el-coet/programa.html`.

## Reglas que conviene saber

- **iPhone/iPad**: iOS 16.4 o superior y la web **añadida a la pantalla de
  inicio** (Safari → Compartir → Añadir a pantalla de inicio). Es una
  restricción de Apple, no del sitio. Android y ordenador no la tienen.
- HTTPS obligatorio; en modo incógnito no funcionan los avisos.
- Si alguien borra los datos del navegador, deja de recibirlos hasta que
  vuelva a entrar y pulse *Activar avisos* (o active *Auto Resubscribe* en el
  panel).
- El plan gratuito de OneSignal cubre de sobra a una asociación; consulta sus
  límites actuales en su web.

## Si algún día quieres envío automático al publicar

OneSignal tiene una API REST. Bastaría un workflow de GitHub con una clave de
API como secret. No está montado a propósito: el envío manual desde el panel
no se rompe nunca y no hay claves que caduquen.
