// ============================================================
//  CONFIGURATION DU SITE — le SEUL fichier à adapter pour un club
// ============================================================
const CONFIG = {
  // 1) Nom affiché dans les titres, l'en-tête et la barre latérale
  clubName: "LIGUE LR",

  // 1bis) Sous-titre affiché sous le titre de la saisie (optionnel)
  subtitle: "Ligue Languedoc-Roussillon",

  // 2) Identifiant technique = dossier des compétitions dans Firebase.
  //    SANS espaces ni accents (lettres, chiffres, _). Ne plus changer une fois des compétitions créées.
  clubKey: "LIGUE_LR",

  // 3) Adresse du site sur GitHub Pages (sert à fabriquer les QR codes)
  githubBase: "https://liguelrtir-lr.github.io/resultats-tir",

  // 4) Clés Firebase — à copier depuis la console Firebase :
  //    Paramètres du projet ⚙️ → Général → Vos applications → Configuration du SDK
  firebase: {
    apiKey: "AIzaSyAvfMRtRrhh_e-27xHlwIx9c5DIdUQm6HM",
    authDomain: "resultats-tir-ligue-lr.firebaseapp.com",
    databaseURL: "https://resultats-tir-ligue-lr-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "resultats-tir-ligue-lr",
    storageBucket: "resultats-tir-ligue-lr.firebasestorage.app",
    appId: "1:468808300974:web:563a14cc4477c10b28303f"
  }
};
