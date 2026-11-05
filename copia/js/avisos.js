/* =====================================================
   ACF EL COET - Botó d'avisos (OneSignal)
   -----------------------------------------------------
   No hi ha res a configurar ací: l'App ID està a js/config.js.

   Nota sobre iPhone/iPad: Apple només permet avisos push si la web
   s'ha afegit a la pantalla d'inici (iOS 16.4 o posterior) i s'obri
   des d'eixa icona. Ací es detecta el cas i s'expliquen els passos.
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

  var USUARIO = navigator.userAgent || "";
  var ES_MOVIL_APPLE =
    /iPhone|iPad|iPod/.test(USUARIO) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  var os = null;
  var accion = "activar";

  function estado(texto, esError) {
    contenedor.hidden = false;
    if (estadoEl) {
      estadoEl.innerHTML = "";
      estadoEl.textContent = texto;
    }
    if (esError) console.warn("Avisos:", texto);
    else console.log("Avisos:", texto);
  }

  function estadoHTML(html) {
    contenedor.hidden = false;
    if (estadoEl) estadoEl.innerHTML = html;
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

  /* Versió d'iOS (null si no es pot saber). */
  function versionIOS() {
    var m = USUARIO.match(/OS (\d+)_(\d+)/);
    return m ? parseFloat(m[1] + "." + m[2]) : null;
  }

  /* La web s'està veient com a aplicació (pantalla d'inici) o en una pestanya? */
  function esAppInstalada() {
    if (window.navigator.standalone === true) return true;
    if (!window.matchMedia) return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches
    );
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

  function instruccionesIPhone() {
    contenedor.hidden = false;
    if (boton) {
      boton.disabled = true;
      boton.textContent = "Com activar-ho";
    }
    estadoHTML(
      "Per a rebre avisos a l'iPhone o a l'iPad cal tindre la web a la pantalla d'inici:" +
        "<br><br>" +
        "1. Obri aquesta web amb <strong>Safari</strong>." +
        "<br>" +
        "2. Toca <strong>Compartir</strong> (el quadre amb la fletxa cap amunt)." +
        "<br>" +
        "3. Tria <strong>Afegir a la pantalla d'inici</strong> i guarda." +
        "<br>" +
        "4. Tanca Safari i obri <strong>El Coet</strong> des de la icona nova." +
        "<br>" +
        "5. Ací baix toca <strong>Activar avisos</strong> i després <strong>Permetre</strong>."
    );
    console.log("Avisos: a l'iPhone cal obrir la web des de la pantalla d'inici.");
  }

  function pintar() {
    if (!CONFIGURADO) return;

    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      deshabilitar(
        "Els avisos estan bloquejats en aquest dispositiu. Activa'ls a Ajustos → Notificacions → El Coet, o des dels ajustos del lloc al navegador."
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
        if (typeof Notification === "undefined") return;
        if (Notification.permission === "granted") {
          pintar();
          if (estaSuscrito()) estado("Avisos activats. Us avisarem de les novetats.");
          /* A l'iPhone la subscripció tarda un moment a registrar-se. */
          setTimeout(pintar, 3000);
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

  /* 1. iPhone/iPad en una pestanya del navegador: no es pot demanar permís. */
  if (ES_MOVIL_APPLE && !esAppInstalada()) {
    instruccionesIPhone();
    return;
  }

  /* 2. iOS massa antic. */
  if (ES_MOVIL_APPLE) {
    var v = versionIOS();
    if (v !== null && v < 16.4) {
      deshabilitar(
        "Cal iOS 16.4 o posterior per a rebre avisos. Actualitza el mòbil a Ajustos → General → Actualització de programari."
      );
      return;
    }
  }

  /* 3. Navegador sense suport. */
  if (!SOPORTADO) {
    deshabilitar("Aquest navegador no permet avisos.");
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
      .then(function () {
        if (
          OneSignal.Notifications &&
          OneSignal.Notifications.isPushSupported &&
          !OneSignal.Notifications.isPushSupported()
        ) {
          deshabilitar("Aquest navegador no permet avisos push.");
          return;
        }
        pintar();
      })
      .catch(function (error) {
        console.error("Avisos: OneSignal no s'ha pogut iniciar", error);
        var detalle = error && (error.message || error.name) ? String(error.message || error.name) : "";
        if (detalle.length > 140) detalle = detalle.slice(0, 140) + "…";
        deshabilitar(
          "No s'ha pogut preparar el sistema d'avisos." +
            (detalle ? " (" + detalle + ")" : "")
        );
      });
  });
})();
