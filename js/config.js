/* =====================================================
   ACF EL COET - Único archivo que hay que tocar para los avisos

   onesignalAppId:
     1. Crea una cuenta gratis en https://onesignal.com
     2. Settings → Push & In-App → Web → activa la web con la URL
        https://acfelcoet.github.io/acf-el-coet/  y tipo "Custom Code"
     3. Settings → Keys & IDs → copia el "OneSignal App ID" aquí.

   entorn:
     "produccio" en la web real, "prova" en /copia/. Sirve para enviar
     un aviso SOLO a los dispositivos de prueba desde el panel.
   ===================================================== */
window.ACF_CONFIG = {
  onesignalAppId: "a93f8d73-1229-4a32-aea6-bc525e771e41",
  entorn: "produccio"
};
