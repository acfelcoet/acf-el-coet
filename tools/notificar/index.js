#!/usr/bin/env node
"use strict";

/* =====================================================
   ACF EL COET - Enviament d'avisos push
   -----------------------------------------------------
   Uso manual:
     FIREBASE_SERVICE_ACCOUNT='{"..."}' node tools/notificar/index.js
   Con texto propio:
     TITULO="..." MENSAJE="..." URL_DESTINO="programa.html" node ...
   Prueba sin enviar nada:
     DRY_RUN=1 node tools/notificar/index.js

   En GitHub Actions lo lanza .github/workflows/notificar-cambios.yml.
   ===================================================== */

const { execFileSync } = require("node:child_process");
const admin = require("firebase-admin");

const SITE_URL = (process.env.SITE_URL || "https://acfelcoet.github.io/acf-el-coet/").replace(/\/?$/, "/");
const DRY_RUN = process.env.DRY_RUN === "1";
const MAX_TOKENS = 5000;
const LOTE = 500;

/* Colección de Firestore de la que se leen los dispositivos.
   fcmTokens = web oficial · fcmTokensProva = còpia de proves. */
const COLECCION = (process.env.COLECCIO || "fcmTokens").trim();

/* Envío dirigido: un token exacto o un filtro por navegador. */
const TOKEN_UNICO = (process.env.FCM_TOKEN || "").trim();
const FILTRO_UA = (process.env.FILTRO_UA || "").trim().toLowerCase();

/* Archivo modificado -> nombre visible en el aviso. */
const PAGINAS = {
  "index.html": "la página d'inici",
  "programa.html": "el Programa de Festes",
  "torns.html": "els Torns de Treball",
  "encuestas.html": "les Enquestes",
  "pasa.html": "el Recorregut del Passà del Quadret",
  "junta.html": "la Junta General",
  "galeria.html": "la Galeria",
  "informacion.html": "la informació de l'associació",
  "css/estilos.css": "el disseny de la web",
  "js/push.js": "els avisos de la web",
  "manifest.json": "l'aplicació instal·lable"
};

function archivosCambiados() {
  try {
    return execFileSync("git", ["diff", "--name-only", "HEAD^", "HEAD"], {
      encoding: "utf8"
    })
      .split("\n")
      .map((linea) => linea.trim())
      .filter(Boolean);
  } catch (error) {
    console.log("Avisos: no s'han pogut obtindre els canvis del commit:", error.message);
    return [];
  }
}

function listar(items) {
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " i " + items[items.length - 1];
}

function construirMensaje(archivos) {
  const etiquetas = [...new Set(archivos.map((a) => PAGINAS[a]).filter(Boolean))];

  let cuerpo;
  if (etiquetas.length === 0) {
    cuerpo = "Hi ha novetats a la web de l'associació. Entra per a vore-les.";
  } else {
    cuerpo = "S'ha actualitzat " + listar(etiquetas) + ".";
  }

  const titulo = (process.env.TITULO || "").trim();
  const mensaje = (process.env.MENSAJE || "").trim();
  const destino = (process.env.URL_DESTINO || "").trim();

  return {
    titulo: titulo || "ACF EL COET",
    cuerpo: mensaje || cuerpo,
    url: destino ? new URL(destino, SITE_URL).toString() : SITE_URL
  };
}

function leerServiceAccount() {
  const crudo = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!crudo) return null;

  let datos;
  try {
    datos = JSON.parse(crudo);
  } catch (error) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT no es un JSON válido (¿se han escapado mal los saltos de línea?)."
    );
  }
  if (!datos.project_id || !datos.private_key || !datos.client_email) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT no parece una clave de servicio: faltan project_id, private_key o client_email."
    );
  }
  if (typeof datos.private_key === "string" && datos.private_key.includes("\\n")) {
    datos.private_key = datos.private_key.replace(/\\n/g, "\n");
  }
  return datos;
}

