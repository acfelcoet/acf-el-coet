/* =====================================================
   ACF EL COET - Service Worker únic
   -----------------------------------------------------
   - Caché de la PWA (uso sin conexión).
   - Avisos push: se apoya en OneSignal, que gestiona los
     tokens, el envío y las claves VAPID por nosotros.

   NO hay que editar este archivo para cambiar de app de
   OneSignal: eso se hace en js/config.js.
   ===================================================== */

/* SDK d'avisos de OneSignal, allotjat ací mateix (js/onesignal/sw.js).
   Si un dia faltara, es recorre al del CDN. */
try {
  importScripts("js/onesignal/sw.js");
} catch (e) {
  importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
}

var CACHE = "acf-el-coet-v12";
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
  "novetats.html",
  "css/estilos.css",
  "js/config.js",
  "js/avisos.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "img/logo.png"
];

/* ===== Instalación y caché ===== */

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
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
  if (url.pathname.indexOf("/service-worker.js") !== -1) return;

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

/* Solo gestionamos los avisos locales de la página de comprobación:
   los de OneSignal los abre su propio worker. */
self.addEventListener("notificationclick", function (event) {
  if (event.notification.tag !== "prova-acf") return;
  event.notification.close();
  var destino = (event.notification.data && event.notification.data.url) || "index.html";
  event.waitUntil(self.clients.openWindow(destino));
});
