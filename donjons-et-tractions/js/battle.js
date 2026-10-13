'use strict';
// Donjons & Tractions v2 — combat au tour par tour (moteur + rendu)
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C;
  const FX_C = { bigslash: '#ef7d57', slash: '#ef7d57', spin: '#ffcd75', combo: '#73eff7', knives: '#c2d3de', dash: '#41a6f6', fire: '#ef7d57', bolt: '#ffcd75', frost: '#73eff7', meteor: '#ff5f6d', arcane: '#b65cd6', holy: '#fff3c0', smash: '#ffcd75', shield: '#73eff7', heal: '#a7f070', roar: '#ff5f6d', smoke: '#94b0c2', quake: '#c8b48a' };
  const RANGED = ['fire', 'bolt', 'frost', 'meteor', 'arcane', 'holy', 'knives'];
  function abColor(id) { const a = D.ABI[id]; if (!a) return '#94b0c2'; return a.cls ? D.CLASSES[a.cls].c : FX_C[a.fx] || '#b65cd6'; }
  const FOE_WEAPON = { 'Le Gardien du Parc': ['hammer', 1], 'Le Roi des Toits': ['dagger', 3], 'Le Grand Maître Immobile': ['staff', 3], 'Héraclès': ['mace', 5], 'Parkourien Rival': ['dagger', 1], 'Moine de Bois': ['staff', 1], 'Squelette Chips': ['sword', 1], 'Forgeron Fou': ['hammer', 2], 'Cyber-Runner': ['great', 2], 'Hoplite': ['spear', 3] };

  // ===================== Moteur =====================
  function Fight(cfg) {
    this.cfg = cfg;
    const st = cfg.hero;
    this.hero = { id: 'h', side: 'h', n: cfg.heroName || 'Toi', max: st.hp, hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, crit: st.crit, cdmg: st.cdmg, mpMax: st.mp || 100, mp: Math.round((st.mp || 100) * 0.6), st: {}, shield: 0, dodge: 0, guard: false, ct: 0, alive: true };
    this.abs = (cfg.loadout || []).filter((id) => D.ABI[id]).map((id) => ({ id, a: C.abScaled(id), cd: 0 }));
    this.foes = [];
    this.ev = [];
    this.over = false; this.result = null;
    this.potions = cfg.potions || 0;
    this.turns = 0; this.dmgDealt = 0;
    this.target = null;
    this.pet = !!cfg.pet; this.petN = 0;
  }
  Fight.prototype.setFoes = function (list) {
    this.foes = list.map((f, i) => Object.assign({ id: 'f' + i, side: 'f', st: {}, shield: 0, dodge: 0, ct: 0, alive: true, charge: false, cds: { sp: 1 + Math.floor(Math.random() * 2) }, enraged: false, healed: 0 }, f, { max: f.hp }));
    this.over = false; this.result = null;
    for (const a of this.abs) a.cd = 0;
    this.hero.guard = false;
    const all = [this.hero, ...this.foes];
    for (const a of all) a.ct = 100 / this.spd(a) * (0.75 + Math.random() * 0.35);
    this.hero.ct *= 0.7;
    this.target = this.foes[0].id;
  };
  Fight.prototype.emit = function (e) { if (!this.cfg.headless) this.ev.push(e); };
  Fight.prototype.alive = function () { return this.foes.filter((f) => f.alive); };
  Fight.prototype.byId = function (id) { return id === 'h' ? this.hero : this.foes.find((f) => f.id === id); };
  Fight.prototype.sv = function (a, k) { const s = a.st[k]; return s && s.t > 0 ? s.v : 0; };
  Fight.prototype.spd = function (a) { return Math.max(2, a.spd * (1 + this.sv(a, 'spd') - this.sv(a, 'slow'))); };
  // Ordre des prochains tours (pour l'affichage)
  Fight.prototype.order = function (n = 6) {
    const sim = [this.hero, ...this.alive()].map((a) => ({ id: a.id, ct: a.ct, step: 100 / this.spd(a) }));
    const out = [];
    for (let k = 0; k < n; k++) { sim.sort((a, b) => a.ct - b.ct); const a = sim[0]; out.push(a.id); a.ct += a.step; }
    return out;
  };
  // Prochain acteur (et avance le temps)
  Fight.prototype.nextActor = function () {
    const all = [this.hero, ...this.alive()];
    all.sort((a, b) => a.ct - b.ct);
    const a = all[0], dt = a.ct;
    for (const x of all) x.ct -= dt;
    a.ct = 100 / this.spd(a);
    return a;
  };
  Fight.prototype.damage = function (att, tgt, mult, o = {}) {
    if (!tgt.alive) return 0;
    if (tgt.dodge > 0 && !o.dot) { tgt.dodge--; this.emit({ t: 'dodge', id: tgt.id }); return 0; }
    let atk = att.atk * (1 + this.sv(att, 'atk')) * (att.enraged ? 1.5 : 1);
    if (att.side === 'h' && att.st.rage && att.st.rage.t > 0) atk *= 1 + 0.5 * (1 - att.hp / att.max);
    const def = Math.max(1, tgt.def * (1 + this.sv(tgt, 'defup') + this.sv(tgt, 'def')) * (1 - (o.pierce || 0)));
    let d = o.flat != null ? o.flat : atk * atk / (atk + def) * mult * U.rand(0.9, 1.1);
    let crit = false;
    if (!o.dot) {
      const cc = (att.crit || 0.05) + this.sv(att, 'crit') + (this.sv(tgt, 'mark') ? 0.25 : 0);
      crit = !!o.crit || Math.random() < cc;
      if (crit) d *= att.cdmg || 1.5;
      if (this.sv(tgt, 'mark')) d *= 1 + this.sv(tgt, 'mark');
      if (o.exec && tgt.hp < tgt.max * o.exec) d *= 2;
    }
    if (tgt.guard) d *= 0.5;
    if (tgt.shield > 0) { const a = Math.min(tgt.shield, d); tgt.shield -= a; d -= a; this.emit({ t: 'block', id: tgt.id, amt: a }); }
    d = Math.max(1, d);
    tgt.hp -= d;
    if (att.side === 'h') this.dmgDealt += d;
    if (tgt.inv && tgt.hp <= 0) tgt.hp = tgt.max;
    this.emit({ t: 'hit', id: tgt.id, amt: d, crit, dot: o.dot, hp: Math.max(0, tgt.hp) });
    if (tgt.hp <= 0) { tgt.hp = 0; tgt.alive = false; this.emit({ t: 'die', id: tgt.id }); }
    return d;
  };
  Fight.prototype.heal = function (tgt, v) { const h = Math.max(0, Math.min(tgt.max - tgt.hp, v)); tgt.hp += h; this.emit({ t: 'heal', id: tgt.id, amt: h }); };
  Fight.prototype.status = function (tgt, k, v, turns, text, c) {
    const cur = tgt.st[k];
    if (k === 'stun' && tgt.boss && Math.random() < 0.4) { this.emit({ t: 'text', id: tgt.id, text: 'RÉSISTE', c: '#94b0c2' }); return; }
    tgt.st[k] = { v: Math.max(v, cur && cur.t > 0 ? cur.v : 0), t: Math.max(turns, cur && cur.t > 0 ? cur.t : 0) };
    if (k === 'stun' && tgt.charge) { tgt.charge = false; this.emit({ t: 'text', id: tgt.id, text: 'INTERROMPU', c: '#73eff7' }); }
    if (text) this.emit({ t: 'text', id: tgt.id, text, c });
  };
  // Début de tour : effets sur la durée, étourdissement
  Fight.prototype.startTurn = function (a) {
    a.guard = false;
    for (const k of ['burn', 'poison', 'bleed']) {
      const s = a.st[k];
      if (s && s.t > 0) { this.damage({ atk: 1, side: 'x', st: {} }, a, 0, { dot: true, flat: s.v }); s.t--; if (!a.alive) { this.check(); return false; } }
    }
    const rg = a.st.regen;
    if (rg && rg.t > 0) { this.heal(a, a.max * rg.v); rg.t--; }
    for (const k in a.st) if (!['burn', 'poison', 'bleed', 'regen', 'stun'].includes(k) && a.st[k].t > 0) a.st[k].t--;
    if (a.side === 'h') { a.mp = Math.min(a.mpMax, a.mp + 8); for (const ab of this.abs) if (ab.cd > 0) ab.cd--; }
    if (a.st.stun && a.st.stun.t > 0) { a.st.stun.t--; this.emit({ t: 'act', who: a.id, kind: 'stunned' }); this.emit({ t: 'text', id: a.id, text: 'ÉTOURDI', c: '#ffcd75' }); return false; }
    return true;
  };
  Fight.prototype.canUse = function (i) {
    const ab = this.abs[i];
    return !!ab && ab.cd <= 0 && this.hero.mp >= ab.a.mp && !this.over;
  };
  Fight.prototype.pickTarget = function () {
    const t = this.byId(this.target);
    if (t && t.alive && t.side === 'f') return t;
    const a = this.alive()[0];
    this.target = a ? a.id : null;
    return a;
  };
  // Action du héros : { k: 'attack' | 'ab' | 'defend' | 'potion', i }
  Fight.prototype.heroAct = function (act) {
    const H = this.hero;
    const tgt = this.pickTarget();
    if (act.k === 'potion' && this.potions <= 0) return false;
    if (act.k === 'ab' && !this.canUse(act.i)) return false;
    this.turns++;
    if (act.k === 'attack') {
      this.emit({ t: 'act', who: 'h', kind: 'attack', tg: tgt ? [tgt.id] : [] });
      if (tgt) this.damage(H, tgt, 1);
      H.mp = Math.min(H.mpMax, H.mp + 10);
    } else if (act.k === 'defend') {
      this.emit({ t: 'act', who: 'h', kind: 'defend' });
      H.guard = true; H.mp = Math.min(H.mpMax, H.mp + 22);
      this.emit({ t: 'text', id: 'h', text: 'GARDE', c: '#73eff7' });
    } else if (act.k === 'potion') {
      this.potions--;
      this.emit({ t: 'act', who: 'h', kind: 'potion' });
      this.heal(H, H.max * 0.4);
      if (this.cfg.onPotion) this.cfg.onPotion();
    } else if (act.k === 'ab') {
      const slot = this.abs[act.i], a = slot.a, e = a.eff || {};
      H.mp -= a.mp; slot.cd = a.cd;
      let tg = [];
      if (a.tg === 'one') tg = tgt ? [tgt] : [];
      else if (a.tg === 'all' || a.tg === 'rand') tg = this.alive();
      this.emit({ t: 'act', who: 'h', kind: 'ab', id: a.id, name: a.n, fx: a.fx, tg: a.tg === 'self' ? [] : tg.map((x) => x.id), c: abColor(a.id) });
      const hits = a.hits || 1;
      let dealt = 0;
      if (a.p > 0) {
        for (let k = 0; k < hits; k++) {
          const list = a.tg === 'rand' ? [U.pick(this.alive())].filter(Boolean) : tg.filter((x) => x.alive);
          for (const x of list) {
            dealt += this.damage(H, x, a.p, { pierce: e.pierce, crit: e.crit === 1, exec: e.exec });
            if (e.splash) for (const o of this.alive()) if (o !== x) dealt += this.damage(H, o, e.splash);
          }
        }
      }
      if (a.tg !== 'self') for (const x of tg.filter((y) => y.alive)) {
        const atk = H.atk * (1 + this.sv(H, 'atk'));
        if (e.burn) this.status(x, 'burn', atk * e.burn[0], e.burn[1], 'BRÛLURE', '#ef7d57');
        if (e.poison) this.status(x, 'poison', atk * e.poison[0], e.poison[1], 'POISON', '#a7f070');
        if (e.bleed) this.status(x, 'bleed', atk * e.bleed[0], e.bleed[1], 'SAIGNE', '#ff5f6d');
        if (e.def) this.status(x, 'def', e.def[0], e.def[1], 'ARMURE BRISÉE', '#ffcd75');
        if (e.slow) this.status(x, 'slow', e.slow[0], e.slow[1], 'RALENTI', '#73eff7');
        if (e.mark) this.status(x, 'mark', e.mark[0], e.mark[1], 'MARQUÉ', '#ff5f6d');
        if (e.stun && (!e.chance || Math.random() < e.chance)) this.status(x, 'stun', 1, e.stun);
      }
      if (e.heal) this.heal(H, H.max * e.heal);
      if (e.lifesteal && dealt) this.heal(H, dealt * e.lifesteal);
      if (e.shield) { H.shield = Math.max(H.shield, H.max * e.shield); this.emit({ t: 'text', id: 'h', text: 'BOUCLIER', c: '#73eff7' }); }
      if (e.atk) this.status(H, 'atk', e.atk[0], e.atk[1], '+ATK', '#ef7d57');
      if (Array.isArray(e.crit)) this.status(H, 'crit', e.crit[0], e.crit[1], '+CRIT', '#ffcd75');
      if (e.spd) this.status(H, 'spd', e.spd[0], e.spd[1], '+VIT', '#73eff7');
      if (e.defup) this.status(H, 'defup', e.defup[0], e.defup[1], e.defup[0] > 0 ? '+DEF' : '-DEF', '#73eff7');
      if (e.regen) this.status(H, 'regen', e.regen[0], e.regen[1], 'RÉGÉN', '#a7f070');
      if (e.dodge) { H.dodge += e.dodge; this.emit({ t: 'text', id: 'h', text: 'ESQUIVE x' + e.dodge, c: '#a7f070' }); }
      if (e.mp) H.mp = Math.min(H.mpMax, H.mp + e.mp);
      if (e.cleanse) for (const k of ['burn', 'poison', 'bleed', 'stun', 'slow', 'def']) delete H.st[k];
      if (e.selfdmg) { const sd = H.max * e.selfdmg; H.hp = Math.max(1, H.hp - sd); this.emit({ t: 'hit', id: 'h', amt: sd, self: true, hp: H.hp }); }
      if (a.id === 'b_rage') H.st.rage = { v: 1, t: 3 };
    }
    // familier : un coup tous les 3 tours
    if (this.pet && this.alive().length) { this.petN++; if (this.petN % 3 === 0) { const x = this.pickTarget(); this.emit({ t: 'pet', tg: x.id }); this.damage(H, x, 0.3); } }
    this.check();
    return true;
  };
  // IA ennemie
  Fight.prototype.foeAct = function (f) {
    const H = this.hero;
    if (!f.enraged && (f.boss || f.sp === 'enrage') && f.hp < f.max * 0.35 && !f.inv) { f.enraged = true; this.emit({ t: 'text', id: f.id, text: 'ENRAGÉ !', c: '#e0667a' }); }
    if (f.charge) {
      f.charge = false;
      this.emit({ t: 'act', who: f.id, kind: 'heavy', tg: ['h'] });
      this.damage(f, H, 2.6);
      this.check();
      return;
    }
    f.cds.sp--;
    if (f.sp && f.cds.sp <= 0) {
      f.cds.sp = 3;
      const allies = this.alive();
      switch (f.sp) {
        case 'heavy': f.charge = true; this.emit({ t: 'act', who: f.id, kind: 'charge' }); this.emit({ t: 'text', id: f.id, text: 'CHARGE !', c: '#e0667a' }); return;
        case 'multi': this.emit({ t: 'act', who: f.id, kind: 'multi', tg: ['h'] }); for (let k = 0; k < 3; k++) this.damage(f, H, 0.45); this.check(); return;
        case 'heal': { const w = allies.slice().sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (w && w.hp < w.max * 0.6 && f.healed < 3 && !w.inv) { f.healed++; this.emit({ t: 'act', who: f.id, kind: 'spell', tg: [w.id] }); this.heal(w, w.max * 0.2); return; } break; }
        case 'shield': { const w = U.pick(allies); this.emit({ t: 'act', who: f.id, kind: 'spell', tg: [w.id] }); w.shield = Math.max(w.shield, w.max * 0.15); this.emit({ t: 'text', id: w.id, text: 'BOUCLIER', c: '#73eff7' }); return; }
        case 'stun': this.emit({ t: 'act', who: f.id, kind: 'attack', tg: ['h'] }); this.damage(f, H, 1); if (H.hp > 0 && Math.random() < 0.6) this.status(H, 'stun', 1, 1); f.cds.sp = 4; this.check(); return;
        case 'drain': { this.emit({ t: 'act', who: f.id, kind: 'attack', tg: ['h'] }); const d = this.damage(f, H, 1.3); if (!f.inv) this.heal(f, d * 0.5); this.check(); return; }
        default: break;
      }
    }
    this.emit({ t: 'act', who: f.id, kind: 'attack', tg: ['h'] });
    this.damage(f, H, 1);
    this.check();
  };
  Fight.prototype.check = function () {
    if (this.over) return;
    if (this.hero.hp <= 0) { this.hero.hp = 0; this.over = true; this.result = { win: false }; return; }
    if (!this.alive().length) { this.over = true; this.result = { win: true }; return; }
    if (this.cfg.turnLimit && this.turns >= this.cfg.turnLimit) { this.over = true; this.result = { win: true, timeout: true }; }
  };
  // IA du mode auto
  Fight.prototype.autoChoice = function () {
    const H = this.hero, alive = this.alive(), hpf = H.hp / H.max;
    const ready = this.abs.map((x, i) => ({ x, i })).filter((o) => this.canUse(o.i));
    const find = (fn) => ready.find((o) => fn(o.x.a));
    const charging = alive.find((f) => f.charge);
    if (charging) {
      const st = find((a) => a.eff && a.eff.stun && a.tg !== 'self');
      if (st) { this.target = charging.id; return { k: 'ab', i: st.i }; }
      const dg = find((a) => a.eff && (a.eff.dodge || a.eff.shield));
      if (dg) return { k: 'ab', i: dg.i };
      if (hpf < 0.6) return { k: 'defend' };
    }
    if (hpf < 0.45) { const hl = find((a) => a.eff && a.eff.heal); if (hl) return { k: 'ab', i: hl.i }; if (this.potions > 0 && hpf < 0.33) return { k: 'potion' }; }
    if (hpf < 0.7 && H.shield <= 0) { const sh = find((a) => a.tg === 'self' && a.eff && (a.eff.shield || (a.eff.defup && a.eff.defup[0] > 0))); if (sh) return { k: 'ab', i: sh.i }; }
    const foeHp = alive.reduce((s, f) => s + f.hp, 0);
    const buff = find((a) => a.tg === 'self' && a.eff && ((a.eff.atk && !this.sv(H, 'atk')) || (Array.isArray(a.eff.crit) && !this.sv(H, 'crit')) || (a.eff.spd && !this.sv(H, 'spd'))));
    if (buff && foeHp > H.atk * 4) return { k: 'ab', i: buff.i };
    if (alive.length >= 2) { const aoe = find((a) => a.tg === 'all' && a.p > 0); if (aoe) return { k: 'ab', i: aoe.i }; }
    const weak = alive.slice().sort((a, b) => a.hp - b.hp)[0];
    if (weak && !this.cfg.keepTarget) this.target = weak.id;
    const dmg = ready.filter((o) => o.x.a.p > 0 && o.x.a.tg !== 'self').sort((a, b) => (b.x.a.p * (b.x.a.hits || 1)) - (a.x.a.p * (a.x.a.hits || 1)))[0];
    if (dmg && (H.mp > dmg.x.a.mp + 15 || dmg.x.a.mp <= 12 || foeHp < H.atk * 3)) return { k: 'ab', i: dmg.i };
    return { k: 'attack' };
  };
  // Un pas de combat sans affichage (simulations)
  Fight.prototype.stepHeadless = function () {
    const a = this.nextActor();
    if (!this.startTurn(a)) { this.check(); return; }
    if (a.side === 'h') this.heroAct(this.autoChoice());
    else this.foeAct(a);
  };

  // Ennemis d'un palier
  function floorFoes(d, fl, mode) {
    const dg = D.DUNGEONS[d];
    const mk = (def, kind, gf) => {
      const st = C.floorFoe(d, fl, mode, kind);
      const g = gf || [1, 1];
      const f = Object.assign({}, def, { hp: st.hp * g[0], atk: st.atk * g[1], def: st.def, spd: st.spd * U.rand(0.92, 1.08), crit: st.crit, boss: kind !== 'mob', kind, s: kind === 'mob' ? 1 : 2 });
      if (f.spr === 'human') { const w = FOE_WEAPON[def.n.replace('Gardien : ', '')]; f.look = Object.assign({ fx: true }, def.look, w ? { weapon: { vis: w[0], r: w[1] } } : {}); }
      return f;
    };
    if (fl === D.FLOORS) { const out = [mk(dg.boss, 'boss')]; if (mode > 0) out.push(mk(U.pick(dg.foes), 'mob', [0.5, 0.6])); return out; }
    if (fl % 10 === 0) {
      const g = U.pick(dg.foes);
      const guard = mk(Object.assign({}, g, { n: 'Gardien : ' + g.n }), 'guard');
      return fl >= 20 ? [guard, mk(U.pick(dg.foes), 'mob', [0.55, 0.6])] : [guard];
    }
    const n = fl <= 2 ? 1 : U.weighted([[1, 5], [2, 4 + fl / 5], [3, fl / 6]]);
    const GF = [[1, 1], [0.62, 0.72], [0.48, 0.58]][n - 1];
    const out = [];
    for (let k = 0; k < n; k++) out.push(mk(U.pick(dg.foes), 'mob', GF));
    return out;
  }
  function heroCfg(extra) {
    const S = DT.S;
    return Object.assign({
      hero: C.stats(), loadout: S.loadout.slice(0, C.abilitySlots()), pet: !!S.pet, heroName: S.nick, potions: Math.min(3, S.potions),
      look: C.heroLook(), onPotion: () => { S.potions = Math.max(0, S.potions - 1); },
    }, extra || {});
  }

  // ===================== Rendu =====================
  const W = 160, H = 90, GY = 79, HX = 40;
  const SLOTS = { 1: [[116, 0]], 2: [[106, -2], [134, 2]], 3: [[100, -3], [122, 2], [144, -1]] };
  function View(fight, canvas, theme) {
    this.f = fight; this.theme = theme;
    this.st = new DT.P.Stage(canvas, W, H);
    this.t = 0; this.nums = []; this.parts = []; this.shake = 0; this.projs = [];
    this.ent = {};
    this.layout();
    this.script = []; this.cur = null; this.banner = null;
  }
  View.prototype.layout = function () {
    const f = this.f;
    const prevH = this.ent.h;
    this.ent = { h: { x: HX, y: GY, hx: HX, pose: 'stance', dhp: f.hero.hp, flash: 0, fade: 1 } };
    if (prevH) this.ent.h.dhp = f.hero.hp;
    const sl = f.foes.length === 1 && f.foes[0].s === 2 ? [[118, 0]] : SLOTS[Math.min(3, f.foes.length)] || SLOTS[3];
    f.foes.forEach((fo, i) => {
      const [x, dy] = sl[i] || [100 + i * 20, 0];
      this.ent[fo.id] = { x, y: GY + dy, hx: x, pose: 'stance', dhp: fo.hp, flash: 0, fade: 1 };
    });
  };
  View.prototype.num = function (x, y, text, c, size) { this.nums.push({ x: x + U.rand(-5, 5), y, text, c, size: size || 4, life: 0.9 }); };
  View.prototype.burst = function (x, y, n, c, sp) { for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: U.rand(-40, 40) * (sp || 1), vy: U.rand(-55, -10) * (sp || 1), life: U.rand(0.3, 0.7), c }); };
  View.prototype.busy = function () { return !!this.cur || this.script.length > 0; };
  // Transforme les événements d'une action en séquence animée
  View.prototype.play = function (evs, speed) {
    const sp = speed || 1;
    const act = evs.find((e) => e.t === 'act');
    const rest = evs.filter((e) => e !== act);
    const apply = () => rest.forEach((e) => this.applyEv(e));
    const steps = [];
    if (!act) steps.push({ d: 0.25, on: apply });
    else {
      const who = act.who, E = this.ent[who];
      const tgId = (act.tg && act.tg[0]) || null;
      const T = tgId ? this.ent[tgId] : null;
      const isH = who === 'h';
      const melee = act.kind === 'attack' || act.kind === 'heavy' || act.kind === 'multi' || (act.kind === 'ab' && !RANGED.includes(act.fx) && (act.tg || []).length && act.fx !== 'quake' && act.fx !== 'spin');
      if (act.kind === 'ab') this.banner = { text: act.name, c: act.c || '#f4f4f4', until: this.t + 1.2 / sp };
      if (!E) steps.push({ d: 0.2, on: apply });
      else if (act.kind === 'stunned') steps.push({ d: 0.4, on: apply });
      else if (act.kind === 'charge') steps.push({ d: 0.45, on: () => { E.pose = 'guard'; this.burst(E.x, E.y - 14, 10, '#e0667a'); apply(); DT.A.play('shield'); }, end: () => { E.pose = 'stance'; } });
      else if (act.kind === 'defend') steps.push({ d: 0.35, on: () => { E.pose = 'guard'; apply(); DT.A.play('shield'); } });
      else if (act.kind === 'potion') steps.push({ d: 0.4, on: () => { E.pose = 'cast2'; this.burst(E.x, E.y - 14, 14, '#a7f070'); apply(); DT.A.play('heal'); }, end: () => { E.pose = 'stance'; } });
      else if (melee && T) {
        const tx = T.x + (isH ? -16 : 16);
        steps.push({ d: 0.16, on: () => { E.pose = 'dash'; }, upd: (u) => { E.x = E.hx + (tx - E.hx) * u; } });
        steps.push({ d: act.kind === 'heavy' ? 0.24 : 0.12, on: () => { E.pose = 'windup'; } });
        steps.push({ d: 0.14, on: () => { E.pose = 'strike'; apply(); if (act.kind === 'heavy') this.shake = 0.3; if (act.kind === 'ab') this.burst(T.x, T.y - 14, 12, act.c || '#ffcd75'); } });
        steps.push({ d: 0.18, upd: (u) => { E.x = tx + (E.hx - tx) * u; }, end: () => { E.pose = 'stance'; E.x = E.hx; } });
      } else {
        const self = !(act.tg || []).length;
        steps.push({ d: 0.22, on: () => { E.pose = 'cast2'; this.burst(E.x, E.y - 16, 10, act.c || '#b65cd6'); DT.A.play(act.fx === 'heal' ? 'heal' : act.fx === 'shield' ? 'shield' : 'skill'); } });
        if (!self) {
          const targets = (act.tg || []).map((id) => this.ent[id]).filter(Boolean);
          if (RANGED.includes(act.fx) || act.kind === 'spell') steps.push({ d: 0.22, on: () => { for (const T2 of targets) this.projs.push({ x0: E.x + (isH ? 8 : -8), y0: E.y - 16, x1: T2.x, y1: T2.y - 12, c: act.c || '#ef7d57', t: 0, d: 0.22 / sp, fx: act.fx }); } });
          if (act.fx === 'quake' || act.fx === 'spin') steps.push({ d: 0.15, on: () => { this.shake = 0.35; E.pose = 'strike'; } });
          steps.push({ d: 0.1, on: () => { apply(); for (const T2 of targets) this.burst(T2.x, T2.y - 12, 10, act.c || '#ffcd75'); } });
        } else steps.push({ d: 0.18, on: apply });
        steps.push({ d: 0.18, end: () => { E.pose = 'stance'; } });
      }
    }
    steps.push({ d: 0.12 });
    for (const s of steps) { s.d /= sp; this.script.push(s); }
  };
  View.prototype.applyEv = function (e) {
    const E = this.ent[e.id];
    if (e.t === 'hit' && E) {
      E.dhp = e.hp != null ? e.hp : Math.max(0, E.dhp - e.amt);
      this.num(E.x, E.y - 30, (e.crit ? 'CRIT ' : '') + U.fmt(e.amt), e.id === 'h' ? '#e0667a' : e.crit ? '#ffcd75' : e.dot ? '#a7f070' : '#f4f4f4', e.crit ? 5 : 4);
      if (!e.dot) { E.flash = 0.1; DT.A.play(e.crit ? 'crit' : e.id === 'h' ? 'hurt' : 'hit'); }
      if (e.id === 'h' && !e.self) { E.pose = 'hurt'; setTimeout(() => { if (E.pose === 'hurt') E.pose = 'stance'; }, 240); U.vibrate(12); }
      if (e.crit) this.shake = Math.max(this.shake, 0.18);
    } else if (e.t === 'heal' && E) { const a = this.f.byId(e.id); E.dhp = Math.min(a ? a.max : E.dhp, E.dhp + e.amt); if (e.amt > 0) { this.num(E.x, E.y - 34, '+' + U.fmt(e.amt), '#a7f070', 4); this.burst(E.x, E.y - 10, 8, '#a7f070'); } }
    else if (e.t === 'text' && E) this.num(E.x, E.y - 40, e.text, e.c, 3.4);
    else if (e.t === 'dodge' && E) this.num(E.x, E.y - 34, 'ESQUIVE', '#a7f070', 4);
    else if (e.t === 'block' && E) this.burst(E.x, E.y - 14, 5, '#73eff7');
    else if (e.t === 'die' && E) { E.dead = true; this.burst(E.x, E.y - 12, 20, '#ffcd75'); DT.A.play(e.id === 'h' ? 'lose' : 'coin'); }
    else if (e.t === 'pet') { const T = this.ent[e.tg]; if (T) this.projs.push({ x0: HX - 20, y0: GY - 10, x1: T.x, y1: T.y - 10, c: '#a7f070', t: 0, d: 0.25, fx: 'pet' }); }
    if (this.onEv) this.onEv(e);
  };
  View.prototype.update = function (dt) {
    if (!this.cur && this.script.length) { this.cur = this.script.shift(); this.cur.el = 0; if (this.cur.on) this.cur.on(); }
    if (this.cur) {
      this.cur.el += dt;
      const u = Math.min(1, this.cur.el / this.cur.d);
      if (this.cur.upd) this.cur.upd(u);
      if (u >= 1) { if (this.cur.end) this.cur.end(); this.cur = null; }
    }
  };
  View.prototype.draw = function (dt) {
    this.t += dt;
    this.update(dt);
    const f = this.f, st = this.st, lc = st.lc;
    lc.save();
    if (this.shake > 0) { this.shake -= dt; lc.translate(Math.round(U.rand(-1.5, 1.5)), Math.round(U.rand(-1, 1))); }
    lc.drawImage(DT.P.themeBg(this.theme, W, H), 0, 0);
    const cfg = f.cfg;
    const foes = f.foes.slice().sort((a, b) => this.ent[a.id].y - this.ent[b.id].y);
    for (const fo of foes) {
      const E = this.ent[fo.id];
      if (!E) continue;
      if (E.dead) { E.fade = Math.max(0, E.fade - dt * 2); if (E.fade <= 0) continue; }
      lc.globalAlpha = E.fade;
      const white = E.flash > 0; E.flash -= dt;
      const s = fo.s || 1;
      lc.fillStyle = 'rgba(26,28,44,0.35)'; lc.fillRect(Math.round(E.x - 7 * s), E.y, 14 * s, 2);
      let top;
      if (fo.spr === 'human') {
        const pose = E.dead ? 'down' : fo.st.stun && fo.st.stun.t > 0 ? 'hurt' : E.pose;
        DT.P.drawFigure(lc, pose, fo.look, Math.round(E.x), E.y, { time: this.t + 0.3, flip: true, s, tint: white ? '#ffffff' : null });
        top = E.y - 36 * s;
      } else {
        const cv = DT.P.spriteCanvas(DT.P.SPR[fo.spr], fo.pal, { white });
        const bob = E.dead ? 0 : Math.round(Math.sin(this.t * 4 + E.hx) * 1);
        const lunge = E.pose === 'strike' ? -4 : E.pose === 'windup' ? 2 : 0;
        lc.drawImage(cv, Math.round(E.x - 8 * s + lunge), E.y - 16 * s + 1 + bob, 16 * s, 16 * s);
        top = E.y - 16 * s;
      }
      lc.globalAlpha = 1;
      if (!E.dead) {
        const bw = 14 * Math.min(s, 1.6), bx = Math.round(E.x - bw / 2), by = Math.max(4, top - 5);
        lc.fillStyle = '#1a1c2c'; lc.fillRect(bx - 1, by - 1, Math.round(bw) + 2, 4);
        lc.fillStyle = fo.boss ? '#ef7d57' : '#b13e53'; lc.fillRect(bx, by, Math.round(bw * Math.max(0, E.dhp) / fo.max), 2);
        if (fo.shield > 0) { lc.fillStyle = '#73eff7'; lc.fillRect(bx, by + 2, Math.round(bw * Math.min(1, fo.shield / fo.max)), 1); }
        if (f.target === fo.id && !f.over) { const ay = by - 4 + Math.round(Math.sin(this.t * 6)); lc.fillStyle = '#ffcd75'; lc.fillRect(Math.round(E.x) - 1, ay, 3, 1); lc.fillRect(Math.round(E.x), ay + 1, 1, 1); }
        if (fo.charge) { lc.fillStyle = Math.floor(this.t * 6) % 2 ? '#e0667a' : '#ffcd75'; lc.fillRect(Math.round(E.x) + 9, by - 6, 2, 4); lc.fillRect(Math.round(E.x) + 9, by - 1, 2, 1); }
        if (fo.st.stun && fo.st.stun.t > 0) for (let k = 0; k < 3; k++) { const a = this.t * 5 + k * 2.1; lc.fillStyle = '#ffcd75'; lc.fillRect(Math.round(E.x + Math.cos(a) * 6), Math.round(by - 3 + Math.sin(a) * 2), 1, 1); }
      }
    }
    const Hh = this.ent.h;
    if (cfg.petSpr) lc.drawImage(DT.P.spriteCanvas(DT.P.SPR[cfg.petSpr.spr], cfg.petSpr.pal, { flip: true }), HX - 32, GY - 15 + Math.round(Math.sin(this.t * 3)));
    let hp = f.over && f.result && !f.result.win ? 'down' : f.over && f.result && f.result.win && !cfg.raid ? 'triumph' : Hh.pose;
    if (f.hero.st.stun && f.hero.st.stun.t > 0 && !f.over) hp = 'hurt';
    lc.fillStyle = 'rgba(26,28,44,0.35)'; lc.fillRect(Math.round(Hh.x - 8), GY, 16, 2);
    DT.P.drawFigure(lc, hp, cfg.look, Math.round(Hh.x), GY, { time: this.t, tint: Hh.flash > 0 ? '#ffffff' : null });
    Hh.flash -= dt;
    if (f.hero.shield > 0 || f.hero.guard) { lc.strokeStyle = f.hero.guard ? 'rgba(255,205,117,0.7)' : 'rgba(115,239,247,0.8)'; lc.lineWidth = 1; lc.strokeRect(Math.round(Hh.x) - 12, GY - 38, 24, 39); }
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.t += dt;
      const u = Math.min(1, p.t / p.d);
      const x = p.x0 + (p.x1 - p.x0) * u, y = p.y0 + (p.y1 - p.y0) * u - Math.sin(u * Math.PI) * (p.fx === 'meteor' ? -10 : 6);
      lc.fillStyle = p.c; lc.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      lc.fillStyle = '#ffffff'; lc.fillRect(Math.round(x), Math.round(y), 1, 1);
      if (Math.random() < 0.7) this.parts.push({ x, y, vx: U.rand(-10, 10), vy: U.rand(-10, 10), life: 0.25, c: p.c });
      if (u >= 1) this.projs.splice(i, 1);
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.vy += 80 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      lc.fillStyle = p.c; lc.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    lc.restore();
    st.present();
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.life -= dt; n.y -= dt * 14;
      if (n.life <= 0) { this.nums.splice(i, 1); continue; }
      st.ctx.globalAlpha = Math.min(1, n.life * 3);
      st.text(n.text, n.x, n.y, { color: n.c, size: n.size });
      st.ctx.globalAlpha = 1;
    }
    if (this.banner && this.t < this.banner.until) st.text(this.banner.text, W / 2, 12, { color: this.banner.c, size: 5, bg: 'rgba(26,28,44,0.8)' });
  };
  // Ennemi touché sur le canevas
  View.prototype.pick = function (gx, gy) {
    let best = null, bd = 1e9;
    for (const fo of this.f.alive()) { const E = this.ent[fo.id]; const d = Math.abs(E.x - gx) + Math.abs(E.y - 14 - gy) * 0.5; if (d < bd) { bd = d; best = fo; } }
    return bd < 26 ? best : null;
  };

  DT.BT = { Fight, View, floorFoes, heroCfg, abColor, FX_C, W, H };
})(window.DT);