function codigosNoRegistrado(codigo) {
  return (
    codigo === "messaging/registration-token-not-registered" ||
    codigo === "messaging/invalid-registration-token"
  );
}

async function main() {
  const mensaje = construirMensaje(archivosCambiados());
  console.log("Aviso a enviar:");
  console.log("  Título: " + mensaje.titulo);
  console.log("  Texto : " + mensaje.cuerpo);
  console.log("  Enlace: " + mensaje.url);

  if (DRY_RUN) {
    console.log("DRY_RUN=1: no se envía nada.");
    return;
  }

  let serviceAccount;
  try {
    serviceAccount = leerServiceAccount();
  } catch (error) {
    console.error("::error::" + error.message);
    process.exitCode = 1;
    return;
  }

  if (!serviceAccount) {
    console.log(
      "::warning::El secret FIREBASE_SERVICE_ACCOUNT no está configurado, así que no se envían avisos. " +
        "Consulta NOTIFICACIONES.md para activarlos."
    );
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

  const db = admin.firestore();

  let tokens;
  if (TOKEN_UNICO) {
    tokens = [TOKEN_UNICO];
    console.log("Envío dirigido a un único dispositivo (FCM_TOKEN).");
  } else {
    console.log("Colección: " + COLECCION + (FILTRO_UA ? " · filtro: " + FILTRO_UA : ""));
    const instantanea = await db.collection(COLECCION).limit(MAX_TOKENS).get();
    tokens = instantanea.docs
      .filter((doc) => {
        if (!FILTRO_UA) return true;
        return String(doc.get("ua") || "").toLowerCase().includes(FILTRO_UA);
      })
      .map((doc) => (doc.get("token") ? String(doc.get("token")) : doc.id))
      .filter(Boolean);
  }

  if (tokens.length === 0) {
    console.log("No hay dispositivos suscritos: no se envía nada.");
    return;
  }

  console.log("Dispositivos destinatarios: " + tokens.length);

  const aviso = {
    notification: { title: mensaje.titulo, body: mensaje.cuerpo },
    webpush: {
      notification: {
        title: mensaje.titulo,
        body: mensaje.cuerpo,
        icon: SITE_URL + "icons/icon-192.png",
        badge: SITE_URL + "icons/icon-192.png",
        tag: "acf-el-coet",
        lang: "ca"
      },
      fcmOptions: { link: mensaje.url }
    },
    data: { url: mensaje.url, tag: "acf-el-coet" }
  };

  let enviados = 0;
  let fallidos = 0;
  const caducados = [];
  const erroresReales = [];

  for (let i = 0; i < tokens.length; i += LOTE) {
    const lote = tokens.slice(i, i + LOTE);
    const resultado = await admin.messaging().sendEachForMulticast({
      tokens: lote,
      ...aviso
    });

    enviados += resultado.successCount;
    fallidos += resultado.failureCount;

    resultado.responses.forEach((respuesta, indice) => {
      if (respuesta.success) return;
      const codigo = (respuesta.error && respuesta.error.code) || "";
      if (codigosNoRegistrado(codigo)) caducados.push(lote[indice]);
      else erroresReales.push(codigo || "desconegut");
    });
  }

  console.log("Enviados: " + enviados + " · Fallidos: " + fallidos);

  if (caducados.length > 0) {
    console.log("Borrando " + caducados.length + " tokens caducados…");
    const limpieza = db.batch();
    caducados.forEach((token) => limpieza.delete(db.collection(COLECCION).doc(token)));
    await limpieza.commit();
  }

  if (erroresReales.length > 0) {
    const resumen = [...new Set(erroresReales)].join(", ");
    console.error("::error::Errores al enviar avisos: " + resumen);
    process.exitCode = 1;
    return;
  }

  if (enviados === 0 && fallidos > 0) {
    console.error("::error::No se ha podido entregar el aviso a ningún dispositivo.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("::error::Fallo enviando avisos: " + (error && error.message ? error.message : error));
  process.exitCode = 1;
});
