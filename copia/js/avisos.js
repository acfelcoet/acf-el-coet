/* =====================================================
   ACF EL COET - Botón de avisos (OneSignal)
   -----------------------------------------------------
   No hay nada que configurar aquí: el App ID está en js/config.js.
   ===================================================== */
(function () {
  "use strict";

  var cfg = window.ACF_CONFIG || {};
  var contenedor = document.getElementById("notificaciones");
  var estadoEl = document.getElementById("notif-estado");
  var boton = document.getElementById("notif-btn");

  if (!contenedor) return;

  var SOPORTADO =
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window;
  var CONFIGURADO =
    !!cfg.onesignalAppId && !/REEMPLAZA/i.test(cfg.onesignalAppId);

  var os = null;
  var accion = "activar";

  function estado(texto, esError) {
    contenedor.hidden = false;
    if (estadoEl) estadoEl.textContent = texto;
    if (esError) console.warn("Avisos:", texto);
    else console.log("Avisos:", texto);
  }

  function botonAccion(nuevaAccion, texto) {
    accion = nuevaAccion;
    if (!boton) return;
    boton.textContent = texto;
    boton.disabled = false;
  }

  function deshabilitar(texto) {
    estado(texto, true);
    if (boton) boton.disabled = true;
  }

  function estaSuscrito() {
    try {
      return (
        Notification.permission === "granted" &&
        os.User.PushSubscription.optedIn === true
      );
    } catch (e) {
      return false;
    }
  }

  function pintar() {
    if (!CONFIGURADO) return;

    if (Notification.permission === "denied") {
      deshabilitar(
        "Els avisos estan bloquejats en aquest navegador. Activa'ls des dels ajustos del lloc."
      );
      return;
    }

    if (estaSuscrito()) {
      botonAccion("desactivar", "Desactivar avisos");
      estado("Avisos activats en aquest dispositiu.");
    } else {
      botonAccion("activar", "Activar avisos");
      estado(
        "Activa els avisos per a rebre un missatge quan hi haja canvis a la web."
      );
    }
  }

  function activar() {
    if (!os) return;
    if (boton) boton.disabled = true;
    estado("Demanant permís…");

    os.Notifications.requestPermission()
      .then(function (permis) {
        if (!permis) {
          deshabilitar("No s'ha concedit el permís per a les notificacions.");
          return null;
        }
        return os.User.PushSubscription.optIn();
      })
      .then(function (resultado) {
        if (resultado === null) return null;
        if (cfg.entorn) {
          return os.User.addTag("entorn", String(cfg.entorn)).catch(function () {});
        }
        return null;
      })
      .then(function () {
        if (Notification.permission === "granted") {
          pintar();
          if (estaSuscrito()) estado("Avisos activats. Us avisarem de les novetats.");
        }
      })
      .catch(function (error) {
        console.error("Avisos: error activant", error);
        pintar();
        deshabilitar("No s'han pogut activar els avisos. Torneu-ho a provar.");
      });
  }

  function desactivar() {
    if (!os) return;
    if (boton) boton.disabled = true;

    os.User.PushSubscription.optOut()
      .then(function () {
        botonAccion("activar", "Activar avisos");
        estado("Avisos desactivats. No rebràs cap notificació.");
      })
      .catch(function (error) {
        console.error("Avisos: error desactivant", error);
        pintar();
      });
  }

  if (boton) {
    boton.addEventListener("click", function () {
      if (accion === "desactivar") desactivar();
      else activar();
    });
  }

  if (!CONFIGURADO) {
    deshabilitar("Els avisos encara no estan configurats. Aviseu a la junta.");
    return;
  }

  if (!SOPORTADO) {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      deshabilitar(
        "Per rebre avisos a l'iPhone o iPad, afig la web a la pantalla d'inici i obri-la des d'allí."
      );
    } else {
      deshabilitar("Aquest navegador no permet avisos.");
    }
    return;
  }

  if (boton) boton.textContent = "Activar avisos";
  estado("Preparant els avisos…");

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(function (OneSignal) {
    os = OneSignal;
    OneSignal.init({
      appId: cfg.onesignalAppId,
      serviceWorkerPath: new URL("service-worker.js", location.href).pathname,
      serviceWorkerParam: { scope: new URL("./", location.href).pathname },
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: false },
      promptOptions: { slidedown: { enabled: false } }
    })
      .then(function () {
        if (cfg.entorn) {
          return OneSignal.User.addTag("entorn", String(cfg.entorn)).catch(function () {});
        }
        return null;
      })
      .then(pintar)
      .catch(function (error) {
        console.error("Avisos: OneSignal no s'ha pogut iniciar", error);
        deshabilitar("No s'ha pogut preparar el sistema d'avisos.");
      });
  });
})();
