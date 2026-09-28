/*
  © 2026 Gérard GARCIA — Tous droits réservés.
  Reproduction, modification ou réutilisation interdite sans autorisation écrite de l'auteur.
  Voir le fichier LICENCE.
*/
// ============================================================
//  12 H PAR ÉQUIPES — fonctions communes (v1.1 — 27/09/2026)
//  Utilisé par e12_inscription.html, e12_saisie.html, e12_classement.html
//  Données Firebase : clubs/<clubKey>/<code compétition>/e12
//     settings : { postes, matchs, parTireur, coups, distance, date, ouvert, alterne }
//     count    : nombre d'équipes inscrites (réservation anti sur-booking)
//     teams/<id> : { nom, disc ('P'|'C'), club, poste, ts,
//                    a:{nom,prenom,licence,club,cat}, b:{...},
//                    m:{ 1:{t:'a'|'b', s:score, x:mouches}, … 6:{…} } }
// ============================================================
const E12 = {
  VERSION: 'v1.1 — 27/09/2026',
  DEFAULTS: { postes: 17, matchs: 6, parTireur: 3, coups: 40, distance: '10 m', date: '', ouvert: true, alterne: true },
  CATS: ["Poussin Fille", "Poussin Garçon", "Benjamin Fille", "Benjamin Garçon", "Minime Fille", "Minime Garçon",
    "Cadet Fille", "Cadet Garçon", "Junior Fille", "Junior Garçon", "Dame 1", "Dame 2", "Dame 3", "Senior 1", "Senior 2", "Senior 3",
    "HP P1", "HP P1/P2", "HP P3", "HP P4", "HP P5", "HP R1/R2", "HP R3", "HP R4", "HP R5", "HP R6", "HP R7/R8", "HP R9",
    "HP VIS", "HP VIP", "HP F5", "HP F10", "HP F12", "HP F13", "Loisir"],

  settings(s) { return Object.assign({}, this.DEFAULTS, s || {}); },
  // Pistolet : points entiers (max 10 par coup) — Carabine : au dixième (max 10,9 par coup)
  isDec(d) { return d === 'C'; },
  maxScore(d, st) { return Math.round(st.coups * (d === 'C' ? 10.9 : 10) * 10) / 10; },
  // Tour de rôle imposé : tireur 1 sur les matches impairs, tireur 2 sur les pairs
  fixedShooter(k) { return k % 2 === 1 ? 'a' : 'b'; },
  discName(d) { return d === 'C' ? 'Carabine' : 'Pistolet'; },
  discLabel(d, st) { return this.discName(d) + (st && st.distance ? ' ' + st.distance : ''); },

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  // "98,5" → 98.5 ; vide → null
  num(v) {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? null : n;
  },
  fmt(n, dec) {
    if (n === null || n === undefined) return '';
    return (dec ? n.toFixed(1) : String(Math.round(n))).replace('.', ',');
  },
  person(p) { return p ? ((p.nom || '').toUpperCase() + ' ' + (p.prenom || '')).trim() : ''; },
  teamName(t) {
    if (t.nom && t.nom.trim()) return t.nom.trim();
    return [t.a && t.a.nom, t.b && t.b.nom].filter(Boolean).map(s => s.toUpperCase()).join(' / ') || 'Équipe';
  },

  // Matches saisis (avec un score) d'une équipe, triés par numéro
  matches(team, st) {
    const out = [];
    const m = team.m || {};
    for (let k = 1; k <= st.matchs; k++) {
      const r = m[k];
      if (r && r.s !== undefined && r.s !== null && r.s !== '') out.push({ k, t: r.t, s: Number(r.s), x: Number(r.x) || 0 });
    }
    return out;
  },
  shooterStats(team, who, st) {
    const list = this.matches(team, st).filter(r => r.t === who);
    return { n: list.length, total: list.reduce((a, r) => a + r.s, 0), mouches: list.reduce((a, r) => a + r.x, 0), list };
  },
  // Nombre de matches attribués à un tireur (score saisi ou non)
  assigned(team, who, st, exceptK) {
    const m = team.m || {};
    let n = 0;
    for (let k = 1; k <= st.matchs; k++) if (k !== exceptK && m[k] && m[k].t === who) n++;
    return n;
  },
  teamStats(team, st) {
    const list = this.matches(team, st);
    return { n: list.length, total: list.reduce((a, r) => a + r.s, 0), mouches: list.reduce((a, r) => a + r.x, 0), list };
  },
  hasDecimals(teams, st) {
    return Object.values(teams || {}).some(t => this.matches(t, st).some(r => !Number.isInteger(r.s)));
  },

  // Tri : total décroissant, puis mouches décroissant ; égalité parfaite = même rang.
  // Les lignes sans aucun match saisi restent en bas, sans rang.
  rank(rows) {
    rows.sort((a, b) => (b.n > 0) - (a.n > 0) || b.total - a.total || b.mouches - a.mouches || a.label.localeCompare(b.label));
    let rank = 0, prev = null;
    rows.forEach((r, i) => {
      if (r.n === 0) { r.rank = null; return; }
      if (!prev || prev.total !== r.total || prev.mouches !== r.mouches) rank = i + 1;
      r.rank = rank;
      r.exaequo = false;
      if (prev && prev.rank === rank) { r.exaequo = true; prev.exaequo = true; }
      prev = r;
    });
    return rows;
  },

  teamRows(teams, st, disc) {
    return this.rank(Object.entries(teams || {}).filter(([, t]) => t.disc === disc).map(([id, t]) => {
      const s = this.teamStats(t, st);
      return Object.assign({ id, team: t, label: this.teamName(t) }, s,
        { a: this.shooterStats(t, 'a', st), b: this.shooterStats(t, 'b', st) });
    }));
  },
  indivRows(teams, st, disc) {
    const rows = [];
    Object.entries(teams || {}).filter(([, t]) => t.disc === disc).forEach(([id, t]) => {
      ['a', 'b'].forEach(w => {
        const p = t[w];
        if (!p || !p.nom) return;
        rows.push(Object.assign({ id, who: w, team: t, person: p, label: this.person(p) }, this.shooterStats(t, w, st)));
      });
    });
    return this.rank(rows);
  },

  // Postes : pistolets à gauche à partir du 1, carabines à droite, un poste vide entre les deux
  // s'il reste de la place ; ordre tiré au sort dans chaque groupe.
  drawPostes(teams, st) {
    const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    const ids = Object.keys(teams || {});
    const P = shuffle(ids.filter(id => teams[id].disc !== 'C'));
    const C = shuffle(ids.filter(id => teams[id].disc === 'C'));
    const gap = (P.length && C.length && P.length + C.length < st.postes) ? 1 : 0;
    const res = {};
    P.forEach((id, i) => { res[id] = i + 1; });
    C.forEach((id, i) => { res[id] = P.length + gap + i + 1; });
    return res;
  },

  // Logo personnalisé : logo_<code>.png s'il existe, sinon logo.png
  applyLogo(compId) {
    if (!compId) return;
    const custom = 'logo_' + compId + '.png';
    const test = new Image();
    test.onload = () => document.querySelectorAll('.e12-logo').forEach(img => { img.src = custom; img.style.display = ''; });
    test.src = custom;
  }
};
