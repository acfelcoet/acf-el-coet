# 🔒 Guía de Seguridad - ACF EL COET

## ⚠️ Problema de Seguridad Identificado

Las credenciales de Firebase **NO deben estar** en el código HTML/JavaScript. Aunque parezcan "secretas", son **públicas** en cualquier PWA.

### ❌ Lo que estaba mal:
```javascript
// ¡NUNCA hagas esto!
const firebaseConfig = {
  apiKey: "AIzaSyBaSntwFmwCAylPt1qSKGRP9uvAbcTn6AI",
  projectId: "acfelcoet-d1f84",
  // ... más credenciales expuestas
};
```

### ✅ Lo que está bien ahora:

## Opción 1: Servidor Backend (Recomendado)

Tu servidor backend inyecta la configuración de forma segura:

```javascript
// El frontend SOLO carga la config desde el servidor
fetch('/api/firebase-config')
  .then(res => res.json())
  .then(firebaseConfig => {
    firebase.initializeApp(firebaseConfig);
  });
```

**Backend (Node.js + Express ejemplo):**
```javascript
app.get('/api/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    vapidKey: process.env.FIREBASE_VAPID_KEY
  });
});
```

## Opción 2: Variables de Entorno + Build (Para GitHub Pages)

Usa un build tool como Vite, Webpack o Create React App:

**`.env.local` (no subir a Git):**
```
VITE_FIREBASE_API_KEY=AIzaSyBaSntwFmwCAylPt1qSKGRP9uvAbcTn6AI
VITE_FIREBASE_PROJECT_ID=acfelcoet-d1f84
...
```

**`.gitignore` (asegurate de tenerlo):**
```
.env.local
.env
config.json
```

**En JavaScript:**
```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  ...
};
```

## Opción 3: Usando Firebase Hosting + Rules

Si usas **Firebase Hosting**, protege tus datos con **Firestore Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo lectura autenticada
    match /datos/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## 🛡️ Recomendaciones Importantes

1. **Nunca subas archivos .env o config.json a Git**
   - Añade a `.gitignore`

2. **Limita permisos en Firebase Console**
   - Usa autenticación mínima necesaria
   - Configura reglas de Firestore/Realtime Database

3. **Monitores la actividad**
   - Activa Cloud Audit Logs en Google Cloud Console
   - Recibe alertas si el API key se usa de forma sospechosa

4. **Regenera credenciales si las expones**
   - Ve a Firebase Console → Settings → Service Accounts
   - Elimina la antigua y crea una nueva

5. **Para el VAPID Key (Push Notifications)**
   - Aunque es menos crítico, también debería estar en backend
   - El apiKey sí es sensible y puede permitir elimetes de BD

## 📋 Checklist antes de producción

- [ ] Credenciales NO hardcodeadas en HTML/JS
- [ ] `.gitignore` contiene `.env*` y `config.json`
- [ ] Backend inyecta configuración de Firebase
- [ ] Firebase Rules están configuradas correctamente
- [ ] Tokens FCM se guardan en backend, no en localStorage
- [ ] HTTPS activado (GitHub Pages lo tiene por defecto)
- [ ] Service Worker valida solicitudes

## 🔗 Referencias

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules)
- [OWASP - Sensitive Data Exposure](https://owasp.org/www-project-top-ten/)
- [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site)
