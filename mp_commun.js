/*
  © 2026 Gérard GARCIA — Tous droits réservés.
  Reproduction, modification ou réutilisation interdite sans autorisation écrite de l'auteur.
  Voir le fichier LICENCE.
*/
// ============================================================
//  MATCH POSTAL — fonctions communes (v1.0 — 09/10/2026)
//  Utilisé par mp_inscription.html, mp_saisie.html, mp_admin.html, mp_classement.html
//  Données Firebase : matchPostal/<saison>/
//     settings               : { titre, ouvert, dateLimite, saisieOuverte, periode }
//     inscrits/<id>          : { nom, prenom, licence, club, disc ('P'|'C'|'PC'), cat (para-tir), ts }
//     contacts/<id>          : { email, tel }                         (admin seulement)
//     scores/<id>/<1|2|3>    : { s (0-600 entier), statut ('attente'|'valide'|'refuse'),
//                                par ('tireur'|'admin'), motif, ts }
//     preuves/<id>/<1|2|3>   : { img (photo JPEG compressée, data URL), ts }   (admin seulement)
// ============================================================
const MP = {
  VERSION: 'v1.0 — 09/10/2026',
  SAISON_DEFAUT: '2026-2027',
  NB_MATCHES: 3,
  MAX: 600,
  DISC: { P: 'Pistolet 10 m', C: 'Carabine 10 m', PC: 'Para-tir Carabine 10 m' },
  DISC_COURT: { P: 'Pistolet', C: 'Carabine', PC: 'Para-tir cara.' },
  ORDRE: ['P', 'C', 'PC'],
  FINALE: { P: 20, C: 10, PC: 4 },        // qualifiés pour la finale
  PETITE: { P: 20, C: 10, PC: 0 },        // tirés au sort pour la petite finale (pas de para-tir)
  STATUT: { attente: 'À valider', valide: 'Validé', refuse: 'Refusé' },

  saison() {
    const p = new URLSearchParams(location.search).get('s');
    return (p || this.SAISON_DEFAUT).replace(/[.#$\[\]\/]/g, '');
  },
  base() { return 'matchPostal/' + this.saison(); },

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  norm(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); },
  licNorm(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); },

  // Score saisi → entier 0..600, ou null si invalide (pas de dixièmes)
  parseScore(v) {
    const t = String(v == null ? '' : v).trim();
    if (!/^\d{1,3}$/.test(t)) return null;
    const n = parseInt(t, 10);
    return n >= 0 && n <= this.MAX ? n : null;
  },

  // Classement d'une discipline : seuls les scores VALIDÉS comptent.
  // Classé = 3 matches validés. Départage : total, puis meilleur match, puis 2e meilleur, puis 3e.
  classement(inscrits, scores, disc) {
    const lignes = [];
    Object.entries(inscrits || {}).forEach(([id, i]) => {
      if (i.disc !== disc) return;
      const sc = (scores && scores[id]) || {};
      const m = [];
      for (let k = 1; k <= this.NB_MATCHES; k++) {
        const x = sc[k];
        m.push(x && x.statut === 'valide' && typeof x.s === 'number' ? x.s : null);
      }
      const valides = m.filter(v => v !== null);
      const tri = valides.slice().sort((a, b) => b - a);
      lignes.push({
        id, i, m, nb: valides.length, complet: valides.length === this.NB_MATCHES,
        total: valides.reduce((a, b) => a + b, 0), tri
      });
    });
    const cmp = (a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      for (let k = 0; k < this.NB_MATCHES; k++) { const d = (b.tri[k] || 0) - (a.tri[k] || 0); if (d) return d; }
      return 0;
    };
    const classes = lignes.filter(l => l.complet).sort(cmp);
    classes.forEach((l, n) => { l.rang = (n > 0 && cmp(classes[n - 1], l) === 0) ? classes[n - 1].rang : n + 1; });
    classes.forEach(l => { l.finale = l.rang <= this.FINALE[disc]; });
    const nonClasses = lignes.filter(l => !l.complet)
      .sort((a, b) => b.nb - a.nb || b.total - a.total || a.i.nom.localeCompare(b.i.nom));
    return { classes, nonClasses };
  },

  // Photo → JPEG compressé (côté le plus long ≤ maxPx) en data URL, pour rester léger dans la base
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
