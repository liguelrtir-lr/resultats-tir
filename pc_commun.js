/*
  © 2026 Gérard GARCIA — Tous droits réservés.
  Reproduction, modification ou réutilisation interdite sans autorisation écrite de l'auteur.
  Voir le fichier LICENCE.
*/
// ============================================================
//  CHALLENGE « LES PETITS CANONS » — fonctions communes (v1.0 — 15/10/2026)
//  Écoles de tir : Poussins, Benjamins, Minimes — Pistolet 10 m et Carabine 10 m
//  2 matches de 40 coups — Pistolet en points entiers (/400), Carabine au dixième (/436,0)
//  Utilisé par pc_club.html, pc_admin.html, pc_classement.html
//  Données Firebase : petitsCanons/<saison>/
//     settings               : { titre, ouvert, saisieOuverte, dateLimite, periode, clubsNum{num:nom} }
//     clubs/<numClub>        : { club, resp, h (empreinte du code d'accès), ts }
//     contacts/<numClub>     : { email, tel }                                     (admin seulement)
//     inscrits/<id>          : { nom, prenom, licence, sexe ('G'|'F'), cat ('PO'|'BE'|'MI'), disc ('P'|'C'), numClub, club, ts }
//     scores/<id>/<1|2>      : { s (nombre), statut ('attente'|'valide'|'refuse'), par ('club'|'admin'), motif, note, ts }
//     preuves/<id>/<1|2>     : { img (photo JPEG compressée), ts }               (admin seulement)
// ============================================================
const PC = {
  VERSION: 'v1.0 — 15/10/2026',
  SAISON_DEFAUT: '2026-2027',
  NB_MATCHES: 2,
  COUPS: 40,
  MAX: { P: 400, C: 436 },
  DIXIEME: { P: false, C: true },
  DISC: { P: '100 - Pistolet 10m', C: '104 - Carabine 10m' },
  DISC_COURT: { P: 'Pistolet', C: 'Carabine' },
  ORDRE: ['P', 'C'],
  CAT: { PO: 'Poussins', BE: 'Benjamins', MI: 'Minimes' },
  CAT1: { PO: 'Poussin', BE: 'Benjamin', MI: 'Minime' },
  ORDRE_CAT: ['PO', 'BE', 'MI'],
  SEXE: { G: 'Garçons', F: 'Filles' },
  SEXE1: { G: 'Garçon', F: 'Fille' },
  ORDRE_SEXE: ['G', 'F'],
  STATUT: { attente: 'À valider', valide: 'Validé', refuse: 'Refusé' },

  saison() {
    const p = new URLSearchParams(location.search).get('s');
    return (p || this.SAISON_DEFAUT).replace(/[.#$\[\]\/]/g, '');
  },
  base() { return 'petitsCanons/' + this.saison(); },

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  norm(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); },
  licNorm(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); },

  // Libellé d'un classement : « Benjamins Filles — 104 - Carabine 10m »
  groupe(disc, cat, sexe) { return this.CAT[cat] + ' ' + this.SEXE[sexe] + ' — ' + this.DISC[disc]; },

  // Score saisi → nombre valide, ou null. Pistolet : entier 0..400. Carabine : 0..436,0 avec au plus 1 décimale (virgule acceptée).
  parseScore(v, disc) {
    const t = String(v == null ? '' : v).trim().replace(',', '.');
    const re = this.DIXIEME[disc] ? /^\d{1,3}(\.\d)?$/ : /^\d{1,3}$/;
    if (!re.test(t)) return null;
    const n = Math.round(parseFloat(t) * 10) / 10;
    return n >= 0 && n <= this.MAX[disc] ? n : null;
  },
  fmt(n, disc) {
    if (n == null || n === '') return '';
    return this.DIXIEME[disc] ? Number(n).toFixed(1).replace('.', ',') : String(Math.round(n));
  },
  aideScore(disc) {
    return this.DIXIEME[disc] ? 'sur 436,0 — avec le dixième (ex : 385,4)' : 'sur 400 — points entiers (ex : 352)';
  },

  // Empreinte du code d'accès d'un club (SHA-256 de « numClub:code »)
  async empreinte(numClub, code) {
    const data = new TextEncoder().encode('petitsCanons:' + numClub + ':' + String(code).trim());
    const h = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Classement d'un groupe (discipline + catégorie + sexe) : seuls les scores VALIDÉS comptent.
  // Classé = 2 matches validés. Départage : total, puis meilleur match.
  classement(inscrits, scores, disc, cat, sexe) {
    const lignes = [];
    Object.entries(inscrits || {}).forEach(([id, i]) => {
      if (i.disc !== disc || i.cat !== cat || i.sexe !== sexe) return;
      const sc = (scores && scores[id]) || {};
      const m = [];
      for (let k = 1; k <= this.NB_MATCHES; k++) {
        const x = sc[k];
        m.push(x && x.statut === 'valide' && typeof x.s === 'number' ? x.s : null);
      }
      const valides = m.filter(v => v !== null);
      lignes.push({
        id, i, m, nb: valides.length, complet: valides.length === this.NB_MATCHES,
        total: Math.round(valides.reduce((a, b) => a + b, 0) * 10) / 10,
        tri: valides.slice().sort((a, b) => b - a)
      });
    });
    const cmp = (a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      for (let k = 0; k < this.NB_MATCHES; k++) { const d = (b.tri[k] || 0) - (a.tri[k] || 0); if (d) return d; }
      return 0;
    };
    const classes = lignes.filter(l => l.complet).sort(cmp);
    classes.forEach((l, n) => { l.rang = (n > 0 && cmp(classes[n - 1], l) === 0) ? classes[n - 1].rang : n + 1; });
    const nonClasses = lignes.filter(l => !l.complet)
      .sort((a, b) => b.nb - a.nb || b.total - a.total || a.i.nom.localeCompare(b.i.nom, 'fr'));
    return { classes, nonClasses };
  },

  // Photo → JPEG compressé (côté le plus long ≤ maxPx) en data URL
  compresserPhoto(file, maxPx = 1400, qualite = 0.72) {
    return new Promise((ok, ko) => {
      const lecteur = new FileReader();
      lecteur.onerror = () => ko(new Error('Lecture de la photo impossible'));
      lecteur.onload = () => {
        const img = new Image();
        img.onerror = () => ko(new Error('Format de photo non reconnu (utilisez JPEG ou PNG)'));
        img.onload = () => {
          const r = Math.min(1, maxPx / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', qualite));
        };
        img.src = lecteur.result;
      };
      lecteur.readAsDataURL(file);
    });
  },

  dateFr(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};
