const fs = require('fs');
let code = fs.readFileSync('src/i18n/translations.ts', 'utf8');

let enDash = `dashboard: {
        insight: "Here is your practice at a glance. You have {value} appointments scheduled for today.",
        todayApt: "Today\\'s Appointments",
        activePat: "Active Patients",
        pendingCons: "Pending Consultations",
        unpaidInv: "Unpaid Invoices",
        next: "Next:",
        thisMonth: "this month",
        actionNeeded: "Action needed",
        allClear: "All clear",
        reqAttention: "Requires attention",
        allCaughtUp: "All caught up",
        recentPat: "Recent Patients",
        upcomingApt: "Upcoming Appointments",
        viewAll: "View all",
        quickActions: "Quick Actions",
        newPrescription: "New Prescription",
        startConsultation: "Start Consultation",
        patientRecords: "Patient Records",
        online: "online",
        appointments: "Appointments",
        consultations: "Consultations",
      },`;

let frDash = `dashboard: {
        insight: "Voici votre cabinet en un coup d\\'œil. Vous avez {value} rendez-vous prévus aujourd\\'hui.",
        todayApt: "Rendez-vous d\\'aujourd\\'hui",
        activePat: "Patients actifs",
        pendingCons: "Consultations en attente",
        unpaidInv: "Factures impayées",
        next: "Prochain :",
        thisMonth: "ce mois-ci",
        actionNeeded: "Action requise",
        allClear: "Tout est réglé",
        reqAttention: "Nécessite attention",
        allCaughtUp: "À jour",
        recentPat: "Patients récents",
        upcomingApt: "Prochains rendez-vous",
        viewAll: "Voir tout",
        quickActions: "Actions rapides",
        newPrescription: "Nouvelle ordonnance",
        startConsultation: "Démarrer consultation",
        patientRecords: "Dossiers patients",
        online: "en ligne",
        appointments: "Rendez-vous",
        consultations: "Consultations",
      },`;

const enDoctorMatch = /doctorPortal: \{/g;
let firstIdx = -1;
let secondIdx = -1;

let match;
while ((match = enDoctorMatch.exec(code)) !== null) {
  if (firstIdx === -1) {
    firstIdx = match.index;
  } else if (secondIdx === -1) {
    secondIdx = match.index;
  }
}

let pt2 = code.substring(secondIdx).replace('doctorPortal: {', 'doctorPortal: {\n      ' + frDash);
let pt1 = code.substring(0, secondIdx).replace('doctorPortal: {', 'doctorPortal: {\n      ' + enDash);

fs.writeFileSync('src/i18n/translations.ts', pt1 + pt2);
console.log('done');
