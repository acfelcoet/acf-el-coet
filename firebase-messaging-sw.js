// Service worker para Firebase Cloud Messaging

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Configuración de Firebase (MISMA que en index.html)
firebase.initializeApp({
  apiKey: "AIzaSyBaSntwFmwCAylPt1qSKGRP9uvAbcTn6AI",
  authDomain: "acfelcoet-d1f84.firebaseapp.com",
  projectId: "acfelcoet-d1f84",
  storageBucket: "acfelcoet-d1f84.firebasestorage.app",
  messagingSenderId: "28904173482",
  appId: "1:28904173482:web:1f1f53d0634c97420bc5d3"
});

const messaging = firebase.messaging();

// Notificaciones cuando la app está en segundo plano
messaging.onBackgroundMessage(payload => {
  console.log("Notificación en segundo plano:", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || "icons/icon-192.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
