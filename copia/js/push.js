/* =====================================================
   ACF EL COET - Avisos push (Firebase Cloud Messaging)
   -----------------------------------------------------
   - Registra el service worker (PWA + push).
   - Pide permiso al usuario y guarda el token del
     dispositivo en Firestore (colección "fcmTokens").
   - Si el permiso ya estaba concedido, renueva el token
     en cada visita sin volver a preguntar.
   ===================================================== */
(function () {
  "use strict";

  var cfg = window.FIREBASE_CONFIG || {};
  var contenedor = document.getElementById("notificaciones");
  var estado = document.getElementById("notif-estado");
  var boton = document.getElementById("notif-btn");

  var SOPORTADO =
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window;

  var CONFIGURADO =
    !!cfg.vapidKey && !/REEMPLAZA/i.test(cfg.vapidKey) && !!cfg.projectId;

  var registro = null;
  var messaging = null;
  var db = null;
  var suscrito = false;
  var COLECCION = cfg.coleccioTokens || "fcmTokens";

  var TEXTO_ACTIVAR = "Activar avisos";
  var TEXTO_DESACTIVAR = "Desactivar avisos";

  function mostrar(texto, esError) {
    if (!contenedor) return;
    contenedor.hidden = false;
    if (estado) estado.textContent = texto;
    if (boton) boton.disabled = false;
    console[esError ? "warn" : "log"]("Avisos:", texto);
  }

  function botonActivarComoAccion(accion) {
    if (!boton) return;
    boton.dataset.accion = accion;
    boton.textContent = accion === "desactivar" ? TEXTO_DESACTIVAR : TEXTO_ACTIVAR;
  }

  function guardarToken(token) {
    if (!db || !token) return Promise.resolve();
    return db
      .collection(COLECCION)
      .doc(token)
      .set(
        {
          token: token,
          ua: String(navigator.userAgent || "").slice(0, 250),
          lang: String(navigator.language || "ca").slice(0, 20),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
  }

  function borrarToken(token) {
    if (!db || !token) return Promise.resolve();
    return db.collection(COLECCION).doc(token).delete();
  }

  function pedirToken() {
    return messaging.getToken({
      vapidKey: cfg.vapidKey,
      serviceWorkerRegistration: registro
    });
  }

  /* Muestra el aviso también con la pestaña abierta. */
  function mostrarEnPrimerPlano(payload) {
    if (!registro || !registro.showNotification) return;
    var notificacion = payload.notification || {};
    var datos = payload.data || {};
    if (!notificacion.title && !notificacion.body) return;

    registro.showNotification(notificacion.title || "ACF EL COET", {
      body: notificacion.body || "",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: datos.tag || "acf-el-coet",
      data: {
        url:
          (payload.fcmOptions && payload.fcmOptions.link) ||
          datos.url ||
          "index.html"
      }
    });
  }

  function activar() {
    if (!CONFIGURADO) {
      mostrar(
        "Els avisos encara no estan configurats. Aviseu a la junta.",
        true
      );
      if (boton) boton.disabled = true;
      return Promise.resolve();
    }

    boton && (boton.disabled = true);
    estado && (estado.textContent = "Demanant permís…");

    return Notification.requestPermission()
      .then(function (permiso) {
        if (permiso !== "granted") {
          botonActivarComoAccion("activar");
          mostrar(
            "No s'han pogut activar els avisos: el navegador ha bloquejat les notificacions. Podeu canviar-ho als ajustos del lloc.",
            true
          );
          return null;
        }
        estado && (estado.textContent = "Guardant el dispositiu…");
        return pedirToken();
      })
      .then(function (token) {
        if (!token) return;
        return guardarToken(token).then(function () {
          suscrito = true;
          botonActivarComoAccion("desactivar");
          mostrar("Avisos activats. Us avisarem quan hi haja novetats.");
        });
      })
      .catch(function (error) {
        console.error("Avisos: error activant", error);
        botonActivarComoAccion("activar");
        mostrar(
          "No s'han pogut activar els avisos. Torneu-ho a provar més tard.",
          true
        );
      });
  }

  function desactivar() {
    boton && (boton.disabled = true);
    var token = null;
    return pedirToken()
      .then(function (t) {
        token = t;
        return borrarToken(token);
      })
      .catch(function () {
        /* Si no hay token, no hay nada que borrar. */
      })
      .then(function () {
        return token ? messaging.deleteToken(token) : null;
      })
      .then(function () {
        suscrito = false;
        botonActivarComoAccion("activar");
        mostrar("Avisos desactivats. No rebràs cap notificació.");
      })
      .catch(function (error) {
        console.error("Avisos: error desactivant", error);
        boton && (boton.disabled = false);
        mostrar("No s'han pogut desactivar els avisos.", true);
      });
  }

  function iniciarSdk() {
    if (!window.firebase || !firebase.messaging) return false;
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      messaging = firebase.messaging();
      if (firebase.firestore) db = firebase.firestore();
      messaging.onMessage(mostrarEnPrimerPlano);
      return true;
    } catch (error) {
      console.error("Avisos: Firebase no s'ha pogut iniciar", error);
      return false;
    }
  }

  /* Renueva token en cada visita si el permiso ya está dado. */
  function renovarSiYaSuscrito() {
    if (Notification.permission !== "granted") return;
    pedirToken()
      .then(guardarToken)
      .then(function () {
        suscrito = true;
        botonActivarComoAccion("desactivar");
        mostrar("Avisos activats en este dispositiu.");
      })
      .catch(function (error) {
        console.error("Avisos: no s'ha pogut renovar el token", error);
        botonActivarComoAccion("activar");
        mostrar("No s'ha pogut comprovar la subscripció als avisos.", true);
      });
  }

  if (!contenedor) return;

  if (!SOPORTADO) {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      mostrar(
        "Per rebre avisos a l'iPhone o iPad, afig la web a la pantalla d'inici i obri-la des d'allí."
      );
    } else {
      mostrar("Este navegador no permet avisos.");
    }
    if (boton) boton.disabled = true;
    return;
  }

  if (boton) {
    boton.disabled = true;
    boton.addEventListener("click", function () {
      if (boton.dataset.accion === "desactivar") desactivar();
      else activar();
    });
  }

  navigator.serviceWorker
    .register("firebase-messaging-sw.js", { scope: "./" })
    .then(function (reg) {
      registro = reg;
      if (!iniciarSdk()) {
        mostrar("No s'ha pogut carregar el sistema d'avisos.", true);
        return;
      }
      if (!CONFIGURADO) {
        mostrar("Els avisos encara no estan configurats. Aviseu a la junta.");
        if (boton) boton.disabled = true;
        return;
      }
      renovarSiYaSuscrito();
      if (Notification.permission === "denied") {
        mostrar(
          "Els avisos estan bloquejats en este navegador. Activa'ls des dels ajustos del lloc per a rebre'ls.",
          true
        );
        if (boton) boton.disabled = true;
      } else if (Notification.permission === "default") {
        mostrar(
          "Activa els avisos per rebre un missatge quan hi haja canvis a la web."
        );
        botonActivarComoAccion("activar");
      }
    })
    .catch(function (error) {
      console.error("Avisos: el service worker no s'ha pogut registrar", error);
      mostrar("No s'ha pogut preparar el sistema d'avisos.", true);
    });
})();
