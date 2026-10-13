'use strict';
// Donjons & Tractions — règles et actions du jeu
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, E = DT.E;
  const S = () => DT.S;

  function today() {
    const s = S(), di = U.dayIndex();
    if (!s.hist[di]) {
      s.hist[di] = { rv: 0, coins: 0, exo: {} };
      const keys = Object.keys(s.hist).map(Number).sort((a, b) => a - b);
      while (keys.length > 90) delete s.hist[keys.shift()];
    }
    return s.hist[di];
  }

  // ---------- Monnaies ----------
  function addCoins(n) {
    if (!(n > 0) || !isFinite(n)) return;
    const s = S();
    s.coins += n; s.life.earned += n; s.prestige.run += n;
    today().coins += n;
  }
  function spend(n) {
    const s = S();
    if (!(n >= 0) || s.coins < n) return false;
    s.coins -= n;
    E.emit('coins');
    return true;
  }
  function addGems(n) {
    const s = S();
    if (!(n > 0)) return;
    s.gems += Math.round(n);
    E.emit('gems');
  }
  function spendGems(n) {
    const s = S();
    if (s.gems < n) return false;
    s.gems -= n; E.emit('gems');
    return true;
  }
  function addEnergy(n) {
    const s = S();
    s.energy = Math.min(99, s.energy + n);
    E.emit('energy');
  }
  function spendEnergy(n) {
    const s = S();
    if (s.energy < n) return false;
    const wasFull = s.energy >= C.energyMax();
    s.energy -= n;
    if (wasFull) s.energyT = Date.now();
    E.emit('energy');
    return true;
  }
  function daily(key, n = 1) {
    const s = S();
    s.daily.c[key] = (s.daily.c[key] || 0) + n;
    E.emit('quest');
  }

  // ---------- Exercices réels ----------
  function logExercise(exoId, units, opts = {}) {
    const s = S(), ex = D.EXO[exoId];
    units = Math.round(Number(units) * 10) / 10;
    if (!ex || !(units > 0)) return null;
    units = Math.min(units, ex.max * (opts.mult && opts.mult < 1 ? 2 : 1));
    const mult = opts.mult || 1;
    const pe = units * ex.rv * mult;
    s.exo[exoId] = (s.exo[exoId] || 0) + units;
    if (!opts.noBest && units > (s.best[exoId] || 0) && mult >= 1) s.best[exoId] = units;
    s.vol[ex.cat] = (s.vol[ex.cat] || 0) + pe;
    s.life.rv += pe;
    const h = today();
    const before = h.rv;
    h.rv += pe;
    h.exo[exoId] = (h.exo[exoId] || 0) + units;
    // compteurs de quêtes
    daily('rv', pe); daily(ex.cat, pe); daily(exoId, units);
    // série d'entraînement (un jour de repos toléré)
    let streakUp = false;
    if (before < 20 && h.rv >= 20) {
      const di = U.dayIndex(), st = s.streak;
      if (st.last !== di) {
        st.cur = di - st.last <= 2 ? st.cur + 1 : 1;
        st.last = di; streakUp = true;
        s.life.bestStreak = Math.max(s.life.bestStreak, st.cur);
        if (st.cur >= 30 && !s.skins.includes('flamme')) unlockSkin('flamme');
      }
    }
    // récompenses
    const coins = C.repCoins(pe);
    addCoins(coins);
    const xp = pe * (1 + C.bonus('xp')) * C.streakMult();
    const lv = gainXP(xp);
    s.energyFrac += pe / 10;
    const en = Math.floor(s.energyFrac);
    s.energyFrac -= en;
    if (en > 0) addEnergy(en);
    const pumpAdd = (opts.pumpMin != null ? opts.pumpMin : 5 + pe / 5) * 60000;
    s.pump = Math.min(Math.max(s.pump, Date.now()) + pumpAdd, Date.now() + 2 * 3600000);
    s.log.unshift({ t: Date.now(), e: exoId, u: units, pe: Math.round(pe * 10) / 10, c: coins, m: mult !== 1 ? mult : undefined });
    if (s.log.length > 60) s.log.length = 60;
    C.dirty();
    E.emit('log', { exoId, units, pe, coins });
    E.emit('coins');
    checkAch();
    return { pe, coins, xp, lvlUp: lv, energy: en, streakUp, streak: s.streak.cur };
  }
  function gainXP(xp) {
    const s = S();
    s.xp += xp;
    let ups = 0;
    while (s.xp >= C.xpNeed(s.lvl)) { s.xp -= C.xpNeed(s.lvl); s.lvl++; ups++; }
    if (ups) {
      C.dirty();
      addGems(3 * ups);
      E.emit('lvlup', s.lvl);
    }
    return ups;
  }

  // ---------- Skills ----------
  function unlockSkill(id) {
    const s = S(), sk = D.SKILL[id];
    if (!sk || s.skills[id]) return false;
    const st = C.unlockState(id);
    if (!st.ok) return false;
    if (!spend(st.cost)) return false;
    s.skills[id] = { lvl: 1, cert: false };
    s.life.skills = Object.keys(s.skills).length;
    if (s.loadout.length < C.abilitySlots()) s.loadout.push(id);
    else {
      // remplace la technique la plus faible si la nouvelle est d'un palier supérieur
      let worst = 0;
      s.loadout.forEach((lid, i) => { if (D.SKILL[lid].t < D.SKILL[s.loadout[worst]].t) worst = i; });
      if (D.SKILL[s.loadout[worst]].t < sk.t) s.loadout[worst] = id;
    }
    addGems(D.TIERS[sk.t].gems);
    if (!s.gemsOn) { s.gemsOn = true; E.emit('toast', { t: "Nouvelle monnaie débloquée : les Éclats (" + s.gems + ") ! Coffres, apparences, énergie, boosts.", k: 'gem', big: true }); }
    C.dirty();
    E.emit('skill', id);
    checkAch();
    return true;
  }
  function buyLevels(id, n) {
    const s = S(), st = s.skills[id];
    if (!st || !(n > 0)) return false;
    const cost = C.levelCost(id, n);
    if (!spend(cost)) return false;
    const before = st.lvl;
    st.lvl += n;
    daily('levels', n);
    C.dirty();
    const ms = D.MILESTONES.filter((m) => m > before && m <= st.lvl);
    E.emit('skillLvl', { id, ms });
    return true;
  }
  function certify(id) {
    const s = S(), st = s.skills[id];
    if (!st || st.cert) return false;
    st.cert = true;
    s.life.cert++;
    addGems(D.TIERS[D.SKILL[id].t].gems * 2);
    C.dirty();
    E.emit('skill', id);
    checkAch();
    return true;
  }
  // Achat automatique (palier d'Aura) : le niveau le moins cher
  function autoBuy() {
    const s = S();
    let best = null, bc = Infinity;
    for (const id in s.skills) { const c = C.levelCost(id, 1); if (c < bc) { bc = c; best = id; } }
    if (best && s.coins >= bc) buyLevels(best, 1);
  }

  // ---------- Objets ----------
  function refIlvl() {
    let hi = 0;
    D.DUNGEONS.forEach((d, i) => { if (C.dungeonUnlocked(i)) hi = i; });
    return hi * 10 + 3;
  }
  function rollRarity(f, minR = 0, maxR = 5) {
    const base = [60, 26, 10, 3.2, 0.7, f >= 2 ? 0.12 : 0];
    const list = [];
    for (let i = minR; i <= maxR; i++) list.push([i, base[i] * Math.pow(f, i)]);
    return U.weighted(list);
  }
  function makeItem(slot, ilvl, r) {
    slot = slot || U.pick(D.SLOTS).id;
    const [base, icon] = U.pick(D.ITEM_NAMES[slot]);
    const it = { id: U.uid(), slot, n: base + ' ' + U.pick(D.ITEM_SUFFIX[r]), icon, r, ilvl: Math.max(0, Math.round(ilvl)), plus: 0, aff: [] };
    const nAff = D.RAR[r].aff + (slot === 'acc' ? 1 : 0);
    const pool = U.shuffle(D.AFFIXES);
    for (let i = 0; i < nAff; i++) {
      const a = pool[i];
      it.aff.push([a.k, Math.round(a.v * Math.max(1, r) * U.rand(0.75, 1.25) * 1000) / 1000]);
    }
    return it;
  }
  function makeUnique(key) {
    const u = D.UNIQUES[key];
    return { id: U.uid(), slot: u.slot, n: u.n, icon: u.icon, r: u.r, ilvl: u.ilvl, plus: 0, aff: u.aff.map((a) => a.slice()), uq: key };
  }
  function addItem(it) {
    const s = S();
    s.inv.push(it);
    if (it.r > s.life.bestRar) s.life.bestRar = it.r;
    // équipe tout seul si l'emplacement est vide
    if (!s.eq[it.slot]) { s.eq[it.slot] = it.id; C.dirty(); }
    E.emit('inv');
    checkAch();
    return it;
  }
  const findItem = (id) => S().inv.find((x) => x.id === id);
  function equip(id) {
    const it = findItem(id);
    if (!it) return;
    S().eq[it.slot] = it.id;
    C.dirty(); E.emit('inv');
  }
  function unequip(slot) { delete S().eq[slot]; C.dirty(); E.emit('inv'); }
  function isEquipped(it) { return S().eq[it.slot] === it.id; }
  function sellValue(it) { return Math.max(10 * (it.r + 1), C.priceBase() * D.RAR[it.r].sec * 0.12 * (1 + it.plus * 0.3)); }
  function sell(id) {
    const s = S(), it = findItem(id);
    if (!it || isEquipped(it) || it.lock) return 0;
    const v = sellValue(it);
    s.inv = s.inv.filter((x) => x.id !== id);
    addCoins(v);
    E.emit('inv'); E.emit('coins');
    return v;
  }
  function sellBelow(maxR) {
    const s = S();
    let tot = 0, n = 0;
    for (const it of s.inv.slice()) if (it.r <= maxR && !isEquipped(it) && !it.lock && !it.uq) { tot += sell(it.id); n++; }
    return { tot, n };
  }
  function upgradeCost(it) { return Math.max(20 * Math.pow(1.6, it.plus), C.priceBase() * 30 * Math.pow(1.6, it.plus) * (1 + it.r * 0.5)); }
  function upgrade(id) {
    const it = findItem(id);
    if (!it || it.plus >= 10) return false;
    if (!spend(upgradeCost(it))) return false;
    it.plus++;
    daily('upgrade');
    C.dirty(); E.emit('inv');
    return true;
  }

  // Boutique : 6 objets, renouvelée toutes les 4 heures
  const SHOP_EVERY = 4 * 3600000;
  function shopRefresh(force) {
    const s = S();
    if (!force && s.shop.items.length && Date.now() - s.shop.t < SHOP_EVERY) return;
    const il = refIlvl();
    s.shop.items = [];
    for (let i = 0; i < 6; i++) {
      const r = rollRarity(1.6, 0, 3);
      s.shop.items.push(makeItem(null, il + U.randInt(-2, 4), r));
    }
    s.shop.t = Date.now();
    E.emit('shop');
  }
  const shopPrice = (it) => Math.max(50 * Math.pow(it.r + 1, 2), C.priceBase() * D.RAR[it.r].sec * (1 + it.ilvl / 200));
  function buyShop(id) {
    const s = S(), it = s.shop.items.find((x) => x.id === id);
    if (!it || it.sold) return false;
    if (!spend(shopPrice(it))) return false;
    it.sold = true;
    const copy = Object.assign({}, it, { id: U.uid() });
    delete copy.price; delete copy.sold;
    addItem(copy);
    E.emit('shop');
    return copy;
  }
  const CHESTS = {
    gold: { n: "Coffre Doré", gems: 60, f: 3, min: 2, count: 1, d: "1 objet Rare ou mieux. Chance de Légendaire et de Mythique." },
    seance: { n: "Coffre de Séance", f: 1.8, min: 1, count: 2, d: "Gagné en terminant une séance guidée." },
    daily: { n: "Coffre du Jour", f: 1.5, min: 0, count: 1, d: "Récompense des quêtes du jour." },
    raid: { n: "Coffre de Raid", f: 3.5, min: 2, count: 2, d: "Récompense du boss de raid." },
  };
  function openChest(type) {
    const ch = CHESTS[type], s = S();
    const out = [];
    for (let i = 0; i < ch.count; i++) {
      const r = rollRarity(ch.f, ch.min, 5);
      out.push(addItem(makeItem(null, refIlvl() + U.randInt(0, 5), r)));
    }
    s.life.chests++;
    daily('chest');
    return out;
  }
  function buyChest(type) {
    const ch = CHESTS[type];
    if (!ch.gems || !spendGems(ch.gems)) return null;
    return openChest(type);
  }

  // ---------- Apparences & familiers ----------
  function unlockSkin(id) {
    const s = S();
    if (s.skins.includes(id) || !D.SKIN[id]) return false;
    s.skins.push(id);
    E.emit('toast', { t: "Nouvelle apparence : " + D.SKIN[id].n, k: 'skin', big: true });
    checkAch();
    return true;
  }
  function buySkin(id) {
    const sk = D.SKIN[id], s = S();
    if (!sk || !sk.price || s.skins.includes(id)) return false;
    if (!spendGems(sk.price)) return false;
    return unlockSkin(id);
  }
  function setSkin(id) { const s = S(); if (s.skins.includes(id)) { s.skin = id; C.dirty(); E.emit('look'); } }
  function unlockPet(id) {
    const s = S();
    if (s.pets.includes(id)) return false;
    s.pets.push(id);
    if (!s.pet) s.pet = id;
    C.dirty();
    E.emit('toast', { t: "Nouveau familier : " + D.PET[id].n, k: 'pet', big: true });
    checkAch();
    return true;
  }
  function setPet(id) { const s = S(); if (id === null || s.pets.includes(id)) { s.pet = id; C.dirty(); E.emit('look'); } }

  // ---------- Donjons ----------
  function roomReward(d, mode, room, boss) {
    const s = S(), M = D.MODES[mode];
    const r = { coins: 0, gems: 0, items: [], pet: null };
    r.coins = Math.max(20 * Math.pow(3, d), C.priceBase() * 25 * (1 + d * 0.3)) * (mode + 1) * (1 + C.bonus('loot')) * (boss ? 4 : 1);
    addCoins(r.coins);
    if (boss) {
      r.gems = 2 + d + mode * 3;
      addGems(r.gems);
      const rr = rollRarity(2 * M.rar, 1, 5);
      r.items.push(addItem(makeItem(null, d * 10 + 5 + M.ilvl + U.randInt(0, 4), rr)));
      const pid = D.DUNGEONS[d].pet;
      if (!s.pets.includes(pid) && Math.random() < 0.03 * (mode + 1)) { unlockPet(pid); r.pet = pid; }
    } else if (Math.random() < 0.22 + mode * 0.08) {
      const rr = rollRarity(M.rar, 0, 5);
      r.items.push(addItem(makeItem(null, d * 10 + room + M.ilvl + U.randInt(0, 3), rr)));
    }
    s.life.wins++;
    daily('win');
    if (boss) { s.life.bosses++; daily('boss'); }
    E.emit('coins');
    return r;
  }
  function dungeonClear(d, mode) {
    const s = S(), dg = D.DUNGEONS[d];
    const p = s.dungeon.prog[dg.id] || (s.dungeon.prog[dg.id] = {});
    const first = !p['c' + mode];
    const out = { first, skin: null, item: null, pet: null, gems: 0 };
    p['c' + mode] = (p['c' + mode] || 0) + 1;
    if (first) {
      if (mode === 0) {
        s.dungeon.cleared = D.DUNGEONS.filter((x) => (s.dungeon.prog[x.id] || {}).c0).length;
        if (unlockSkin(dg.first.skin)) out.skin = dg.first.skin;
        out.item = addItem(makeUnique(dg.first.item));
        out.gems = 20 + d * 10;
      } else if (mode === 1) {
        if (unlockPet(dg.pet)) out.pet = dg.pet;
        out.gems = 40 + d * 15;
      } else {
        out.item = addItem(makeItem(null, d * 10 + 15, 5));
        out.gems = 100 + d * 20;
      }
      addGems(out.gems);
    }
    C.dirty();
    E.emit('dungeon');
    checkAch();
    return out;
  }

  // ---------- Quêtes & succès ----------
  function dailyCheck() {
    const s = S(), di = U.dayIndex();
    if (s.daily.day === di) return false;
    const r = U.rng(U.hash('q' + di + s.created));
    const irl = U.shuffle(D.QUESTS.filter((q) => q.irl), r);
    const game = U.shuffle(D.QUESTS.filter((q) => !q.irl), r);
    s.daily = { day: di, c: {}, q: [irl[0].id, irl[1].id, game[0].id], got: [], all: false, chest: false };
    E.emit('quest');
    return true;
  }
  function questProgress(q) { return Math.min(q.n, S().daily.c[q.key] || 0); }
  function claimQuest(id) {
    const s = S(), q = D.QUESTS.find((x) => x.id === id);
    if (!q || s.daily.got.includes(id) || questProgress(q) < q.n) return null;
    s.daily.got.push(id);
    const coins = Math.max(100, C.priceBase() * q.sec);
    addCoins(coins); addGems(q.gems); addEnergy(3);
    E.emit('quest'); E.emit('coins');
    return { coins, gems: q.gems };
  }
  function claimAllBonus() {
    const s = S();
    if (s.daily.all || s.daily.q.some((id) => !s.daily.got.includes(id))) return null;
    s.daily.all = true;
    E.emit('quest');
    return openChest('daily');
  }
  function claimDailyChest() {
    const s = S();
    if (s.daily.chest) return null;
    s.daily.chest = true;
    const coins = Math.max(200, C.priceBase() * 300);
    addCoins(coins); addGems(5); addEnergy(5);
    E.emit('quest'); E.emit('coins');
    return { coins, gems: 5, energy: 5 };
  }
  function checkAch() {
    const s = S();
    for (const a of D.ACHS) {
      if (s.ach[a.id]) continue;
      let v = 0;
      try { v = a.v(s); } catch (e) { v = 0; }
      if (v >= a.n2) {
        s.ach[a.id] = Date.now();
        addGems(a.gems);
        E.emit('toast', { t: "Succès : " + a.n + (s.gemsOn ? " (+" + a.gems + " éclats)" : ""), k: 'ach', big: true });
        DT.A && DT.A.play('ach');
      }
    }
  }

  // ---------- Raid hebdomadaire ----------
  function raidState() {
    const s = S(), wk = U.weekIndex();
    if (s.raid.week !== wk) s.raid = { week: wk, dmg: 0, hits: 0, claimed: [], th: [] };
    // paliers fixés sur ta puissance au moment de ta première attaque de la semaine
    if (!s.raid.hits) { const a = Math.max(20, C.stats().atk); s.raid.th = [40, 150, 350, 700].map((k) => Math.round(a * k)); }
    return s.raid;
  }
  const RAID_REW = [
    { gems: 10, sec: 600 }, { gems: 20, sec: 1200 }, { gems: 35, chest: 'raid', sec: 1800 }, { gems: 60, skin: 'spartan', sec: 3600 },
  ];
  function raidAddDamage(dmg) {
    const r = raidState();
    r.dmg += dmg; r.hits++;
    daily('raid');
    const tier = r.th.filter((t) => r.dmg >= t).length;
    S().life.raidBest = Math.max(S().life.raidBest, tier);
    checkAch();
    E.emit('raid');
    return tier;
  }
  function raidClaim(i) {
    const r = raidState();
    if (r.claimed.includes(i) || r.dmg < r.th[i]) return null;
    r.claimed.push(i);
    const rw = RAID_REW[i];
    const out = { gems: rw.gems, coins: Math.max(100, C.priceBase() * rw.sec) };
    addGems(rw.gems); addCoins(out.coins);
    if (rw.chest) out.items = openChest(rw.chest);
    if (rw.skin && unlockSkin(rw.skin)) out.skin = rw.skin;
    E.emit('raid'); E.emit('coins');
    return out;
  }
  // Progression de la communauté (joueurs simulés + vrais joueurs) sur la semaine
  function raidCommunity(extra = 0) {
    const wk = U.weekIndex();
    const start = (wk * 7 - 3) * 86400000; // lundi 00:00 UTC approx.
    const frac = U.clamp((Date.now() - start) / (7 * 86400000), 0, 1);
    const r = U.rng(wk)();
    return Math.min(1, Math.pow(frac, 0.85) * (0.95 + r * 0.25) + extra);
  }

  // ---------- Renaissance ----------
  function prestige() {
    const s = S(), gain = C.auraGain();
    if (gain < 1) return false;
    s.prestige.aura += gain;
    s.prestige.count++;
    s.prestige.run = 0;
    s.coins = s.prestige.aura >= 100 ? 1e6 : 0;
    for (const id in s.skills) s.skills[id].lvl = 1;
    C.dirty();
    E.emit('prestige', gain);
    checkAch();
    return gain;
  }

  // ---------- Boucle ----------
  let autoT = 0;
  function tick(dt) {
    const s = S();
    const p = C.prod();
    if (p > 0) addCoins(p * dt);
    // énergie
    const max = C.energyMax(), now = Date.now();
    if (s.energy >= max) s.energyT = now;
    else {
      let n = 0;
      while (s.energy < max && now - s.energyT >= 300000) { s.energy++; s.energyT += 300000; n++; }
      if (n) E.emit('energy');
    }
    s.life.playSec += dt;
    s.last = now;
    if (s.prestige.aura >= 15 && s.settings.autobuy) {
      autoT += dt;
      if (autoT >= 1) { autoT = 0; autoBuy(); }
    }
  }
  function energyNextIn() {
    const s = S();
    if (s.energy >= C.energyMax()) return 0;
    return Math.max(0, 300 - (Date.now() - s.energyT) / 1000);
  }
  // Gains hors ligne au retour
  function offline() {
    const s = S(), now = Date.now();
    const away = Math.max(0, (now - (s.last || now)) / 1000);
    if (away < 60) { s.last = now; return null; }
    const cap = C.offlineCap(), eff = C.offlineEff();
    const t = Math.min(away, cap);
    const base = C.baseProd();
    const pumpSec = U.clamp((s.pump - s.last) / 1000, 0, t);
    const coins = base * (t + pumpSec) * eff;
    addCoins(coins);
    // énergie : la régénération continue
    tick(0);
    s.last = now;
    return { away, t, coins, capped: away > cap };
  }

  DT.G = {
    today, addCoins, spend, addGems, spendGems, addEnergy, spendEnergy, daily,
    logExercise, gainXP, unlockSkill, buyLevels, certify, autoBuy,
    refIlvl, rollRarity, makeItem, makeUnique, addItem, findItem, equip, unequip, isEquipped, sellValue, sell, sellBelow, upgradeCost, upgrade,
    shopRefresh, buyShop, shopPrice, SHOP_EVERY, CHESTS, openChest, buyChest,
    unlockSkin, buySkin, setSkin, unlockPet, setPet,
    roomReward, dungeonClear,
    dailyCheck, questProgress, claimQuest, claimAllBonus, claimDailyChest, checkAch,
    raidState, raidAddDamage, raidClaim, raidCommunity, RAID_REW,
    prestige, tick, energyNextIn, offline,
  };
})(window.DT);
