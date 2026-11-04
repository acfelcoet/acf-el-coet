/* =====================================================
   ACF EL COET - Service Worker únic
   -----------------------------------------------------
   Este archivo es el ÚNICO service worker del sitio:
   - Guarla en caché los archivos de la PWA (uso sin conexión).
   - Recibe las notificaciones push de Firebase Cloud Messaging.

   Debe seguir en la raíz del sitio, ya que Firebase usa
   este nombre por convención y el ámbito de control ("scope")
   tiene que cubrir todas las páginas.
   ===================================================== */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
importScripts("js/firebase-config.js");

var CACHE = "acf-el-coet-v4";
var ICONO = "icons/icon-192.png";

var APP_SHELL = [
  "./",
  "index.html",
  "programa.html",
  "torns.html",
  "encuestas.html",
  "pasa.html",
  "junta.html",
  "galeria.html",
  "informacion.html",
  "css/estilos.css",
  "js/firebase-config.js",
  "js/push.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "img/logo.png"
];

/* ===== PWA: instalación y caché ===== */

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      /* allSettled: si un archivo falta, la instalación no falla. */
      return Promise.allSettled(
        APP_SHELL.map(function (url) {
          return cache.add(new Request(url, { cache: "reload" }));
        })
      );
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (nombres) {
        return Promise.all(
          nombres.map(function (nombre) {
            return nombre === CACHE ? null : caches.delete(nombre);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", function (event) {
  var peticion = event.request;
  if (peticion.method !== "GET") return;

  var url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/firebase-messaging-sw.js") !== -1) return;

  /* Navegación: red primero, caché si no hay conexión. */
  if (peticion.mode === "navigate") {
    event.respondWith(
      fetch(peticion)
        .then(function (respuesta) {
          var copia = respuesta.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(peticion, copia);
          });
          return respuesta;
        })
        .catch(function () {
          return caches.match(peticion).then(function (enCache) {
            return enCache || caches.match("index.html");
          });
        })
    );
    return;
  }

  /* Estáticos: caché primero, actualizando en segundo plano. */
  event.respondWith(
    caches.match(peticion).then(function (enCache) {
      var red = fetch(peticion)
        .then(function (respuesta) {
          if (respuesta && respuesta.status === 200) {
            var copia = respuesta.clone();
            caches.open(CACHE).then(function (cache) {
              cache.put(peticion, copia);
            });
          }
          return respuesta;
        })
        .catch(function () {
          return enCache;
        });
      return enCache || red;
    })
  );
});

/* ===== Firebase Cloud Messaging ===== */

if (self.FIREBASE_CONFIG && self.FIREBASE_CONFIG.projectId) {
  firebase.initializeApp(self.FIREBASE_CONFIG);
  var messaging = firebase.messaging();

  messaging.onBackgroundMessage(function (payload) {
    /* Si el aviso ya trae bloque "notification", Firebase lo muestra
       solo: mostrarlo otra vez duplicaría la notificación. */
    if (payload.notification && (payload.notification.title || payload.notification.body)) {
      return;
    }

    var datos = payload.data || {};
    var titulo = datos.title || "ACF EL COET";
    var opciones = {
      body: datos.body || "",
      icon: datos.icon || ICONO,
      badge: datos.badge || ICONO,
      tag: datos.tag || "acf-el-coet",
      data: { url: datos.url || "index.html" }
    };

    return self.registration.showNotification(titulo, opciones);
  });
}

/* ===== Clic en la notificación ===== */

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var destino =
    (event.notification.data && event.notification.data.url) || "index.html";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientes) {
        for (var i = 0; i < clientes.length; i++) {
          var cliente = clientes[i];
          if (cliente.url.indexOf(self.registration.scope) !== 0) continue;
          return cliente.focus().then(function (enfocado) {
            if (enfocado.navigate && "navigate" in enfocado) {
              return enfocado.navigate(destino).catch(function () {});
            }
            return enfocado;
          });
        }
        return self.clients.openWindow(destino);
      })
  );
});
