'use strict';
// Donjons & Tractions — état du joueur, sauvegarde locale et calculs dérivés
(function (DT) {
  const U = DT.U, D = DT.D;
  const SAVE_KEY = 'dt_save_v1';
  const VERSION = 1;

  function fresh() {
    const now = Date.now();
    return {
      v: VERSION, created: now, t: now, last: now,
      nick: 'Athlète', started: false,
      look: { skin: '#e8b48a', hair: '#5b3a29', hs: 'short', top: '#b13e53' },
      skin: 'base', skins: ['base'], pet: null, pets: [],
      coins: 0, gems: 0, gemsOn: false,
      energy: 20, energyT: now, energyFrac: 0,
      lvl: 1, xp: 0,
      vol: { push: 0, pull: 0, skill: 0, core: 0, legs: 0, cardio: 0, mobility: 0 },
      exo: {}, best: {},
      skills: { pushup: { lvl: 1, cert: false } },
      loadout: ['pushup'],
      inv: [], eq: {},
      shop: { items: [], t: 0 },
      dungeon: { prog: {}, cleared: 0 },
      daily: { day: -1, c: {}, q: [], got: [], all: false, chest: false },
      streak: { cur: 0, last: -10 },
      hist: {},
      log: [],
      pump: 0,
      prestige: { count: 0, aura: 0, run: 0 },
      life: { rv: 0, earned: 0, skills: 1, cert: 0, seances: 0, bosses: 0, wins: 0, bestRar: 0, raidBest: 0, bestStreak: 0, chests: 0, taps: 0, playSec: 0 },
      ach: {},
      raid: { week: -1, dmg: 0, hits: 0, claimed: [], th: [] },
      settings: { sound: true, music: false, vibe: true, buy: 1, level: 0, bar: true, dur: 30, focus: 'full', auto: true, speed: 1, autobuy: false, rest: 75 },
      tut: 0,
      offline: null,
    };
  }

  function merge(def, src) {
    if (src == null || typeof src !== 'object' || Array.isArray(def)) return src === undefined ? def : src;
    const out = Array.isArray(src) ? src : Object.assign({}, src);
    for (const k in def) {
      if (!(k in src) || (src[k] == null && def[k] != null)) out[k] = def[k];
      else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) && src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) out[k] = merge(def[k], src[k]);
    }
    return out;
  }

  function valid(o) {
    return o && typeof o === 'object' && typeof o.coins === 'number' && o.skills && typeof o.skills === 'object' && isFinite(o.coins);
  }

  function load() {
    const raw = U.store.get(SAVE_KEY);
    if (!raw) return null;
    try {
      const o = JSON.parse(raw);
      if (!valid(o)) return null;
      U.store.set(SAVE_KEY + '_bak', raw);
      return o;
    } catch (e) { return null; }
  }

  function serialize() {
    DT.S.t = Date.now();
    return JSON.stringify(DT.S);
  }
  function save() {
    if (!DT.S) return;
    const ok = U.store.set(SAVE_KEY, serialize());
    DT.E.emit('saved', ok);
    return ok;
  }
  function setState(o) {
    DT.S = merge(fresh(), o || {});
    // garde-fous contre une sauvegarde abîmée
    const S = DT.S;
    if (!S.skills.pushup) S.skills.pushup = { lvl: 1, cert: false };
    for (const id in S.skills) if (!D.SKILL[id]) delete S.skills[id];
    S.loadout = (S.loadout || []).filter((id) => S.skills[id]);
    S.inv = (S.inv || []).filter((it) => it && it.id && it.slot);
    for (const sl in S.eq) if (!S.inv.find((it) => it.id === S.eq[sl])) delete S.eq[sl];
    if (!isFinite(S.coins) || S.coins < 0) S.coins = 0;
    if (!isFinite(S.gems) || S.gems < 0) S.gems = 0;
    C.dirty();
  }
  function exportCode() {
    return btoa(unescape(encodeURIComponent(serialize())));
  }
  function importCode(code) {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (!valid(o)) return false;
      setState(o);
      save();
      return true;
    } catch (e) { return false; }
  }
  function reset() {
    U.store.set(SAVE_KEY + '_bak', U.store.get(SAVE_KEY) || '');
    DT.S = fresh();
    save();
  }

  // ===================== Calculs dérivés =====================
  let cache = {};
  const C = {
    dirty() { cache = {}; },

    // Somme des bonus en % (stuff, apparence, familier)
    bonus(key) {
      if (cache['b_' + key] != null) return cache['b_' + key];
      const S = DT.S;
      let v = 0;
      for (const sl in S.eq) {
        const it = S.inv.find((x) => x.id === S.eq[sl]);
        if (it && it.aff) for (const [k, val] of it.aff) if (k === key) v += val;
      }
      const sk = D.SKIN[S.skin];
      if (sk && sk.bonus && sk.bonus[0] === key) v += sk.bonus[1];
      const pet = S.pet && D.PET[S.pet];
      if (pet && pet.bonus[0] === key) v += pet.bonus[1];
      return (cache['b_' + key] = v);
    },
    aura() { return DT.S.prestige.aura; },
    auraProd() { return 1 + 0.02 * DT.S.prestige.aura; },
    auraCombat() { return 1 + 0.01 * DT.S.prestige.aura; },

    milestoneMult(lvl) {
      let m = 1;
      for (const ms of D.MILESTONES) if (lvl >= ms) m *= 2;
      return m;
    },
    nextMilestone(lvl) { return D.MILESTONES.find((m) => m > lvl) || null; },
    skillProd(id) {
      const st = DT.S.skills[id];
      if (!st) return 0;
      const sk = D.SKILL[id];
      return D.TIERS[sk.t].prod * st.lvl * C.milestoneMult(st.lvl) * (st.cert ? 3 : 1);
    },
    // Production sans le bonus « Pump » (sert aussi d'étalon pour les prix)
    baseProd() {
      if (cache.base != null) return cache.base;
      let p = 0;
      for (const id in DT.S.skills) p += C.skillProd(id);
      p *= (1 + C.bonus('prod')) * C.auraProd();
      return (cache.base = p);
    },
    pumpOn() { return DT.S.pump > Date.now(); },
    prod() { return C.baseProd() * (C.pumpOn() ? 2 : 1); },
    priceBase() { return Math.max(1, C.baseProd()); },

    levelCost(id, n = 1) {
      const sk = D.SKILL[id], st = DT.S.skills[id];
      const c0 = D.TIERS[sk.t].cost, L = st ? st.lvl : 0;
      const r = 1.15;
      return c0 * Math.pow(r, L - 1) * (Math.pow(r, n) - 1) / (r - 1);
    },
    maxBuy(id) {
      const sk = D.SKILL[id], st = DT.S.skills[id];
      if (!st) return 0;
      const c0 = D.TIERS[sk.t].cost * Math.pow(1.15, st.lvl - 1);
      const n = Math.floor(Math.log(DT.S.coins * 0.15 / c0 + 1) / Math.log(1.15));
      return Math.max(0, n);
    },
    unlockCost(id) {
      const sk = D.SKILL[id];
      return sk.free ? 0 : D.TIERS[sk.t].cost * 6;
    },
    unlockState(id) {
      const S = DT.S, sk = D.SKILL[id];
      const preOk = sk.pre.every((p) => S.skills[p]);
      const vol = S.vol[sk.br] || 0;
      const volOk = vol >= sk.req;
      const cost = C.unlockCost(id);
      return { preOk, volOk, vol, req: sk.req, cost, coinOk: S.coins >= cost, ok: preOk && volOk && S.coins >= cost };
    },

    streakMult() { return 1 + 0.05 * Math.min(C.streakNow(), 10); },
    streakNow() {
      const s = DT.S.streak;
      return U.dayIndex() - s.last > 2 ? 0 : s.cur;
    },
    // Pièces gagnées pour des points d'effort réels
    repCoins(pe) {
      return pe * Math.max(10, C.baseProd() * 60) * (1 + C.bonus('rep')) * C.streakMult();
    },
    xpNeed(lvl) { return Math.floor(40 * Math.pow(lvl, 1.4)); },

    // Niveaux de caractéristiques issus du volume réel
    cats() {
      const v = DT.S.vol;
      const f = (x) => Math.floor(Math.sqrt(2 * Math.max(0, x)));
      return { FOR: f(v.push + v.pull), END: f(v.legs + v.cardio), GAI: f(v.core), AGI: f(v.skill + v.cardio * 0.5) };
    },

    itemMain(it) {
      const base = D.SLOT_STATS[it.slot];
      const R = D.RAR[it.r].m, g = Math.pow(1.9, it.ilvl / 10), up = 1 + 0.1 * (it.plus || 0);
      const out = {};
      for (const k in base) {
        if (k === 'crit') out[k] = base[k] * R;
        else if (k === 'spd') out[k] = base[k] * R * (1 + 0.05 * (it.plus || 0));
        else out[k] = base[k] * g * R * up;
      }
      return out;
    },
    itemScore(it) {
      const m = C.itemMain(it);
      let s = (m.atk || 0) * 2.2 + (m.def || 0) * 2 + (m.hp || 0) / 4 + (m.spd || 0) * 8 + (m.crit || 0) * 200;
      for (const [, v] of it.aff || []) s += v * 100 * Math.pow(1.9, it.ilvl / 10);
      return s;
    },
    equipped() {
      const S = DT.S, out = [];
      for (const sl in S.eq) { const it = S.inv.find((x) => x.id === S.eq[sl]); if (it) out.push(it); }
      return out;
    },

    stats() {
      if (cache.stats) return cache.stats;
      const S = DT.S, cat = C.cats();
      const g = { atk: 0, hp: 0, def: 0, spd: 0, crit: 0 };
      for (const it of C.equipped()) { const m = C.itemMain(it); for (const k in m) g[k] += m[k]; }
      const sk = { atk: 0, hp: 0, def: 0, spd: 0, crit: 0 };
      for (const id in S.skills) {
        const s = D.SKILL[id], tier = D.TIERS[s.t], cm = S.skills[id].cert ? 2 : 1;
        const st = D.BRANCHES[s.br].stat;
        if (st === 'atk') sk.atk += tier.stat * cm;
        else if (st === 'def') sk.def += tier.stat * 0.6 * cm;
        else if (st === 'hp') sk.hp += tier.stat * 6 * cm;
        else if (st === 'crit') sk.crit += 0.004 * s.t * cm;
        else if (st === 'spd') sk.spd += 0.15 * s.t * cm;
      }
      const A = C.auraCombat(), L = S.lvl;
      const out = {
        atk: (10 + 2 * L + 1.5 * cat.FOR + g.atk + sk.atk) * (1 + cat.FOR * 0.01) * (1 + C.bonus('atkp')) * A,
        hp: (100 + 12 * L + 8 * cat.END + g.hp + sk.hp) * (1 + cat.END * 0.01) * (1 + C.bonus('hpp')) * A,
        def: (5 + L + cat.GAI + g.def + sk.def) * (1 + cat.GAI * 0.01) * (1 + C.bonus('defp')) * A,
        spd: Math.min(30, 10 + cat.AGI * 0.05 + g.spd + sk.spd + C.bonus('spd')),
        crit: Math.min(0.75, 0.05 + cat.AGI * 0.001 + g.crit + sk.crit + C.bonus('crit')),
        cdmg: 1.5 + C.bonus('cdmg'),
      };
      return (cache.stats = out);
    },
    power(st) {
      st = st || C.stats();
      return Math.round(st.atk * 2.2 + st.def * 2 + st.hp / 4 + (st.spd - 10) * 8 + st.crit * 200);
    },

    energyMax() { return 20 + (DT.S.prestige.aura >= 30 ? 10 : 0) + Math.round(C.bonus('energy')); },
    offlineCap() { return (DT.S.prestige.aura >= 5 ? 12 : 8) * 3600; },
    offlineEff() { return 0.5 + (DT.S.prestige.aura >= 60 ? 0.25 : 0) + C.bonus('off'); },
    abilitySlots() { return DT.S.prestige.aura >= 200 ? 5 : 4; },
    auraGain() { return Math.floor(Math.sqrt(DT.S.prestige.run / 1e7)); },

    dungeonUnlocked(i) { return i === 0 || !!(DT.S.dungeon.prog[D.DUNGEONS[i - 1].id] || {}).c0; },
    modeUnlocked(i, m) { const p = DT.S.dungeon.prog[D.DUNGEONS[i].id] || {}; return m === 0 ? C.dungeonUnlocked(i) : !!p['c' + (m - 1)]; },
    dungeonCost(i) { return 4 + Math.floor(i / 2); },
    // Joueur de référence pour un donjon (Héroïque = +1,5 donjon, Légende = +3)
    refPlayer(d, mode) {
      const dd = d + [0, 1.5, 3][mode || 0];
      return { atk: 35 * Math.pow(2.08, dd), hp: 180 * Math.pow(2.18, dd), def: 10 * Math.pow(2.2, dd) };
    },
    recPower(i, m) {
      const r = C.refPlayer(i, m);
      return Math.round((r.atk * 2.2 + r.def * 2 + r.hp / 4 + 10) * 1.12);
    },
    // Stats ennemies calées sur le joueur de référence : ~6 coups pour un monstre, ~25 pour un boss
    foeStats(d, room, mode, boss) {
      const R = C.refPlayer(d, mode);
      const early = d === 0 && !mode ? (boss ? 0.75 : 0.62) : 1;
      let hp = R.atk * 9 * (0.7 + 0.1 * room) * early;
      let dmg = 0.055 * R.hp * (0.85 + 0.1 * room) * early;
      if (boss) { hp = R.atk * 26 * early; dmg = 0.05 * R.hp * early; }
      const atk = (dmg + Math.sqrt(dmg * dmg + 4 * dmg * R.def)) / 2;
      return { hp, atk, def: R.atk * (boss ? 0.4 : 0.3) * early, spd: 8 + d * 0.8 + room * 0.4 + (boss ? 1 : 0), crit: 0.05 };
    },
  };

  DT.SAVE = { fresh, load, save, serialize, setState, exportCode, importCode, reset, merge, valid, SAVE_KEY };
  DT.C = C;
})(window.DT);
