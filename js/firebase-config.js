/* =====================================================
   ACF EL COET - Configuració de Firebase
   -----------------------------------------------------
   Estos valores son identificadores PÚBLICOS del proyecto:
   se envían al navegador de cada visitante, así que no son
   secretos. La seguridad real se configura en la consola de
   Firebase (reglas de Firestore + dominios autorizados) y en
   las restricciones de la API key en Google Cloud.

   Lo único que NO puede estar aquí es la clave de servicio
   (service account), que vive en los secretos de GitHub.

   Pendent: sustituir vapidKey por la clave pública de
   "Web Push certificates" (Firebase → Configuración del
   proyecto → Cloud Messaging → Certificados push web).
   ===================================================== */
self.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBaSntwFmwCAylPt1qSKGRP9uvAbcTn6AI",
  authDomain: "acfelcoet-d1f84.firebaseapp.com",
  projectId: "acfelcoet-d1f84",
  storageBucket: "acfelcoet-d1f84.firebasestorage.app",
  messagingSenderId: "28904173482",
  appId: "1:28904173482:web:1f1f53d0634c97420bc5d3",
  vapidKey: "REEMPLAZA_CON_TU_VAPID_KEY"
};
