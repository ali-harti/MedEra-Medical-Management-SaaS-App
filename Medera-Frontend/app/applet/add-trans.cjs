const fs = require("fs");
let code = fs.readFileSync("src/i18n/translations.ts", "utf8");

const enVideo = `
    appt: {
      type: { video: "Video Consultation", inperson: "In Person" },
      choose: { title: "How would you like to meet your doctor?", sub: "Choose your preferred consultation format" },
      inperson: { title: "In Person", desc: "Visit the clinic at your scheduled appointment time" },
      video: { title: "Video Consultation", desc: "Consult your doctor from home via secure video call", secure: "Encrypted · HIPAA Compliant", linkSent: "A video link will be sent to your email before your appointment" }
    },
    video: {
      join: "Join Video Call", joinNow: "Doctor is waiting — Join Now", start: "Start Video Call", end: "End Call", copy: "Copy Patient Link", copied: "Link copied!", live: "LIVE",
      prejoin: { title: "You're about to join a video consultation", with: "with", mic: "Microphone", cam: "Camera", allowed: "Allowed", denied: "Denied — click to fix", test: "Test Audio & Video", join: "Join Now →" },
      notif: { soon: "Your video appointment starts in 15 minutes", waiting: "is waiting in the video call — Join now", ended: "Your video consultation has ended" },
      session: { duration: "Duration", started: "Started", ended: "Ended" },
      endConfirm: "End this video call?", endConfirmSub: "This will disconnect both participants."
    },`;

const frVideo = `
    appt: {
      type: { video: "Consultation vidéo", inperson: "En cabinet" },
      choose: { title: "Comment souhaitez-vous rencontrer votre médecin ?", sub: "Choisissez votre format de consultation préféré" },
      inperson: { title: "En cabinet", desc: "Rendez-vous au cabinet à l'heure de votre rendez-vous" },
      video: { title: "Consultation vidéo", desc: "Consultez votre médecin depuis chez vous par appel vidéo sécurisé", secure: "Chiffré · Conforme HIPAA", linkSent: "Un lien vidéo vous sera envoyé par e-mail avant votre rendez-vous" }
    },
    video: {
      join: "Rejoindre l'appel vidéo", joinNow: "Le médecin vous attend — Rejoindre", start: "Démarrer l'appel vidéo", end: "Terminer l'appel", copy: "Copier le lien patient", copied: "Lien copié !", live: "EN DIRECT",
      prejoin: { title: "Vous êtes sur le point de rejoindre une consultation vidéo", with: "avec", mic: "Microphone", cam: "Caméra", allowed: "Autorisé", denied: "Refusé — cliquez pour corriger", test: "Tester audio et vidéo", join: "Rejoindre →" },
      notif: { soon: "Votre rendez-vous vidéo commence dans 15 minutes", waiting: "vous attend dans l'appel vidéo — Rejoindre", ended: "Votre consultation vidéo est terminée" },
      session: { duration: "Durée", started: "Démarré", ended: "Terminé" },
      endConfirm: "Terminer cet appel vidéo ?", endConfirmSub: "Cela déconnectera les deux participants."
    },`;

code = code.replace(/en: \{/, "en: {\n" + enVideo);

if (code.includes("const fr = (translations as any).fr;")) {
    code = code.replace(
      "// Insert Landing Nav",
      "// Insert Landing Nav\n  Object.assign(fr, {" + frVideo.slice(0, -1) + "});\n"
    );
}

fs.writeFileSync("src/i18n/translations.ts", code);
console.log("Translations for video added");
