'use strict';
// Donjons & Tractions — règles et actions du jeu
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, E = DT.E;
  const S = () => DT.S;
  // Butin supplémentaire des modules : DT.HOOKS.loot.push((type, ctx, out) => { ... out.items.push(G.addItem(...)) })
  // type : 'floor' (palier gagné), 'clear' (palier 30 la 1re fois), 'chest' (coffre ouvert)
  function lootHooks(type, ctx, out) {
    const list = (DT.HOOKS && DT.HOOKS.loot) || [];
    for (const fn of list) { try { fn(type, ctx, out); } catch (e) { console.error('loot', e); } }
  }

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
    addClassXP(C.clsOfBranch(ex.cat), pe * 2);
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
    addClassXP(C.clsOfBranch(sk.br), 60 * sk.t);
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
    addClassXP(C.clsOfBranch(D.SKILL[id].br), n * D.SKILL[id].t * 2);
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
    addClassXP(C.clsOfBranch(D.SKILL[id].br), 200 * D.SKILL[id].t);
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
  // vis : aspect voulu (sinon au hasard, avec un penchant pour l'arme de ta classe)
  function makeItem(slot, ilvl, r, vis) {
    slot = slot || U.pick(D.SLOTS).id;
    if (!vis && slot === 'weapon' && S().cls && Math.random() < 0.35) vis = D.CLASSES[C.cls()].weapon;
    const names = D.ITEM_NAMES[slot].filter((x) => x[2] === vis);
    const [base, icon] = U.pick(names.length ? names : D.ITEM_NAMES[slot]);
    vis = (names.length ? names[0] : D.ITEM_NAMES[slot].find((x) => x[0] === base))[2];
    const it = { id: U.uid(), slot, n: base + ' ' + U.pick(D.ITEM_SUFFIX[r]), icon, vis, r, ilvl: Math.max(0, Math.round(ilvl)), plus: 0, aff: [] };
    if ((slot === 'weapon' && r >= 4 && Math.random() < (r >= 5 ? 1 : 0.5)) || (slot === 'acc' && r >= 5 && Math.random() < 0.4)) it.ab = U.pick(D.ENCHANTS);
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
    return { id: U.uid(), slot: u.slot, n: u.n, icon: u.icon, vis: u.vis, ab: u.ab, r: u.r, ilvl: u.ilvl, plus: 0, aff: u.aff.map((a) => a.slice()), uq: key };
  }
  function addItem(it) {
    const s = S();
    s.inv.push(it);
    if (it.r > s.life.bestRar) s.life.bestRar = it.r;
    // équipe tout seul si l'emplacement est vide
    if (!s.eq[it.slot]) { s.eq[it.slot] = it.id; C.dirty(); syncLoadout(it); E.emit('look'); }
    E.emit('inv');
    checkAch();
    return it;
  }
  const findItem = (id) => S().inv.find((x) => x.id === id);
  // Les capacités d'enchantement suivent l'équipement porté
  function syncLoadout(it) {
    const s = S();
    s.loadout = s.loadout.filter((id) => C.abRank(id) > 0);
    if (it && it.ab && isEquipped(it) && !s.loadout.includes(it.ab) && s.loadout.length < C.abilitySlots()) s.loadout.push(it.ab);
    E.emit('loadout');
  }
  function equip(id) {
    const it = findItem(id);
    if (!it) return;
    S().eq[it.slot] = it.id;
    C.dirty(); syncLoadout(it); E.emit('inv'); E.emit('look');
  }
  function unequip(slot) { delete S().eq[slot]; C.dirty(); syncLoadout(); E.emit('inv'); E.emit('look'); }
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

  // Armurerie : 8 objets (dont des armes de ta classe), renouvelée toutes les 4 heures
  const SHOP_EVERY = 4 * 3600000;
  function shopRefresh(force) {
    const s = S();
    if (!force && s.shop.items.length && Date.now() - s.shop.t < SHOP_EVERY) return;
    const il = refIlvl();
    const cw = D.CLASSES[C.cls()].weapon;
    s.shop.items = ['weapon', 'weapon', 'head', 'top', 'hands', 'legs', 'feet', 'acc'].map((slot, i) =>
      makeItem(slot, il + U.randInt(-1, 4), rollRarity(1.7, 0, 4), i === 0 ? cw : null));
    s.shop.t = Date.now();
    E.emit('shop');
  }
  const shopPrice = (it) => Math.max(50 * Math.pow(it.r + 1, 2), C.priceBase() * D.RAR[it.r].sec * (1 + it.ilvl / 200)) * (it.ab ? 1.5 : 1);
  // Enchanter une arme ou un accessoire (Rare ou mieux) : lui ajoute une capacité de combat
  const ENCH_GEMS = [0, 0, 25, 50, 90, 150];
  const enchantCost = (it) => ({ gems: ENCH_GEMS[it.r], coins: Math.max(400, C.priceBase() * 500 * it.r) });
  const canEnchant = (it) => (it.slot === 'weapon' || it.slot === 'acc') && it.r >= 2;
  function enchant(id, abId) {
    const s = S(), it = findItem(id);
    if (!it || !canEnchant(it) || !D.ABI[abId] || !D.ABI[abId].ench || it.ab === abId) return false;
    const c = enchantCost(it);
    if (s.gems < c.gems || s.coins < c.coins) return false;
    spendGems(c.gems); spend(c.coins);
    it.ab = abId;
    if (isEquipped(it) && s.loadout.length < C.abilitySlots() && !s.loadout.includes(abId)) s.loadout.push(abId);
    C.dirty(); E.emit('inv'); E.emit('ability');
    return true;
  }
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
  // ---------- Coffres (6 niveaux) ----------
  const CHEST_PRICE = { 2: 60, 3: 150, 4: 400 };
  function addChest(tier, src) {
    const s = S();
    const ch = { id: U.uid(), t: U.clamp(tier, 0, 5), src: src || '' };
    s.chests.push(ch);
    E.emit('chest');
    return ch;
  }
  function chestCount(tier) { return S().chests.filter((c) => tier == null || c.t === tier).length; }
  function openChest(id) {
    const s = S(), i = s.chests.findIndex((c) => c.id === id);
    if (i < 0) return null;
    const ch = s.chests.splice(i, 1)[0], T = D.CHEST_T[ch.t];
    const out = { tier: ch.t, items: [], coins: Math.max(100, C.priceBase() * T.sec), gems: T.gems, skin: null, pet: null };
    for (let k = 0; k < T.items; k++) out.items.push(addItem(makeItem(null, refIlvl() + ch.t * 2 + U.randInt(0, 4), rollRarity(T.f, T.min, 5))));
    addCoins(out.coins);
    if (out.gems) addGems(out.gems);
    if (Math.random() < T.skin) {
      const pool = D.SKINS.filter((sk) => sk.chest != null && sk.chest <= ch.t && !s.skins.includes(sk.id));
      if (pool.length) { out.skin = U.pick(pool).id; unlockSkin(out.skin); }
    }
    if (Math.random() < [0, 0, 0.01, 0.03, 0.06, 0.12][ch.t]) {
      const pool = D.PETS.filter((p) => !s.pets.includes(p.id));
      if (pool.length) { out.pet = U.pick(pool).id; unlockPet(out.pet); }
    }
    lootHooks('chest', { tier: ch.t, src: ch.src }, out);
    s.life.chests++;
    s.life.bestChest = Math.max(s.life.bestChest == null ? -1 : s.life.bestChest, ch.t);
    daily('chest');
    E.emit('chest'); E.emit('coins');
    checkAch();
    return out;
  }
  const chestUpCost = (t) => { const u = D.CHEST_T[t].up; return u ? { gems: u.gems, coins: Math.max(200, C.priceBase() * u.sec) } : null; };
  function upgradeChest(id) {
    const s = S(), ch = s.chests.find((c) => c.id === id);
    if (!ch || ch.t >= 5) return false;
    const cost = chestUpCost(ch.t);
    if (s.gems < cost.gems || s.coins < cost.coins) return false;
    spendGems(cost.gems); spend(cost.coins);
    ch.t++;
    E.emit('chest');
    return true;
  }
  function fuseChests(tier) {
    const s = S();
    if (tier >= 5 || chestCount(tier) < 3) return null;
    for (let k = 0; k < 3; k++) s.chests.splice(s.chests.findIndex((c) => c.t === tier), 1);
    return addChest(tier + 1, 'fusion');
  }
  function buyChest(tier) {
    const price = CHEST_PRICE[tier];
    if (!price || !spendGems(price)) return null;
    return addChest(tier, 'boutique');
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

  // ---------- Donjons à paliers ----------
  // Un palier gagné : pièces, chance d'objet, XP de classe ; tous les 10 paliers, un coffre plus rare
  function floorWin(d, mode, fl, kind) {
    const s = S(), dg = D.DUNGEONS[d], M = D.MODES[mode];
    const F = s.dungeon.floors[dg.id] || (s.dungeon.floors[dg.id] = [0, 0, 0]);
    const best = F[mode] || 0;
    const first = fl > best;
    const r = { coins: 0, gems: 0, items: [], chest: null, first, clear: null, pet: null };
    const dEff = d + (fl - 1) / D.FLOORS;
    r.coins = Math.max(15 * Math.pow(3, dEff), C.priceBase() * 12 * (1 + dEff * 0.3)) * (mode + 1) * (1 + C.bonus('loot')) * (kind === 'boss' ? 4 : kind === 'guard' ? 2 : 1);
    addCoins(r.coins);
    const ilvl = Math.round(dEff * 10) + M.ilvl + U.randInt(0, 3);
    if (kind !== 'mob') {
      r.gems = 1 + d + mode * 2 + (kind === 'boss' ? 3 : 0);
      addGems(r.gems);
      r.items.push(addItem(makeItem(null, ilvl + 2, rollRarity(1.8 * M.rar, 1, 5))));
      const pid = dg.pet;
      if (kind === 'boss' && !s.pets.includes(pid) && Math.random() < 0.03 * (mode + 1)) { unlockPet(pid); r.pet = pid; }
      s.life.bosses++; daily('boss');
    } else if (Math.random() < 0.12 + mode * 0.06) {
      r.items.push(addItem(makeItem(null, ilvl, rollRarity(M.rar, 0, 5))));
    }
    if (Math.random() < 0.08) { s.potions = Math.min(20, s.potions + 1); r.potion = 1; }
    if (fl % 10 === 0) {
      const tier = first ? Math.min(5, fl / 10 + mode) : Math.max(0, fl / 10 - 1 + mode);
      r.chest = addChest(tier, 'palier ' + fl);
    }
    if (first) F[mode] = fl;
    s.life.floors = 0;
    for (const id in s.dungeon.floors) s.life.floors += (s.dungeon.floors[id] || []).reduce((a, b) => a + (b || 0), 0);
    if (s.life.floors >= 100) unlockSkin('givre');
    addClassXP(C.cls(), 6 * (d + 1) * (mode + 1) * (kind === 'mob' ? 1 : 3));
    s.life.wins++;
    daily('win');
    lootHooks('floor', { d, mode, fl, kind, first }, r);
    if (first && fl === D.FLOORS) r.clear = dungeonClear(d, mode);
    C.dirty();
    E.emit('coins'); E.emit('dungeon');
    checkAch();
    return r;
  }
  function dungeonClear(d, mode) {
    const s = S(), dg = D.DUNGEONS[d];
    const out = { first: true, skin: null, item: null, pet: null, gems: 0 };
    if (mode === 0) {
      s.dungeon.cleared = D.DUNGEONS.filter((x, i) => C.floor(i, 0) >= D.FLOORS).length;
      if (unlockSkin(dg.first.skin)) out.skin = dg.first.skin;
      out.item = addItem(makeUnique(dg.first.item));
      out.gems = 20 + d * 10;
    } else if (mode === 1) {
      if (unlockPet(dg.pet)) out.pet = dg.pet;
      out.gems = 40 + d * 15;
    } else {
      out.item = addItem(makeItem(null, d * 10 + 15, 5));
      out.gems = 100 + d * 20;
      if (unlockSkin('dragon')) out.skin = 'dragon';
    }
    out.items = [];
    lootHooks('clear', { d, mode }, out);
    addGems(out.gems);
    return out;
  }

  // ---------- Classes, capacités, grimoires, potions ----------
  function addClassXP(cls, n) {
    if (!cls || !(n > 0)) return;
    const cd = C.clsData(cls);
    cd.xp += n;
    let ups = 0;
    while (cd.lvl < 50 && cd.xp >= C.clsXpNeed(cd.lvl)) { cd.xp -= C.clsXpNeed(cd.lvl); cd.lvl++; cd.pts++; ups++; }
    if (ups) { C.dirty(); E.emit('clsup', { cls, lvl: cd.lvl }); }
  }
  function setClass(id) {
    const s = S();
    if (!D.CLASSES[id]) return false;
    s.cls = id;
    C.clsData(id);
    // les deux capacités de niveau 1 sont offertes
    for (const a of D.AB) if (a.cls === id && a.lvl === 1 && !s.abRanks[a.id]) s.abRanks[a.id] = 1;
    C.dirty();
    C.autoLoadout();
    E.emit('cls'); E.emit('look');
    return true;
  }
  function rankUp(abId) {
    const s = S(), a = D.ABI[abId];
    if (!a || !a.cls) return false;
    const cd = C.clsData(a.cls), r = s.abRanks[abId] || 0;
    if (cd.lvl < a.lvl || cd.pts < 1 || r >= 5) return false;
    cd.pts--;
    s.abRanks[abId] = r + 1;
    if (r === 0 && a.cls === C.cls() && s.loadout.length < C.abilitySlots()) s.loadout.push(abId);
    C.dirty();
    E.emit('ability');
    return true;
  }
  function toggleLoadout(abId) {
    const s = S();
    if (s.loadout.includes(abId)) s.loadout = s.loadout.filter((x) => x !== abId);
    else if (C.abRank(abId) > 0 && s.loadout.length < C.abilitySlots()) s.loadout.push(abId);
    else return false;
    E.emit('loadout');
    return true;
  }
  const scrollPrice = (a) => (a.scroll.gems ? { gems: a.scroll.gems } : { coins: Math.max(a.scroll.coins, C.priceBase() * a.scroll.coins / 6) });
  function buyScroll(abId) {
    const s = S(), a = D.ABI[abId];
    if (!a || !a.scroll || s.scrolls.includes(abId)) return false;
    const pr = scrollPrice(a);
    if (pr.gems ? !spendGems(pr.gems) : !spend(pr.coins)) return false;
    s.scrolls.push(abId);
    if (s.loadout.length < C.abilitySlots()) s.loadout.push(abId);
    E.emit('ability');
    return true;
  }
  const potionPrice = () => Math.max(60, C.priceBase() * 90);
  function buyPotions(n) {
    const s = S();
    n = Math.min(n, 20 - s.potions);
    if (n <= 0 || !spend(potionPrice() * n)) return 0;
    s.potions += n;
    E.emit('inv');
    return n;
  }

  // ---------- Échanges ----------
  const TRADE_EVERY = 3 * 3600000;
  function trends() {
    const r = U.rng(U.hash('trend' + U.dayIndex()));
    const out = {};
    for (const sl of D.SLOTS) out[sl.id] = Math.round((0.75 + r() * 0.7) * 100) / 100;
    return out;
  }
  function traderMult(tr, it) {
    let m = trends()[it.slot] || 1;
    if (tr.pref === 'weapon') m *= it.slot === 'weapon' ? 1.3 : 0.85;
    else if (tr.pref === 'armor') m *= ['head', 'top', 'hands', 'legs', 'feet'].includes(it.slot) ? 1.25 : 0.85;
    else if (tr.pref === 'acc') m *= it.slot === 'acc' ? 1.35 : 0.85;
    else if (tr.pref === 'rare') m *= it.r >= 3 ? 1.3 : 0.5;
    return m;
  }
  function tradeRefresh(force) {
    const s = S();
    if (!force && s.trade.offers.length && Date.now() - s.trade.t < TRADE_EVERY) return;
    s.trade.offers = D.TRADERS.map((tr) => {
      const isChest = Math.random() < 0.3;
      if (isChest) {
        const tier = U.weighted([[1, 30], [2, 40], [3, 22], [4, 8]]);
        return { id: U.uid(), tr: tr.id, chest: tier, ask: Math.round(D.CHEST_T[tier].val * tr.mk) };
      }
      const slot = tr.pref === 'weapon' ? 'weapon' : tr.pref === 'acc' ? 'acc' : tr.pref === 'armor' ? U.pick(['head', 'top', 'hands', 'legs', 'feet']) : null;
      const it = makeItem(slot, refIlvl() + U.randInt(2, 6), rollRarity(tr.pref === 'rare' ? 3.5 : 2.4, tr.pref === 'rare' ? 3 : 2, 5));
      return { id: U.uid(), tr: tr.id, item: it, ask: Math.round(C.itemValue(it) * tr.mk) };
    });
    s.trade.t = Date.now();
    E.emit('trade');
  }
  function offerPay(offer, ids) {
    const s = S(), tr = D.TRADERS.find((x) => x.id === offer.tr);
    let v = 0;
    for (const id of ids) { const it = s.inv.find((x) => x.id === id); if (it) v += C.itemValue(it) * traderMult(tr, it); }
    return Math.round(v);
  }
  function doTrade(offerId, ids) {
    const s = S(), off = s.trade.offers.find((o) => o.id === offerId);
    if (!off || off.done) return null;
    const items = ids.map((id) => s.inv.find((x) => x.id === id)).filter(Boolean);
    if (!items.length || items.some((it) => isEquipped(it) || it.lock)) return null;
    if (offerPay(off, ids) < off.ask) return null;
    s.inv = s.inv.filter((x) => !ids.includes(x.id));
    off.done = true;
    const out = {};
    if (off.chest != null) out.chest = addChest(off.chest, 'échange');
    else { const it = Object.assign({}, off.item, { id: U.uid() }); out.item = addItem(it); }
    s.life.trades = (s.life.trades || 0) + 1;
    E.emit('trade'); E.emit('inv');
    checkAch();
    return out;
  }
  // Échange entre amis : un objet devient un code, ton pote le récupère
  const SALT = 'dt-pompes-et-dragons';
  function b64e(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64d(str) { return decodeURIComponent(escape(atob(str))); }
  function itemToCode(id) {
    const s = S(), it = s.inv.find((x) => x.id === id);
    if (!it || isEquipped(it) || it.lock) return null;
    const i = Object.assign({}, it);
    delete i.id; delete i.lock;
    const json = JSON.stringify({ v: 1, i, u: U.uid(), n: s.nick });
    const code = 'DT-' + b64e(json) + '-' + U.hash(json + SALT).toString(36);
    s.inv = s.inv.filter((x) => x.id !== id);
    E.emit('inv');
    return code;
  }
  function codeToItem(code) {
    const s = S();
    const m = String(code || '').trim().match(/^DT-([A-Za-z0-9+/=]+)-([a-z0-9]+)$/);
    if (!m) return { err: 'Ce code ne ressemble pas à un code d\'objet.' };
    let json, o;
    try { json = b64d(m[1]); o = JSON.parse(json); } catch (e) { return { err: 'Code illisible : vérifie qu\'il est complet.' }; }
    if (U.hash(json + SALT).toString(36) !== m[2]) return { err: 'Code modifié ou incomplet.' };
    if (!o.i || !D.SLOTS.find((x) => x.id === o.i.slot) || !D.RAR[o.i.r]) return { err: 'Objet inconnu.' };
    if (s.trade.redeemed.includes(o.u)) return { err: 'Ce code a déjà été utilisé.' };
    s.trade.redeemed.push(o.u);
    if (s.trade.redeemed.length > 300) s.trade.redeemed.shift();
    const it = addItem(Object.assign({}, o.i, { id: U.uid(), plus: Math.min(10, o.i.plus || 0) }));
    s.life.trades = (s.life.trades || 0) + 1;
    checkAch();
    return { item: it, from: String(o.n || 'un ami').slice(0, 16) };
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
    return addChest(1, 'quêtes');
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
    if (!s.raid.hits) { const a = Math.max(20, C.stats().atk); s.raid.th = [12, 50, 120, 250].map((k) => Math.round(a * k)); }
    return s.raid;
  }
  const RAID_REW = [
    { gems: 10, sec: 600, chest: 1 }, { gems: 20, sec: 1200, chest: 2 }, { gems: 35, chest: 3, sec: 1800 }, { gems: 60, chest: 4, skin: 'spartan', sec: 3600 },
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
    if (rw.chest) out.chest = addChest(rw.chest, 'raid');
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
    unlockSkin('cosmique');
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
    shopRefresh, buyShop, shopPrice, SHOP_EVERY, enchant, enchantCost, canEnchant, addChest, chestCount, openChest, chestUpCost, upgradeChest, fuseChests, buyChest, CHEST_PRICE,
    unlockSkin, buySkin, setSkin, unlockPet, setPet,
    floorWin, dungeonClear,
    addClassXP, setClass, rankUp, toggleLoadout, scrollPrice, buyScroll, potionPrice, buyPotions,
    trends, traderMult, tradeRefresh, offerPay, doTrade, TRADE_EVERY, itemToCode, codeToItem,
    dailyCheck, questProgress, claimQuest, claimAllBonus, claimDailyChest, checkAch,
    raidState, raidAddDamage, raidClaim, raidCommunity, RAID_REW,
    prestige, tick, energyNextIn, offline,
  };
})(window.DT);
