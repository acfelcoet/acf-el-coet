/* =====================================================
   ACF EL COET - Botó d'avisos (OneSignal)
   -----------------------------------------------------
   No hi ha res a configurar ací: l'App ID està a js/config.js.

   IMPORTANT: el botó MAI es queda bloquejat. Si el sistema d'avisos
   no ha carregat, en tocar-lo es torna a intentar i s'explica el motiu.
   Així ningú es queda amb un botó gris sense saber què passa.
   ===================================================== */
(function () {
  "use strict";

  var cfg = window.ACF_CONFIG || {};
  var contenedor = document.getElementById("notificaciones");
  var estadoEl = document.getElementById("notif-estado");
  var boton = document.getElementById("notif-btn");

  if (!contenedor || !estadoEl || !boton) return;

  var USUARIO = navigator.userAgent || "";
  var ES_MOVIL_APPLE =
    /iPhone|iPad|iPod/.test(USUARIO) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var CONFIGURADO =
    !!cfg.onesignalAppId && !/REEMPLAZA/i.test(cfg.onesignalAppId);

  var os = null;          /* objecte OneSignal ja iniciat */
  var listo = false;      /* OneSignal ha arrancat bé */
  var arrancado = false;  /* ja hem demanat l'arrancada */
  var trabajando = false; /* evita dobles tocs mentre demana permís */
  var cargando = false;   /* estem baixant el SDK */
  var accion = "activar"; /* què fa el botó ara mateix */
  var vigilante = null;   /* temporitzador de seguretat */

  /* ---------- text a la pantalla ---------- */

  function mostrar(texto) {
    contenedor.hidden = false;
    estadoEl.textContent = texto;
    console.log("Avisos:", texto);
  }

  function mostrarHTML(html) {
    contenedor.hidden = false;
    estadoEl.innerHTML = html;
    console.log("Avisos: instruccions a la pantalla");
  }

  function botonTexto(texto, nuevaAccion) {
    accion = nuevaAccion || "activar";
    boton.hidden = false;
    boton.textContent = texto;
    boton.disabled = false; /* sempre es pot tocar */
  }

  /* Línia xicoteta amb l'estat real, per a poder-ho explicar a la junta. */
  var detalleEl = document.createElement("div");
  detalleEl.className = "notif-detalle";
  detalleEl.setAttribute("translate", "no");
  contenedor.appendChild(detalleEl);

  function pintarDetalle() {
    var partes = [];
    partes.push(ES_MOVIL_APPLE ? "iPhone/iPad" : "ordinador");
    if (ES_MOVIL_APPLE) {
      var v = versionIOS();
      partes.push("iOS " + (v === null ? "?" : String(v)));
    }
    partes.push(esAppInstalada() ? "app instal·lada" : "pestanya");
    partes.push(listo || os ? "sistema carregat" : "sistema no carregat");
    detalleEl.textContent = partes.join(" · ");
  }

  /* ---------- detecció del dispositiu ---------- */

  function versionIOS() {
    var m = USUARIO.match(/OS (\d+)_(\d+)/);
    return m ? parseFloat(m[1] + "." + m[2]) : null;
  }

  function esAppInstalada() {
    if (window.navigator.standalone === true) return true;
    if (!window.matchMedia) return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches
    );
  }

  function permisoDenegado() {
    try {
      return (
        typeof Notification !== "undefined" && Notification.permission === "denied"
      );
    } catch (e) {
      return false;
    }
  }

  function suscrito() {
    try {
      return !!os && os.User.PushSubscription.optedIn === true;
    } catch (e) {
      return false;
    }
  }

  function textoError(e) {
    if (!e) return "";
    var t = "";
    try {
      t = String(e.message || e.name || e);
    } catch (x) {
      t = "";
    }
    if (t.length > 140) t = t.slice(0, 140) + "…";
    return t;
  }

  /* ---------- ajuda i instruccions ---------- */

  function ayuda() {
    if (ES_MOVIL_APPLE && !esAppInstalada()) {
      mostrarHTML(
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
          "5. Baixa fins ací baix, toca <strong>Activar avisos</strong> i després <strong>Permetre</strong>."
      );
      botonTexto("Ho entenc", "ayuda");
      pintarDetalle();
      return;
    }

    if (ES_MOVIL_APPLE) {
      var v = versionIOS();
      if (v !== null && v < 16.4) {
        mostrarHTML(
          "Cal <strong>iOS 16.4 o posterior</strong> per a rebre avisos. Actualitza el mòbil a " +
            "<strong>Ajustos → General → Actualització de programari</strong>."
        );
        botonTexto("Torna-ho a provar", "reintentar");
        pintarDetalle();
        return;
      }
    }

    if (permisoDenegado()) {
      mostrarHTML(
        "Els avisos estan <strong>bloquejats</strong> en aquest dispositiu. Per a tornar a permetre'ls:" +
          "<br><br>" +
          "1. Tanca aquesta web." +
          "<br>" +
          "2. Obri <strong>Ajustos</strong> del mòbil." +
          "<br>" +
          "3. Ves a <strong>Notificacions → El Coet</strong> i activa <strong>Permetre notificacions</strong>." +
          "<br>" +
          "4. Torna a obrir la web des de la icona i toca <strong>Activar avisos</strong>."
      );
      botonTexto("Torna-ho a provar", "reintentar");
      pintarDetalle();
      return;
    }

    mostrar(
      "No s'ha pogut preparar el sistema d'avisos. Torna-ho a provar d'ací a un moment."
    );
    botonTexto("Torna-ho a provar", "reintentar");
    pintarDetalle();
  }

  /* ---------- estat normal, amb OneSignal ja carregat ---------- */

  function pintar() {
    if (!listo) return;

    if (permisoDenegado()) {
      mostrar(
        "Els avisos estan bloquejats en aquest dispositiu. Toca el botó per a vore com desbloquejar-los."
      );
      botonTexto("Com desbloquejar", "ayuda");
      pintarDetalle();
      return;
    }

    if (suscrito()) {
      mostrar("Avisos activats en aquest dispositiu.");
      botonTexto("Desactivar avisos", "desactivar");
    } else {
      mostrar(
        "Activa els avisos per a rebre un missatge quan hi haja canvis a la web."
      );
      botonTexto("Activar avisos", "activar");
    }
    pintarDetalle();
  }

  function activar() {
    if (trabajando) return;
    if (!os) {
      ayuda();
      return;
    }
    trabajando = true;
    mostrar("Demanant permís…");
    botonTexto("Espera un moment…", "activar");

    os.Notifications.requestPermission()
      .then(function (permis) {
        if (!permis) {
          trabajando = false;
          pintar();
          if (!permisoDenegado()) {
            mostrar("No s'ha concedit el permís per a les notificacions.");
            botonTexto("Torna-ho a provar", "activar");
          }
          return;
        }
        return os.User.PushSubscription.optIn()
          .then(function () {
            if (!cfg.entorn) return null;
            return os.User.addTag("entorn", String(cfg.entorn)).catch(function () {
              return null;
            });
          })
          .then(function () {
            trabajando = false;
            pintar();
            if (suscrito()) {
              mostrar("Avisos activats. Us avisarem de les novetats.");
            }
            /* A l'iPhone la subscripció tarda un moment a registrar-se. */
            setTimeout(pintar, 4000);
          });
      })
      .catch(function (error) {
        trabajando = false;
        console.error("Avisos: error activant", error);
        var detalle = textoError(error);
        mostrar(
          "No s'han pogut activar els avisos." + (detalle ? " (" + detalle + ")" : "")
        );
        botonTexto("Torna-ho a provar", "activar");
        pintarDetalle();
      });
  }

  function desactivar() {
    if (trabajando || !os) return;
    trabajando = true;
    botonTexto("Espera un moment…", "desactivar");

    os.User.PushSubscription.optOut()
      .then(function () {
        trabajando = false;
        pintar();
        mostrar("Avisos desactivats. No rebràs cap notificació.");
      })
      .catch(function (error) {
        trabajando = false;
        console.error("Avisos: error desactivant", error);
        pintar();
      });
  }

  /* ---------- arrancada d'OneSignal ---------- */

  function cargarSDK() {
    if (window.OneSignal || cargando) return;
    cargando = true;
    var s = document.createElement("script");
    s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    s.async = true;
    s.onerror = function () {
      cargando = false;
      console.warn("Avisos: no s'ha pogut baixar el SDK de OneSignal");
      sinSDK(
        "El navegador no ha pogut descarregar el sistema d'avisos. Pot ser un bloquejador de contingut o la connexió."
      );
    };
    document.head.appendChild(s);
  }

  function sinSDK(motivo) {
    clearTimeout(vigilante);
    mostrar((motivo ? motivo + " " : "") + "Toca el botó per a tornar-ho a provar.");
    botonTexto("Torna-ho a provar", "reintentar");
    pintarDetalle();
  }

  function iniciar(OneSignal) {
    os = OneSignal;
    clearTimeout(vigilante);

    OneSignal.init({
      appId: cfg.onesignalAppId,
      serviceWorkerPath: new URL("service-worker.js", location.href).pathname,
      serviceWorkerParam: { scope: new URL("./", location.href).pathname },
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: false },
      promptOptions: { slidedown: { enabled: false } }
    })
      .then(function () {
        if (!cfg.entorn) return null;
        return OneSignal.User.addTag("entorn", String(cfg.entorn)).catch(function () {
          return null;
        });
      })
      .then(function () {
        listo = true;
        if (
          OneSignal.Notifications &&
          typeof OneSignal.Notifications.isPushSupported === "function" &&
          !OneSignal.Notifications.isPushSupported()
        ) {
          mostrar("Aquest navegador no permet avisos push.");
          botonTexto("Més informació", "ayuda");
          pintarDetalle();
          return;
        }
        pintar();
      })
      .catch(function (error) {
        console.error("Avisos: OneSignal no s'ha pogut iniciar", error);
        var detalle = textoError(error);
        mostrar(
          "No s'ha pogut preparar el sistema d'avisos." +
            (detalle ? " (" + detalle + ")" : "")
        );
        botonTexto("Torna-ho a provar", "reintentar");
        pintarDetalle();
      });
  }

  function arrancar() {
    if (arrancado) {
      if (!listo) cargarSDK();
      return;
    }
    arrancado = true;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function (OneSignal) {
      iniciar(OneSignal);
    });

    clearTimeout(vigilante);
    vigilante = setTimeout(function () {
      if (!listo) {
        sinSDK(
          "El sistema d'avisos no ha carregat. Pot ser un bloquejador de contingut o la connexió."
        );
      }
    }, 12000);
  }

  /* ---------- clic del botó ---------- */

  boton.addEventListener("click", function () {
    console.log("Avisos: clic al botó (acció " + accion + ")");

    if (accion === "desactivar") return desactivar();
    if (accion === "ayuda") return ayuda();
    if (accion === "reintentar") {
      listo = false;
      mostrar("Carregant el sistema d'avisos…");
      botonTexto("Espera un moment…", "reintentar");
      cargarSDK();
      arrancar();
      clearTimeout(vigilante);
      vigilante = setTimeout(function () {
        if (!listo) {
          sinSDK("El sistema d'avisos continua sense carregar.");
        }
      }, 12000);
      return;
    }
    if (!listo) {
      mostrar("Preparant els avisos…");
      arrancar();
      return;
    }
    activar();
  });

  /* ---------- engegada de la pàgina ---------- */

  pintarDetalle();

  if (!CONFIGURADO) {
    mostrar("Els avisos encara no estan configurats. Aviseu a la junta.");
    botonTexto("Avisos no configurats", "ayuda");
    return;
  }

  /* 1. iPhone/iPad en una pestanya: cal afegir la web a la pantalla d'inici. */
  if (ES_MOVIL_APPLE && !esAppInstalada()) {
    ayuda();
    return;
  }

  /* 2. iOS massa antic. */
  if (ES_MOVIL_APPLE) {
    var v = versionIOS();
    if (v !== null && v < 16.4) {
      ayuda();
      return;
    }
  }

  /* 3. Navegador sense cap suport. */
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    mostrar("Aquest navegador no permet avisos.");
    botonTexto("Més informació", "ayuda");
    return;
  }

  mostrar("Preparant els avisos…");
  botonTexto("Activar avisos", "activar");
  arrancar();
})();
