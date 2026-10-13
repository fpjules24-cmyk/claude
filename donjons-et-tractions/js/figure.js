'use strict';
// Donjons & Tractions v2 — rendu du héros fantasy : chibi, armures, ailes, auras, armes géantes
(function (DT) {
  const P = DT.P, D = DT.D;
  const OUT = P.OUT, shade = P.shade, dir = P.dir;
  const D2R = Math.PI / 180;

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a.toFixed(2) + ')';
  }
  const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

  // Tête chibi : disque de 9 px + contour (11 px). HK : échelle des repères de coiffure
  const HF = [], HO = [], HK = 1.2;
  for (let dx = -5; dx <= 5; dx++) for (let dy = -5; dy <= 5; dy++) {
    const d2 = dx * dx + dy * dy;
    if (d2 <= 18) HF.push([dx, dy]); else if (d2 <= 27) HO.push([dx, dy]);
  }

  // Pixels en relief avec contour automatique
  P.Pix.prototype.blob = function (pts, c, oc) {
    const o = oc === undefined ? OUT : oc;
    const R = pts.map((p) => [Math.round(p[0]), Math.round(p[1])]);
    if (o) for (const [x, y] of R) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const k = (x + i) + ',' + (y + j); if (!this.m.has(k)) this.m.set(k, o); }
    for (const [x, y] of R) this.m.set(x + ',' + y, typeof c === 'function' ? c(x, y) : c);
  };

  const AURA = {
    gold: { c: '#ffcd75', s: ['#ffcd75', '#fff3c0', '#ffffff'], v: 0.6 },
    fire: { c: '#ef7d57', s: ['#ffcd75', '#ef7d57', '#ff5f6d'], v: 0.95 },
    frost: { c: '#73eff7', s: ['#f4f4f4', '#73eff7', '#a0e8ff'], v: 0.4 },
    shadow: { c: '#8a4ab0', s: ['#b65cd6', '#5d275d', '#29366f'], v: 0.5 },
    cosmic: { c: '#b65cd6', s: ['#73eff7', '#ff5f6d', '#ffcd75', '#f4f4f4'], v: 0.5 },
    holy: { c: '#fff3c0', s: ['#ffffff', '#ffcd75', '#fff3c0'], v: 0.5 },
    nature: { c: '#a7f070', s: ['#a7f070', '#38b764', '#ffcd75'], v: 0.45 },
    blood: { c: '#ff5f6d', s: ['#ff5f6d', '#b13e53', '#ffcd75'], v: 0.6 },
  };
  // Couleur de lame selon la rareté
  const BLADE = ['#94b0c2', '#c2d3de', '#8cc8ff', '#d9a0f5', '#ffe08a', '#ff8a95'];

  // ---------- Armes (procédurales, orientées selon l'avant-bras) ----------
  function weapon(Pm, grip, d, w, t, glow, sc = 1) {
    const r = w.r || 0;
    const hilt = D.RAR[r] ? D.RAR[r].c : '#94b0c2';
    const metal = BLADE[r], light = shade(metal, 1.3), dark = shade(metal, 0.7);
    const wood = '#8a5a3c', woodD = '#5b3a29';
    const p = [-d[1], d[0]];
    const Q = (k, s) => [grip[0] + d[0] * k * sc + p[0] * s * (sc < 1 ? 0.8 : 1), grip[1] + d[1] * k * sc + p[1] * s * (sc < 1 ? 0.8 : 1)];
    const line = (a, b, wd, c) => { Pm.seg(a, b, wd + 2, OUT); Pm.seg(a, b, wd, c); };
    const fill = (a, b, wd, c) => Pm.seg(a, b, wd, c);
    const disc = (c0, rad, c, oc) => {
      const pts = [];
      for (let x = -Math.ceil(rad); x <= Math.ceil(rad); x++) for (let y = -Math.ceil(rad); y <= Math.ceil(rad); y++) if (x * x + y * y <= rad * rad + 0.5) pts.push([c0[0] + x, c0[1] + y]);
      Pm.blob(pts, c, oc);
    };
    const shine = (a, b) => { if (r >= 3) for (let k = 0; k < 4; k++) glow.push({ p: lerp2(a, b, (k + 0.5) / 4), c: r >= 5 ? '#ff5f6d' : r === 4 ? '#ffcd75' : '#b65cd6' }); };
    switch (w.vis) {
      case 'great': {
        Pm.seg(Q(-3.5, 0), Q(16.5, 0), 6, OUT); Pm.seg(Q(16.5, 0), Q(19, 0), 3, OUT);
        fill(Q(-3, 0), Q(1, 0), 2, woodD);
        line(Q(1, -3.2), Q(1, 3.2), 2, hilt);
        fill(Q(2.5, 0), Q(16, 0), 4, metal);
        fill(Q(16, 0), Q(18.5, 0), 2, metal);
        fill(Q(3, -1.4), Q(15, -1.4), 1, light);
        fill(Q(4, 0.6), Q(14, 0.6), 1, dark);
        Pm.sq(Q(-3.8, 0)[0], Q(-3.8, 0)[1], 2, hilt);
        shine(Q(3, 0), Q(18, 0));
        break;
      }
      case 'sword': {
        Pm.seg(Q(-2.5, 0), Q(12, 0), 5, OUT);
        fill(Q(-2, 0), Q(1, 0), 2, woodD);
        line(Q(1, -2.4), Q(1, 2.4), 1, hilt);
        fill(Q(2, 0), Q(11, 0), 3, metal);
        fill(Q(11, 0), Q(13, 0), 1, metal);
        fill(Q(2.5, -1), Q(10, -1), 1, light);
        shine(Q(2, 0), Q(12, 0));
        break;
      }
      case 'dagger': {
        Pm.seg(Q(-1.5, 0), Q(7, 0), 4, OUT);
        fill(Q(-1, 0), Q(1, 0), 2, woodD);
        line(Q(1, -1.6), Q(1, 1.6), 1, hilt);
        fill(Q(2, 0), Q(6.5, 0), 2, metal);
        fill(Q(2, -0.8), Q(6, -0.8), 1, light);
        shine(Q(2, 0), Q(7, 0));
        break;
      }
      case 'axe': {
        line(Q(-3, 0), Q(13, 0), 2, wood);
        const head = [];
        for (let k = 8; k <= 14; k++) for (let s = 1; s <= 6; s++) { const rr = Math.hypot(k - 11, s - 0.5); if (rr <= 4.2 && s <= 1 + (4.2 - Math.abs(k - 11)) * 1.3) head.push(Q(k, s)); }
        Pm.blob(head, metal);
        fill(Q(8.5, 4.5), Q(13.5, 4.5), 1, light);
        Pm.blob([Q(13, 0), Q(14, 0)], hilt);
        shine(Q(9, 3), Q(13, 5));
        break;
      }
      case 'hammer': {
        line(Q(-2.5, 0), Q(11, 0), 2, wood);
        const head = [];
        for (let k = 10; k <= 14; k++) for (let s = -4; s <= 4; s++) head.push(Q(k, s));
        Pm.blob(head, metal);
        fill(Q(12, -4), Q(12, 4), 1, hilt);
        fill(Q(10, -4), Q(10, 4), 1, light);
        shine(Q(10, -3), Q(14, 3));
        break;
      }
      case 'staff': {
        line(Q(-6, 0), Q(13, 0), 2, wood);
        fill(Q(10, -1.5), Q(13.5, -2.5), 1, '#ffcd75'); fill(Q(10, 1.5), Q(13.5, 2.5), 1, '#ffcd75');
        disc(Q(15.5, 0), 2.4, hilt);
        Pm.set(Math.round(Q(15, -1)[0]), Math.round(Q(15, -1)[1]), '#ffffff');
        glow.push({ p: Q(15.5, 0), c: hilt, big: true });
        break;
      }
      case 'spear': {
        line(Q(-6, 0), Q(15, 0), 2, wood);
        const tip = [];
        for (let k = 15; k <= 20; k++) for (let s = -2; s <= 2; s++) if (Math.abs(s) <= (20 - k) * 0.5 + 0.2) tip.push(Q(k, s));
        Pm.blob(tip, metal);
        Pm.blob([Q(14, 2), Q(13, 3), Q(12, 3.5)], hilt);
        shine(Q(15, 0), Q(20, 0));
        break;
      }
      case 'scythe': {
        line(Q(-4, 0), Q(14, 0), 2, woodD);
        const bl = [];
        for (let k = 0; k <= 10; k++) { const c = Q(14 - k * k * 0.09, -1 - k * 0.95); const wd = k < 3 ? 2 : k < 8 ? 1.5 : 1; bl.push(c); if (wd > 1) bl.push(Q(14 - k * k * 0.09 + 0.8, -1 - k * 0.95)); }
        Pm.blob(bl, metal);
        shine(Q(14, -2), Q(6, -9));
        break;
      }
      case 'flail': {
        line(Q(-2, 0), Q(4, 0), 2, woodD);
        const end = Q(4, 0);
        const sw = Math.sin(t * 4) * 2;
        let prev = end;
        for (let k = 1; k <= 4; k++) { const c = [end[0] + sw * k / 4, end[1] + k * 1.6]; Pm.blob([c], '#94b0c2'); prev = c; }
        const ball = [prev[0], prev[1] + 3];
        disc(ball, 3, metal);
        Pm.blob([[ball[0] - 1, ball[1] - 4], [ball[0], ball[1] - 4], [ball[0] + 1, ball[1] - 4]], dark);
        Pm.set(Math.round(ball[0] - 1), Math.round(ball[1] - 1), light);
        shine(ball, ball);
        break;
      }
      case 'mace': {
        line(Q(-2, 0), Q(9, 0), 2, '#566c86');
        for (const s of [-3, 3]) disc(Q(9, s), 2.4, metal);
        fill(Q(9, -1), Q(9, 1), 2, '#566c86');
        shine(Q(9, -3), Q(9, 3));
        break;
      }
      case 'whip': {
        let prev = grip;
        for (let k = 1; k <= 14; k++) { const c = Q(k, Math.sin(t * 7 + k * 0.6) * (k / 6)); Pm.seg(prev, c, k < 3 ? 2 : 1, k < 3 ? woodD : hilt); prev = c; }
        if (r >= 3) glow.push({ p: prev, c: hilt });
        break;
      }
      case 'fist': default: break;
    }
  }

  // ---------- Ailes ----------
  function wings(Pm, L, at, sh, t, isFar) {
    const type = L.wings;
    const W0 = at(sh, -1.5 + (isFar ? 1.2 : 0), -1.2);
    const fl = Math.sin(t * (type === 'fire' ? 7 : 4.5)) * 9 + (isFar ? -12 : 0);
    const fwd = at([0, 0], 1, 0), up = at([0, 0], 0, 1);
    const ray = (a, rr) => { const s = Math.sin((a + fl) * D2R), c = Math.cos((a + fl) * D2R); return [W0[0] - fwd[0] * s * rr + up[0] * c * rr, W0[1] - fwd[1] * s * rr + up[1] * c * rr]; };
    const sh2 = (c) => (isFar ? shade(c, 0.68) : c);
    const fan = (a0, a1, R, col, wd = 2, outline = OUT) => {
      if (outline) for (let a = a0; a <= a1; a += 3) Pm.seg(W0, ray(a, R(a) + 1), wd, outline);
      for (let a = a0; a <= a1; a += 3) Pm.seg(W0, ray(a, R(a)), wd, typeof col === 'function' ? col(a) : col);
    };
    if (type === 'angel') {
      fan(-15, 115, (a) => 12.5 - Math.abs(a - 35) / 11 + (Math.round(a / 9) % 2 ? 0.8 : 0), sh2('#f4f4f4'));
      fan(-5, 100, (a) => 6 - Math.abs(a - 40) / 25, sh2('#c2d3de'), 2, null);
    } else if (type === 'bat' || type === 'dragon') {
      const mem = L.wingC || (type === 'bat' ? '#5d275d' : '#38b764');
      const bone = type === 'bat' ? '#1a1c2c' : '#1a4a50';
      fan(-5, 112, (a) => 12 - 2.6 * Math.abs(Math.sin((a + 5) * D2R * 3.4)), sh2(mem));
      for (const a of [8, 45, 80, 108]) Pm.seg(W0, ray(a, 12.2), 1, sh2(bone));
      if (type === 'dragon') for (const a of [8, 45, 80]) Pm.blob([ray(a, 13.3)], sh2('#ffcd75'));
    } else if (type === 'fairy') {
      const c = L.wingC || '#a0e8ff';
      fan(-12, 52, (a) => 9.5 - Math.abs(a - 20) / 9, hexA(sh2(c), 0.75), 2, hexA(shade(c, 1.3), 0.9));
      fan(68, 120, (a) => 6.5 - Math.abs(a - 94) / 9, hexA(sh2(c), 0.7), 2, hexA(shade(c, 1.3), 0.9));
    } else if (type === 'fire') {
      const R = (a) => 11.5 + Math.sin(t * 12 + a * 0.35) * 1.3 - Math.abs(a - 40) / 14;
      fan(-12, 118, R, sh2('#b13e53'), 2, null);
      fan(-8, 110, (a) => R(a) * 0.76, sh2('#ef7d57'), 2, null);
      fan(-4, 100, (a) => R(a) * 0.48, sh2('#ffcd75'), 2, null);
    } else if (type === 'mech') {
      for (const [a, rr] of [[0, 11], [25, 12], [50, 11], [75, 9], [100, 7]]) {
        Pm.seg(W0, ray(a, rr), 3, OUT); Pm.seg(W0, ray(a, rr), 1, sh2('#73eff7'));
        Pm.blob([ray(a, rr + 0.8)], sh2('#e05fa8'));
      }
    }
  }

  // ---------- Héros ----------
  function heroPixels(J, L, o) {
    const t = o.time || 0;
    const Pm = new P.Pix();
    const glow = [];
    const up = dir(J.t), fwd = [-up[1], up[0]];
    const at = (c, f, u) => [c[0] + fwd[0] * f + up[0] * u, c[1] + fwd[1] * f + up[1] * u];
    const sh = J.sh, hip = J.hip;
    const hc = at(sh, 0, 6.6);
    const skin = L.skin, top = L.top || '#b13e53', bot = L.bottom || '#333c57';
    const boots = L.boots || L.shoes || '#5b3a29';
    const combat = !!(o.pose && o.pose.combat);
    const wpn = o.weapon === false ? null : (o.weapon || L.weapon || null);
    const bones = !!L.bones;
    const far = 0.7;
    const sleeveU = L.sleeves === 'none' ? skin : top;
    const fore = L.gloves || (L.sleeves === 'long' ? top : skin);
    const hand = L.gloves ? shade(L.gloves, 1.15) : skin;
    const shin = L.pants === 'short' ? skin : bot;
    const limb = (pts, w1, w2, c1, c2, endC, endW, lowC) => {
      Pm.seg(pts[0], pts[1], w1 + 2, OUT); Pm.seg(pts[1], pts[2], w2 + 2, OUT);
      if (endC) Pm.sq(pts[2][0], pts[2][1], endW + 2, OUT);
      Pm.seg(pts[0], pts[1], w1, c1); Pm.seg(pts[1], pts[2], w2, c2);
      if (lowC) Pm.seg(lerp2(pts[1], pts[2], 0.45), pts[2], w2, lowC);
      if (endC) Pm.sq(pts[2][0], pts[2][1], endW, endC);
    };
    const wA = bones ? 1 : 3, wTh = bones ? 1 : 3, wSh = bones ? 1 : 3;

    // ailes, cape, arme dans le dos, queue (derrière tout)
    if (L.wings) { wings(Pm, L, at, sh, t, true); wings(Pm, L, at, sh, t, false); }
    if (L.cape) {
      const A = at(sh, -1.2, 0.4), tA = at(sh, -3, -0.5), tB = at(hip, -4.5, -6.5);
      const N = 12, tips = [];
      for (let k = 0; k <= N; k++) { const b = lerp2(tA, tB, k / N); const w = Math.sin(t * 4 + k * 0.7) * 1.1 * (k / N); tips.push(at(b, -w, 0)); }
      for (const tp of tips) Pm.seg(A, tp, 3, OUT);
      tips.forEach((tp, k) => Pm.seg(A, tp, 2, k > N - 3 ? shade(L.cape, 0.75) : L.cape));
      Pm.seg(A, tips[0], 1, L.top2 && L.top2 !== L.cape ? L.top2 : shade(L.cape, 1.25));
    }
    if (wpn && !combat && wpn.vis && wpn.vis !== 'fist') weapon(Pm, at(sh, -1.2, 4.2), norm(at([0, 0], -0.75, -1)), wpn, t, glow, 0.72);
    if (L.tail) {
      let prev = at(hip, -1.5, -0.5);
      for (let k = 1; k <= 7; k++) { const c = at(hip, -1.5 - k * 1.15, -0.5 - k * 0.55 + Math.sin(t * 4 + k * 0.9) * 0.6 * (k / 7)); Pm.seg(prev, c, 3, OUT); prev = c; }
      prev = at(hip, -1.5, -0.5);
      for (let k = 1; k <= 7; k++) { const c = at(hip, -1.5 - k * 1.15, -0.5 - k * 0.55 + Math.sin(t * 4 + k * 0.9) * 0.6 * (k / 7)); Pm.seg(prev, c, 1, L.tail); prev = c; }
      Pm.blob([prev, at(prev, -1, 0.6), at(prev, -1, -0.6), at(prev, -1.8, 0)], L.tail);
    }

    // membres arrière
    limb(J.af, wA, wA, shade(sleeveU, far), shade(fore, far), shade(hand, far), 2);
    if (wpn && combat && wpn.vis === 'dagger') { const af = J.af; weapon(Pm, af[2], norm([af[2][0] - af[1][0], af[2][1] - af[1][1]]), wpn, t, glow); }
    limb(J.lf, wTh, wSh, shade(bot, far), shade(shin, far), shade(boots, far), 3, shade(boots, far));

    // torse (5 px en armure)
    {
      const W = bones ? 3 : 6;
      const len = Math.hypot(sh[0] - hip[0], sh[1] - hip[1]);
      const n = Math.ceil(len * 2);
      const P0 = (i) => [hip[0] + (sh[0] - hip[0]) * i / n, hip[1] + (sh[1] - hip[1]) * i / n];
      for (let i = 0; i <= n; i++) { const q = P0(i); Pm.sq(q[0], q[1], W + 2, OUT); }
      const belt = L.armor === 'gi' ? '#1a1c2c' : L.armor === 'robe' ? (L.top2 || '#ffcd75') : shade(bot, 0.75);
      for (let i = 0; i <= n; i++) {
        const q = P0(i);
        let c = top;
        if (bones) c = i % 4 < 2 ? '#f4f4f4' : '#c2d3de';
        else if (i < 2) c = belt;
        else if (L.armor === 'mail' && i % 2) c = shade(top, 0.85);
        Pm.sq(q[0], q[1], W, c);
      }
      if (!bones) {
        // volume : reflet devant, ombre derrière
        for (let i = 2; i <= n; i++) { const q = P0(i); const a = at(q, 1.6, 0), b = at(q, -2, 0); Pm.set(Math.round(a[0]), Math.round(a[1]), shade(top, 1.18)); Pm.set(Math.round(b[0]), Math.round(b[1]), shade(top, 0.78)); }
        const mid = P0(Math.round(n * 0.62));
        if (L.armor === 'plate') Pm.blob([at(mid, 1, 0), at(mid, 1, 1)], L.top2 || '#ffcd75', null);
        if (L.armor === 'leather') for (let i = 2; i < n; i++) { const q = at(P0(i), -1.5 + (i / n) * 3, 0); Pm.set(Math.round(q[0]), Math.round(q[1]), L.top2 || shade(top, 0.7)); }
        if (L.armor === 'gi') { const nk = P0(n - 1); Pm.set(Math.round(at(nk, 1.2, 0)[0]), Math.round(at(nk, 1.2, 0)[1]), skin); Pm.set(Math.round(at(nk, 0.4, -0.6)[0]), Math.round(at(nk, 0.4, -0.6)[1]), skin); }
        if (L.armor === 'fur') { const pts = []; for (let k = -3; k <= 2; k++) pts.push(at(sh, k * 0.8, 0.6 + (k % 2 ? 0.6 : 0))); Pm.blob(pts, '#c8b48a'); }
        const bk = at(P0(1), 1.6, 0); Pm.set(Math.round(bk[0]), Math.round(bk[1]), '#ffcd75');
        if (L.cosmic) for (let k = 0; k < 3; k++) { const q = at(P0(3 + k * 4), (k - 1) * 1.2, 0); if (Math.sin(t * 3 + k * 2) > 0) Pm.set(Math.round(q[0]), Math.round(q[1]), '#f4f4f4'); }
      }
    }
    // jambe avant
    limb(J.ln, wTh, wSh, bot, shin, boots, 3, boots);
    // robe
    if (L.robe || L.armor === 'robe') {
      const rc = L.robe || top;
      const kn = lerp2(J.ln[1], J.lf[1], 0.5);
      const A = at(hip, 0, 1), N = 9, tips = [];
      for (let k = 0; k <= N; k++) tips.push(lerp2(at(kn, 3.2, -1.8), at(kn, -3.8, -1.8), k / N));
      for (const tp of tips) Pm.seg(A, tp, 3, OUT);
      tips.forEach((tp, k) => Pm.seg(A, tp, 2, k < 2 ? shade(rc, 1.15) : k > N - 2 ? shade(rc, 0.75) : rc));
      Pm.seg(at(hip, -2, 1), at(hip, 2, 1), 1, L.top2 || '#ffcd75');
    }
    // écharpe et col
    if (L.scarf) {
      const n0 = at(sh, 0, 1.2);
      let prev = at(n0, -1.5, 0);
      const tail = [];
      for (let k = 1; k <= 8; k++) tail.push(at(n0, -1.5 - k * 1.1, -k * 0.35 + Math.sin(t * 7 + k * 0.8) * 0.7 * (k / 8)));
      Pm.seg(at(n0, -1.5, 0), at(n0, 1.8, 0), 4, OUT);
      for (const c of tail) { Pm.seg(prev, c, 3, OUT); prev = c; }
      prev = at(n0, -1.5, 0);
      for (const c of tail) { Pm.seg(prev, c, 1, L.scarf); prev = c; }
      Pm.seg(at(n0, -1.5, 0), at(n0, 1.8, 0), 2, L.scarf);
    }
    if (L.collar) Pm.blob([at(hc, -4, -1), at(hc, -4, 0), at(hc, -4, 1), at(hc, -4.6, 0), at(hc, -4.6, 1), at(hc, -4.4, 2)], L.cape || '#b13e53');

    // tête
    const hp = (f, u, c) => { const q = at(hc, f * HK, u * HK); Pm.set(Math.round(q[0]), Math.round(q[1]), c); };
    const hq = (f, u) => at(hc, f * HK, u * HK);
    const drawHead = () => {
      const cx = Math.round(hc[0]), cy = Math.round(hc[1]);
      for (const [dx, dy] of HO) Pm.set(cx + dx, cy + dy, OUT);
      const H = L.hair || '#5b3a29', HL = shade(H, 1.3), HD = shade(H, 0.8);
      const hs = L.hs || 'short';
      for (const [dx, dy] of HF) {
        const du = (dx * up[0] + dy * up[1]) / HK, df = (dx * fwd[0] + dy * fwd[1]) / HK;
        let c = df < -2.2 ? shade(skin, 0.9) : skin;
        if (hs !== 'bald') {
          let cover = du >= 1.4 || (df <= -1.4 && du >= -1.2);
          if (hs === 'long') cover = cover || (df <= -1 && du >= -3.6);
          if (hs === 'mohawk') cover = du >= 2 && Math.abs(df) <= 1.3;
          if (hs !== 'mohawk' && df >= 1.4 && du >= 0.6 && du <= 1.9) cover = true; // frange
          if (cover) {
            if (hs === 'fire') c = du > 2.4 ? '#ffcd75' : du > 1.5 ? '#ef7d57' : '#b13e53';
            else c = du >= 2.6 && df >= -1 && df <= 1.6 ? HL : df <= -2 ? HD : H;
          }
        }
        if (L.beard && du <= -0.9 && df >= -1.3) c = L.beard;
        Pm.set(cx + dx, cy + dy, c);
      }
      // coiffures en relief
      const sway = Math.sin(t * 3) * 0.5;
      if (hs === 'spiky') Pm.blob([hq(-1, 4.2), hq(-2, 4.2), hq(-3, 3.6), hq(-4, 3.2), hq(-4.8, 2.4), hq(0, 4.4), hq(0, 5.4), hq(1, 4.2), hq(-2, 5.2), hq(-1, 5.4), hq(2, 3.8), hq(-5.6, 2)], H);
      if (hs === 'long') Pm.blob([hq(-4, 0), hq(-4, -1), hq(-4, -2), hq(-4.2 + sway, -3), hq(-3.4 + sway, -3.8), hq(-4.6, -1.5), hq(-4.8 + sway, -2.6), hq(-4.6 + sway, -3.8)], H);
      if (hs === 'ponytail') Pm.blob([hq(-4, 2), hq(-4.8, 1.6), hq(-5.6, 0.8), hq(-6 + sway, -0.2), hq(-6.2 + sway, -1.2), hq(-6 + sway * 1.5, -2.2), hq(-5.6 + sway * 1.8, -3)], H);
      if (hs === 'bun') Pm.blob([hq(-4, 2.5), hq(-4, 3.5), hq(-5, 2.5), hq(-5, 3.5)], H);
      if (hs === 'mohawk') Pm.blob([hq(0, 4), hq(-1, 4), hq(-2, 4), hq(-3, 3.6), hq(0, 5), hq(-1, 5), hq(1, 4), hq(-2, 5)], H);
      if (hs === 'fire') { const k = Math.floor(t * 8) % 3; Pm.blob([hq(0, 4), hq(-1, 4.5), hq(1, 4), hq(-2, 4), hq(0, 5 + k * 0.5), hq(-1, 5.5 + (k === 1 ? 0.5 : 0)), hq(-3, 3.5), hq(-2.5, 5 - (k === 2 ? 0.5 : 0))], (x, y) => (y + k) % 3 === 0 ? '#ffcd75' : '#ef7d57', null); }
      // oreilles d'elfe
      if (L.ears) Pm.blob([hq(-2.8, 1.2), hq(-3.8, 2), hq(-4.8, 2.8)], skin);
      // yeux
      const eyeC = L.eye || '#1a1c2c';
      hp(1.15, 0.75, '#f4f4f4'); hp(2.05, 0.75, eyeC); hp(2.05, -0.1, eyeC); hp(2.85, 0.75, eyeC); hp(1.2, 1.7, shade(L.hair || '#5b3a29', 0.8));
      if (L.eye) glow.push({ p: hq(2, 0.2), c: L.eye });
      if (L.patch) { hp(2, 0.7, OUT); hp(2, -0.3, OUT); hp(1, 1.8, OUT); hp(0, 2.4, OUT); hp(-1, 2.8, OUT); }
      // couvre-chefs
      const c = L.hatC || '#94b0c2', c2 = shade(c, 1.3), cd = shade(c, 0.7);
      const cover = (test, col) => { for (const [dx, dy] of HF) { const du = (dx * up[0] + dy * up[1]) / HK, df = (dx * fwd[0] + dy * fwd[1]) / HK; if (test(du, df)) Pm.set(cx + dx, cy + dy, typeof col === 'function' ? col(du, df) : col); } };
      const metal = (du, df) => (du >= 2.6 && df > -1 ? c2 : df <= -2 ? cd : c);
      const w = Math.sin(t * 6) * 0.6;
      switch (L.hat) {
        case 'band': cover((du) => du >= 1.2 && du <= 2.1, c); Pm.blob([hq(-4, 1.6), hq(-5, 1.1 + w * 0.5), hq(-6, 0.6 + w), hq(-7, 0.4 + w)], c); break;
        case 'cap': cover((du) => du >= 1.5, metal); Pm.blob([hq(3, 1.6), hq(4, 1.6), hq(5, 1.6)], cd); break;
        case 'helm': cover((du, df) => (du >= 0.4 || df <= 0.3) && !(df > 0.8 && du < 0.4), metal); hp(3, 0.8, cd); hp(2, 1.4, cd);
          Pm.blob([hq(-1, 4.2), hq(-2, 4.6), hq(-2, 5.6), hq(-3, 5.8 + w * 0.3), hq(-4, 5.4 + w * 0.5), hq(-5, 4.6 + w)], L.plume || '#b13e53'); break;
        case 'crown': Pm.blob([hq(-3, 3.4), hq(-2, 3.4), hq(-1, 3.4), hq(0, 3.4), hq(1, 3.4), hq(2, 3.4), hq(3, 3.4), hq(-3, 4.4), hq(0, 4.4), hq(3, 4.4), hq(0, 5.3), hq(-3, 5.2), hq(3, 5.2)], c); hp(0, 3.4, '#ff5f6d'); hp(-2, 3.4, '#73eff7'); hp(2, 3.4, '#73eff7'); glow.push({ p: hq(0, 4.5), c }); break;
        case 'hood': cover((du, df) => !(df >= 0.8 && du <= 1.3 && du >= -2.8), (du, df) => (df >= 0 && du > 1.5 ? c2 : df <= -2 ? cd : c));
          Pm.blob([hq(-4, 1), hq(-4, 0), hq(-4, -1), hq(-4, -2), hq(-5, -1), hq(-5, -2), hq(-3, 3.8), hq(-4.2, 3), hq(-5.2, 2)], c); break;
        case 'wizard': {
          const pts = [];
          for (let f = -5; f <= 4; f++) pts.push(hq(f, 3.3));
          for (let f = -3; f <= 2; f++) pts.push(hq(f, 4.3));
          for (let f = -2; f <= 1; f++) pts.push(hq(f, 5.3));
          for (let f = -2; f <= 0; f++) pts.push(hq(f, 6.3));
          for (let f = -3; f <= -1; f++) pts.push(hq(f, 7.3));
          pts.push(hq(-4, 8.2), hq(-3, 8.2), hq(-5, 9));
          Pm.blob(pts, c);
          for (let f = -3; f <= 2; f++) hp(f, 4.3, L.top2 || '#ffcd75');
          hp(0, 5.6, '#ffcd75'); hp(-1, 6.6, '#f4f4f4'); hp(-5, 9, '#ffcd75');
          glow.push({ p: hq(-5, 9), c: '#ffcd75' });
          break;
        }
        case 'horned': cover((du) => du >= 1.2, metal); Pm.blob([hq(3, 2.8), hq(4, 3.6), hq(4.6, 4.6), hq(4.6, 5.6)], '#f4f4f4'); Pm.blob([hq(-3, 2.8), hq(-4, 3.6), hq(-4.6, 4.6), hq(-4.6, 5.6)], '#f4f4f4'); hp(4.6, 5.6, '#c2d3de'); hp(-4.6, 5.6, '#c2d3de'); break;
        case 'ninja': cover((du, df) => du <= -0.6 && df >= -1.8, c); cover((du) => du >= 1.2 && du <= 2.1, L.scarf || '#b13e53'); Pm.blob([hq(-4, 1.6), hq(-5, 1 + w * 0.5), hq(-6, 0.4 + w), hq(-7, 0 + w)], L.scarf || '#b13e53'); break;
        case 'visor': cover((du, df) => du >= 1.2 || df <= -1.5, cd); Pm.blob([hq(0, 0.6), hq(1, 0.6), hq(2, 0.6), hq(3, 0.6), hq(4, 0.6)], c); glow.push({ p: hq(3, 0.6), c }); break;
        case 'laurel': Pm.blob([hq(-3, 2.6), hq(-2, 3.2), hq(-1, 3.6), hq(1, 3.6), hq(2, 3.2), hq(3, 2.6)], (x, y) => ((x + y) % 2 ? '#38b764' : '#a7f070')); break;
        case 'spartan': cover((du, df) => (du >= 0 || df <= 0) && !(df > 1 && du < 1.2 && du > -1.6), (du) => (du > 2.5 ? '#e0aa60' : '#c08a40'));
          Pm.blob([hq(-4, 4.4), hq(-3, 4.6), hq(-2, 4.8), hq(-1, 4.8), hq(0, 4.8), hq(1, 4.6), hq(2, 4.4), hq(-3, 5.6), hq(-2, 5.8), hq(-1, 5.8), hq(0, 5.6)], '#b13e53'); break;
        case 'kabuto': cover((du, df) => (du >= 0.6 || df <= 0) && !(df > 0.8 && du < 0.6), (du) => (du > 2.5 ? c2 : c)); Pm.blob([hq(1, 4), hq(2, 4.8), hq(3, 5.2), hq(4, 4.8), hq(0, 4.6), hq(-1, 4)], '#ffcd75'); break;
        case 'pharaoh': cover((du, df) => du >= 0.6 || df <= -1.2, (du) => (Math.round(du) % 2 ? '#3b5dc9' : '#ffcd75')); Pm.blob([hq(-4, 0), hq(-4, -1), hq(-4, -2), hq(-4, -3), hq(-5, -1), hq(-5, -2), hq(-5, -3)], (x, y) => (y % 2 ? '#3b5dc9' : '#ffcd75')); Pm.blob([hq(3, 2.8), hq(3, 3.6)], '#ffcd75'); break;
        case 'pirate': {
          const pts = [];
          for (let f = -5; f <= 5; f++) pts.push(hq(f, 3));
          for (let f = -3; f <= 2; f++) pts.push(hq(f, 4));
          for (let f = -2; f <= 1; f++) pts.push(hq(f, 5));
          Pm.blob(pts, c); hp(0, 4, '#f4f4f4'); hp(-5, 3, '#ffcd75'); hp(5, 3, '#ffcd75');
          break;
        }
        case 'icecrown': Pm.blob([hq(-3, 3.4), hq(-3, 4.4), hq(-1, 3.6), hq(-1, 4.6), hq(-1, 5.6), hq(1, 3.6), hq(1, 4.6), hq(3, 3.4), hq(3, 4.2), hq(-2, 3.4), hq(0, 3.6), hq(2, 3.4)], (x, y) => '#73eff7'); hp(-1, 5.6, '#ffffff'); hp(-3, 4.4, '#ffffff'); hp(1, 4.6, '#ffffff'); glow.push({ p: hq(0, 4.5), c: '#73eff7' }); break;
        case 'dragonhelm': cover((du, df) => (du >= 0.4 || df <= 0.3) && !(df > 0.8 && du < 0.4), metal); Pm.blob([hq(-3, 4), hq(-2, 4.6), hq(-1, 4), hq(0, 4.6), hq(1, 4)], '#ffcd75'); Pm.blob([hq(-4, 3), hq(-5, 3.6), hq(-6, 4.2), hq(-6.6, 5)], '#f4f4f4'); break;
        case 'lion': cover((du, df) => du >= 1 || df <= -1.5, (du) => (du > 2 ? '#c08a40' : '#8a5a3c')); Pm.blob([hq(-2, 4), hq(1, 4), hq(-4.5, 1), hq(-4.5, 0)], '#8a5a3c'); break;
        default: break;
      }
      if (L.horns) { Pm.blob([hq(2, 3.2), hq(2.6, 4.2), hq(2.6, 5.2), hq(2, 6)], L.horns); Pm.blob([hq(-2, 3.2), hq(-3, 4.2), hq(-3.6, 5.2), hq(-3.2, 6.2)], L.horns); }
      if (L.halo) { const fl = Math.sin(t * 2) * 0.5; for (let f = -3; f <= 3; f++) { hp(f, 6.8 + fl, Math.abs(f) === 3 ? '#ffcd75' : '#fff3c0'); } glow.push({ p: hq(0, 6.8 + fl), c: '#ffe08a', big: true }); }
    };
    // bras avant, épaulière, tête, puis l'arme par-dessus
    limb(J.an, wA, wA, sleeveU, fore, hand, 2);
    if (L.pauldron) {
      const c0 = at(sh, -0.6, -1.2), pts = [];
      for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) {
        const du = x * up[0] + y * up[1];
        if (x * x + y * y <= 8.5 && du >= -0.6) pts.push([c0[0] + x, c0[1] + y]);
      }
      Pm.blob(pts, L.pauldron);
      for (const [f, u] of [[0, 2], [1, 1.6], [-1, 1.6]]) { const hl = at(c0, f, u); Pm.set(Math.round(hl[0]), Math.round(hl[1]), shade(L.pauldron, 1.3)); }
      const rv = at(c0, 1.6, 0.2); Pm.set(Math.round(rv[0]), Math.round(rv[1]), L.top2 || '#ffcd75');
    }
    drawHead();
    if (wpn && combat && wpn.vis && wpn.vis !== 'fist') { const an = J.an; weapon(Pm, an[2], norm([an[2][0] - an[1][0], an[2][1] - an[1][1]]), wpn, t, glow); }
    if (wpn && wpn.vis === 'fist' && (wpn.r || 0) >= 2) glow.push({ p: J.an[2], c: D.RAR[wpn.r].c });
    if (L.orb) { const c0 = at(sh, -4.5, 4 + Math.sin(t * 2) * 1); Pm.blob([c0, [c0[0] + 1, c0[1]], [c0[0], c0[1] + 1], [c0[0] + 1, c0[1] + 1]], L.orb); glow.push({ p: c0, c: L.orb, big: true }); }

    // aura : contour lumineux + étincelles
    if (L.aura || glow.length) {
      const G = new P.Pix();
      const A = AURA[L.aura];
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      const pulse = 0.3 + 0.18 * Math.sin(t * 3);
      for (const k of Pm.m.keys()) {
        const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (A) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = (x + dx) + ',' + (y + dy); if (!Pm.m.has(nk)) G.m.set(nk, hexA(A.c, pulse + 0.15)); }
      }
      if (A) {
        // second halo plus diffus
        const ring = Array.from(G.m.keys());
        for (const k of ring) { const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = (x + dx) + ',' + (y + dy); if (!Pm.m.has(nk) && !G.m.has(nk)) G.m.set(nk, hexA(A.c, pulse * 0.45)); } }
        Pm.sparks = [];
        const n = 9;
        for (let s = 0; s < n; s++) {
          const ph = (t * A.v + s * 0.137 * 7.3) % 1;
          const x = Math.round(x0 - 2 + ((s * 37) % 11) / 10 * (x1 - x0 + 4));
          const y = Math.round(y1 - ph * (y1 - y0 + 10));
          Pm.sparks.push({ x: x + Math.round(Math.sin(t * 2 + s) * 1), y, c: hexA(A.s[s % A.s.length], 1 - ph) });
        }
      }
      for (const g of glow) {
        const gx = Math.round(g.p[0]), gy = Math.round(g.p[1]);
        const rr = g.big ? 2 : 1;
        for (let dx = -rr - 1; dx <= rr + 1; dx++) for (let dy = -rr - 1; dy <= rr + 1; dy++) { const nk = (gx + dx) + ',' + (gy + dy); if (!Pm.m.has(nk) && dx * dx + dy * dy <= (rr + 1) * (rr + 1)) G.m.set(nk, hexA(g.c, 0.35 + 0.2 * Math.sin(t * 5 + gx))); }
      }
      Pm.glow = G;
    }
    if (L.ghost) Pm.alpha = 0.78;
    return Pm;
  }
  P.heroPixels = heroPixels;

  // ---------- Poses de combat (arme en main) ----------
  const K = (x, y, b = 1) => ({ x, y, b });
  const F = (hip, t, a, l, x) => Object.assign({ hip, t, a, l, d: 0.5 }, x || {});
  function addPose(id, def) {
    def.R = def.f.map(P.resolve);
    def.total = def.f.reduce((s, f) => s + f.d, 0);
    P.POSES[id] = def;
  }
  const LEGS = [K(3.5, 0, -1), K(-3, 0, -1)];
  addPose('stance', { combat: true, f: [F([0, -11], -84, [[60, -55], [85, -20]], LEGS, { d: 0.6 }), F([0, -10.5], -85, [[62, -52], [87, -18]], LEGS, { d: 0.6 })] });
  addPose('windup', { combat: true, f: [F([-1, -11.5], -100, [[-130, -160], [60, -40]], [K(3, 0, -1), K(-4, 0, -1)], { d: 0.2 })] });
  addPose('strike', { combat: true, f: [F([2.5, -10.5], -70, [[10, 40], [110, 130]], [K(6, 0, -1), K(-4, 0, -1)], { d: 0.2 })] });
  addPose('thrust', { combat: true, f: [F([2, -11], -78, [[0, 0], [110, 120]], [K(5, 0, -1), K(-4, 0, -1)], { d: 0.2 })] });
  addPose('cast2', { combat: true, f: [F([0, -11.5], -95, [[-40, -60], [-30, -50]], LEGS, { d: 0.25 }), F([0, -12], -96, [[-35, -55], [-25, -45]], LEGS, { d: 0.25 })] });
  addPose('guard', { combat: true, f: [F([-0.5, -10.5], -85, [[70, -80], [60, -95]], [K(4, 0, -1), K(-4, 0, -1)], { d: 0.4 })] });
  addPose('dash', { combat: true, f: [F([2, -9], -55, [[150, 170], [160, 180]], [[40, 100], [140, 80]], { d: 0.15 })] });
  addPose('leap', { combat: true, f: [F([0, -17], -80, [[-100, -110], [-80, -90]], [[60, 120], [110, 140]], { d: 0.2 })] });
  addPose('hurt', { combat: true, f: [F([-1.5, -11.5], -110, [[140, 170], [130, 160]], [K(2, 0, -1), K(-4, 0, -1)], { d: 0.2 })] });
  addPose('triumph', { combat: true, f: [F([0, -12.5], -90, [[-100, -95], [-60, -80]], [[95, 90], [85, 90]], { d: 0.35 }), F([0, -14], -90, [[-102, -92], [-58, -82]], [[95, 90], [85, 90]], { d: 0.35 })] });
  addPose('down', { combat: true, f: [F([0, -2], 180, [[150, 180], [200, 180]], [[0, 0], [5, 0]], { d: 1 })] });
  addPose('heroidle', { combat: false, f: [F([0, -12], -90, [[100, 88], [80, 92]], [K(1.5, 0, -1), K(-1.5, 0, -1)], { d: 1 }), F([0, -11.7], -89, [[103, 91], [77, 89]], [K(1.5, 0, -1), K(-1.5, 0, -1)], { d: 1 })] });
  P.addPose = addPose;
  // Mélange de deux poses (transitions d'attaque)
  P.blend = (a, b, u) => P.joints(P.POSES[a].R[0], P.POSES[b].R[0], Math.max(0, Math.min(1, u)));

  // ---------- Icônes d'objets (même dessin que sur le héros) ----------
  const iconCache = {};
  function itemIconURL(it) {
    const vis = it.vis || D.ICON_VIS[it.icon] || it.icon;
    const key = it.slot + vis + it.r;
    if (iconCache[key]) return iconCache[key];
    const c = document.createElement('canvas');
    c.width = 20; c.height = 20;
    const ctx = c.getContext('2d');
    const Pm = new P.Pix();
    const glow = [];
    if (it.slot === 'weapon') {
      const long = { great: 19, spear: 20, staff: 16, scythe: 14 }[vis] || 13;
      const g = long > 14 ? [3, 17] : [5, 15];
      weapon(Pm, g, norm([1, -1]), { vis, r: it.r }, 0, glow);
      if (vis === 'fist') Pm.blob([[8, 8], [9, 8], [10, 8], [8, 9], [9, 9], [10, 9], [8, 10], [9, 10], [10, 10], [11, 9]], D.MAT[it.r]);
    } else if (it.slot === 'head') {
      const L = { fx: true, skin: '#566c86', hair: '#333c57', hs: 'bald', hat: { band: 'band', helm: 'helm', crown: 'crown', hood: 'hood', wizard: 'wizard', horned: 'horned' }[vis] || 'band', hatC: D.MAT[it.r], plume: D.RAR[it.r].c, eye: null };
      const J = P.poseAt('heroidle', 0);
      const H = heroPixels(J, L, { time: 0 });
      // ne garder que la tête
      const hx = Math.round(J.sh[0]), hy = Math.round(J.sh[1] - 5.5);
      for (const [k, col] of H.m) { const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1); if (y <= hy + 4 && Math.abs(x - hx) <= 9) Pm.set(x - hx + 10, y - hy + 11, col); }
    } else {
      const map = (P.ITEM_SPR[it.icon] || P.ITEM_SPR[{ top: 'top', hands: 'hands', legs: 'legs', feet: 'feet', acc: 'acc' }[it.slot]] || P.ITEM_SPR.acc);
      const col = D.RAR[it.r].c;
      const pal = { a: col, b: shade(col, 0.65), c: shade(col, 1.45), d: '#94b0c2', e: '#566c86' };
      ctx.drawImage(P.spriteCanvas(map, pal, { key: 'it_' + it.icon }), 4, 4);
      return (iconCache[key] = c.toDataURL());
    }
    for (const g of glow) { const gx = Math.round(g.p[0]), gy = Math.round(g.p[1]); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const nk = (gx + dx) + ',' + (gy + dy); if (!Pm.m.has(nk)) Pm.m.set(nk, hexA(g.c, 0.45)); } }
    for (const [k, col] of Pm.m) { const i = k.indexOf(','); ctx.fillStyle = col; ctx.fillRect(+k.slice(0, i), +k.slice(i + 1), 1, 1); }
    return (iconCache[key] = c.toDataURL());
  }
  P.itemIconURL = itemIconURL;

  // ---------- Coffres ----------
  const CHEST_C = ['..oooooooooooo..', '.oaaaaaaaaaaaao.', 'oaccaaaaaaaaaabo', 'oabbbbbbbbbbbbbo', 'oddddddeeddddddo', 'oaaaaaoeeoaaaaao', 'oaaaaaoffoaaaaao', 'oaaaaaaooaaaaabo', 'oaccaaaaaaaaaabo', 'oaaaaaaaaaaaaabo', 'oddddddddddddddo', 'obbbbbbbbbbbbbbo', '.oooooooooooooo.'];
  const CHEST_O = ['................', '..oooooooooooo..', '.obbbbbbbbbbbbo.', 'oaccaaaaaaaaaabo', 'oddddddddddddddo', 'oggggggggggggggo', 'oaaaaaoeeoaaaaao', 'oaaaaaoffoaaaaao', 'oaccaaaaaaaaaabo', 'oaaaaaaaaaaaaabo', 'oddddddddddddddo', 'obbbbbbbbbbbbbbo', '.oooooooooooooo.'];
  function chestURL(tier, open, scale = 4) {
    const T = D.CHEST_T[tier];
    const pal = { a: T.c, b: shade(T.c, 0.7), c: shade(T.c, 1.35), d: T.c2, e: '#ffcd75', f: '#1a1c2c', g: '#fff3c0' };
    return P.spriteURL(open ? CHEST_O : CHEST_C, pal, scale, 'chest' + tier + (open ? 'o' : 'c'));
  }
  P.chestURL = chestURL;
  P.hexA = hexA;
  P.AURA = AURA;
})(window.DT);
