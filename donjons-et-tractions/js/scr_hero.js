'use strict';
// Donjons & Tractions v2 — le Héros : classe et capacités, équipement, sac, coffres, apparences
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h, P = DT.P, UI = DT.UI;
  const SCR = { tabbed: true };
  const SUBS = [['cls', 'Classe'], ['eq', 'Stuff'], ['bag', 'Sac'], ['chests', 'Coffres'], ['style', 'Style']];
  let sub = 'cls', els = {}, slotF = 'all', anim = null;

  const heroAnim = (pose, o = {}) => DT.PoseAnim(pose, Object.assign({ w: 64, h: 56, wcls: 'mid hero-anim', look: () => C.heroLook(), bg: '#1a1c2c' }, o));
  function bonusTxt(bn) {
    if (!bn) return 'Aucun bonus';
    const [k, v] = bn;
    if (k === 'spd') return '+' + v + ' VIT';
    return '+' + Math.round(v * 100) + '% ' + (D.STAT_NAMES[k] || k);
  }
  function clsBonusTxt(cl) {
    const f = (k, v, per) => k === 'spd' ? '+' + (per ? v.toFixed(2) : v) + ' VIT' : k === 'mp' ? '+' + v + ' mana' : '+' + (v * 100).toFixed(per ? 1 : 0) + '% ' + D.STAT_NAMES[k];
    const a = Object.keys(cl.bonus).map((k) => f(k, cl.bonus[k]));
    const b = Object.keys(cl.perLvl).map((k) => f(k, cl.perLvl[k], true) + '/niv.');
    return a.concat(b).join(' · ');
  }

  SCR.render = function (root) {
    els.tabs = h('div', { class: 'seg', role: 'tablist' });
    els.body = h('div');
    root.append(h('h1', { class: 'scr-t', text: 'Héros' }), els.tabs, els.body);
    const on = (ev, list) => DT.E.on(ev, () => { if (SCR.root && !SCR.root.hidden && list.includes(sub)) draw(); });
    on('inv', ['eq', 'bag']);
    on('look', ['eq', 'style']);
    on('chest', ['chests']);
    on('ability', ['cls']);
    on('loadout', ['cls']);
    on('clsup', ['cls']);
    on('cls', ['cls', 'eq', 'style']);
    drawTabs(); draw();
  };
  SCR.tab = (t) => { sub = t; drawTabs(); draw(); };
  function drawTabs() {
    const S = DT.S;
    const pts = S.cls ? C.clsData(C.cls()).pts : 0;
    U.clear(els.tabs).append(...SUBS.map(([id, n]) => {
      const badge = id === 'cls' ? pts : id === 'chests' ? S.chests.length : 0;
      return h('button', { type: 'button', role: 'tab', class: sub === id ? 'on' : '', 'aria-selected': sub === id ? 'true' : 'false', on: { click: () => { sub = id; drawTabs(); draw(); } } }, n, badge ? h('i', { class: 'seg-badge', text: badge > 9 ? '9+' : String(badge) }) : null);
    }));
  }
  function draw() {
    if (anim) { anim.stop(); anim = null; }
    drawTabs();
    const b = U.clear(els.body);
    if (sub === 'cls') drawCls(b);
    else if (sub === 'eq') drawEq(b);
    else if (sub === 'bag') drawBag(b);
    else if (sub === 'chests') drawChests(b);
    else drawStyle(b);
  }

  // ---------- Classe & capacités ----------
  function drawCls(b) {
    const S = DT.S;
    if (!S.cls) {
      b.append(h('div', { class: 'card center' }, h('h3', { text: 'Choisis ta classe' }), h('p', { text: 'Ton héros a besoin d\'une voie. Chaque classe progresse avec une famille d\'exercices réels.' }), UI.btn('Choisir ma classe', () => SCR.pickClass(), { cls: 'gold wide' })));
      return;
    }
    const id = C.cls(), cl = D.CLASSES[id], cd = C.clsData(id), st = C.stats();
    anim = heroAnim('heroidle');
    const need = C.clsXpNeed(cd.lvl);
    b.append(h('div', { class: 'card doll clscard', style: { '--c': cl.c } }, anim.el, h('div', { class: 'grow' },
      h('div', { class: 'row between' }, h('b', { class: 'cls-n', text: cl.n }), h('span', { class: 'pill', text: 'Niv. ' + cd.lvl })),
      UI.bar(cd.lvl >= 50 ? 1 : cd.xp / need, 'xp'),
      h('small', { class: 'muted', text: cd.lvl >= 50 ? 'Niveau maximum !' : U.fmt(cd.xp) + ' / ' + U.fmt(need) + ' XP de classe' }),
      h('small', { text: clsBonusTxt(cl) }),
      h('div', { class: 'mini-stats' }, h('span', {}, UI.icon('sword'), U.fmt(st.atk)), h('span', {}, UI.icon('heart'), U.fmt(st.hp)), h('span', {}, UI.icon('shield'), U.fmt(st.def)), h('span', { class: 'mp-t' }, 'MP ' + st.mp)),
      UI.btn('Changer de classe', () => SCR.pickClass(), { cls: 'ghost sm' }))));
    if (cd.pts) b.append(h('div', { class: 'card pts' }, UI.icon('star', 'big'), h('div', { class: 'grow' }, h('b', { text: cd.pts + ' point' + (cd.pts > 1 ? 's' : '') + ' de capacité' }), h('small', { text: 'Apprends une nouvelle capacité ou monte-en une (rang 5 max : +15 % de puissance par rang, et -1 tour de recharge au rang 5).' }))));
    // emplacements de combat
    const slots = C.abilitySlots();
    const lo = h('div', { class: 'loadout' });
    for (let i = 0; i < slots; i++) {
      const aid = S.loadout[i], a = aid && D.ABI[aid];
      lo.append(h('div', { class: 'lo' + (a ? '' : ' empty'), style: a ? { '--c': DT.BT.abColor(aid) } : null }, a ? a.n : 'Emplacement libre'));
    }
    b.append(h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'EN COMBAT ' + S.loadout.length + '/' + slots }), UI.btn('Auto', () => { C.autoLoadout(); DT.E.emit('loadout'); }, { cls: 'ghost sm' })), lo);
    b.append(h('p', { class: 'muted', text: 'Ta classe gagne de l\'XP quand tu fais pour de vrai des exercices de ' + D.BRANCHES[cl.br].n + ', quand tu montes des skills de cette famille et en donjon. Chaque niveau = 1 point de capacité.' }));
    // capacités de la classe
    b.append(h('h3', { text: 'Capacités de ' + cl.n }));
    const list = h('div', { class: 'ablist' });
    D.AB.filter((a) => a.cls === id).forEach((a) => list.append(abCard(a, cd)));
    b.append(list);
    // grimoires & enchantements
    const extra = C.abKnown().filter((x) => !D.ABI[x].cls);
    b.append(h('h3', { text: 'Grimoires & enchantements' }));
    if (!extra.length) b.append(h('p', { class: 'muted', text: 'Achète des grimoires au Marché (toutes classes) ou équipe une arme Légendaire/Mythique enchantée pour gagner des capacités en plus.' }));
    else { const l2 = h('div', { class: 'ablist' }); extra.forEach((x) => l2.append(abCard(D.ABI[x], cd))); b.append(l2); }
    b.append(UI.btn('Voir les grimoires', () => { UI.go('market'); DT.SCR.market.tab('scroll'); }, { cls: 'ghost wide' }));
  }
  function abCard(a, cd) {
    const S = DT.S, r = C.abRank(a.id), locked = a.cls && cd.lvl < a.lvl;
    const sc = r ? C.abScaled(a.id) : a;
    const inLo = S.loadout.includes(a.id);
    const pips = h('span', { class: 'pips' });
    if (a.cls) for (let i = 1; i <= 5; i++) pips.append(h('i', { class: i <= r ? 'on' : '' }));
    const acts = h('div', { class: 'row gap' });
    if (locked) acts.append(h('small', { class: 'muted', text: 'Niveau ' + a.lvl + ' requis' }));
    else if (a.cls && r < 5) acts.append(UI.btn(r ? 'Rang ' + (r + 1) + ' (1 pt)' : 'Apprendre (1 pt)', () => {
      if (DT.G.rankUp(a.id)) { DT.A.play('lvl'); UI.toast(a.n + (r ? ' rang ' + (r + 1) : ' apprise') + ' !', 'gold'); }
      else { DT.A.play('error'); UI.toast('Pas de point de capacité : monte ta classe en t\'entraînant.', 'bad'); }
    }, { cls: 'gold sm', disabled: cd.pts < 1 }));
    if (r) acts.append(UI.btn(inLo ? 'Retirer du combat' : 'En combat', () => {
      if (!DT.G.toggleLoadout(a.id)) UI.toast('Tes ' + C.abilitySlots() + ' emplacements sont pleins : retire une capacité d\'abord.', 'bad');
    }, { cls: inLo ? 'ghost sm' : 'go sm' }));
    return h('div', { class: 'abcard card' + (locked ? ' locked' : '') + (inLo ? ' inlo' : ''), style: { '--c': DT.BT.abColor(a.id) } },
      h('div', { class: 'row between' }, h('b', { text: a.n }), pips),
      h('small', { class: 'muted', text: UI.abSrc(a) + ' · ' + UI.abMeta(sc) }),
      h('p', { text: UI.abDesc(sc) }), acts);
  }
  SCR.pickClass = function (onDone, o = {}) {
    const S = DT.S;
    UI.sheet({ title: S.cls ? 'Changer de classe' : 'Choisis ta classe', modal: !!o.modal, body: (el, close) => {
      if (o.intro) el.append(h('p', { class: 'lead', text: o.intro }));
      el.append(h('p', { class: 'muted', text: 'Chaque classe garde son niveau et ses capacités : tu peux en changer quand tu veux, gratuitement. Elle progresse avec sa famille d\'exercices réels.' }));
      D.CLASS_ORDER.forEach((id) => {
        const cl = D.CLASSES[id], cd = S.classes[id];
        el.append(h('div', { class: 'clspick card' + (S.cls === id ? ' on' : ''), style: { '--c': cl.c } },
          h('img', { class: 'thumb', src: P.poseThumb('stance', C.heroLook({ cls: id, skin: 'base', gear: false }), 44), alt: '' }),
          h('div', { class: 'grow' }, h('div', { class: 'row between' }, h('b', { class: 'cls-n', text: cl.n }), h('small', { text: cd ? 'Niv. ' + cd.lvl : 'Nouveau' })),
            h('small', { class: 'pill', style: { color: D.BRANCHES[cl.br].c }, text: 'Exos : ' + D.BRANCHES[cl.br].n }),
            h('p', { text: cl.desc }), h('small', { class: 'muted', text: clsBonusTxt(cl) }),
            S.cls === id ? h('i', { class: 'tag', text: 'ACTUELLE' }) : UI.btn('Choisir ' + cl.n, () => {
              DT.G.setClass(id); DT.A.play('ach'); close();
              UI.toast('Tu es maintenant ' + cl.n + ' !', 'gold', true);
              onDone && onDone(id);
            }, { cls: 'go sm' }))));
      });
    } });
  };

  // ---------- Équipement ----------
  function drawEq(b) {
    const S = DT.S, st = C.stats();
    anim = heroAnim('stance', { h: 60 });
    const gearT = h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: S.settings.showGear !== false, on: { change: (e) => { S.settings.showGear = e.target.checked; DT.E.emit('look'); } } }), h('span', { text: 'Montrer le stuff' }));
    b.append(h('div', { class: 'card doll' }, anim.el, h('div', { class: 'grow' },
      h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'PUISSANCE' }), h('b', { class: 'big-n', text: U.fmtInt(C.power(st)) })),
      h('ul', { class: 'stats tight' },
        h('li', {}, h('span', { text: 'ATK' }), h('b', { text: U.fmt(st.atk) })), h('li', {}, h('span', { text: 'PV' }), h('b', { text: U.fmt(st.hp) })),
        h('li', {}, h('span', { text: 'DEF' }), h('b', { text: U.fmt(st.def) })), h('li', {}, h('span', { text: 'VIT' }), h('b', { text: st.spd.toFixed(1) })),
        h('li', {}, h('span', { text: 'CRIT' }), h('b', { text: (st.crit * 100).toFixed(1) + '% · x' + st.cdmg.toFixed(2) })),
        h('li', {}, h('span', { text: 'MANA' }), h('b', { text: st.mp }))), gearT)));
    const bl = ['prod', 'rep', 'xp', 'loot'].filter((k) => C.bonus(k) > 0).map((k) => '+' + (C.bonus(k) * 100).toFixed(0) + '% ' + D.STAT_NAMES[k]);
    if (bl.length) b.append(h('p', { class: 'muted center', text: 'Bonus actifs : ' + bl.join(' · ') }));
    D.SLOTS.forEach((sl) => {
      const it = S.eq[sl.id] && DT.G.findItem(S.eq[sl.id]);
      const count = S.inv.filter((x) => x.slot === sl.id && x.id !== S.eq[sl.id]).length;
      b.append(h('div', { class: 'slot' }, h('span', { class: 'lbl', text: sl.n.toUpperCase() + (count ? ' · ' + count + ' en réserve' : '') }),
        it ? UI.itemRow(it, { onClick: () => UI.itemSheet(it) }) : h('button', { type: 'button', class: 'item empty', on: { click: () => pickSlot(sl.id) } }, h('span', { text: count ? 'Vide : tape pour choisir' : 'Vide : trouve du stuff en donjon ou au Marché' })),
        count ? UI.btn('Changer', () => pickSlot(sl.id), { cls: 'ghost sm' }) : null));
    });
    b.append(UI.btn('Équiper le meilleur partout', () => {
      let n = 0;
      D.SLOTS.forEach((sl) => {
        const cands = S.inv.filter((x) => x.slot === sl.id);
        if (!cands.length) return;
        const best = cands.sort((a, b2) => C.itemScore(b2) - C.itemScore(a))[0];
        if (S.eq[sl.id] !== best.id) { DT.G.equip(best.id); n++; }
      });
      UI.toast(n ? n + ' objet' + (n > 1 ? 's' : '') + ' équipé' + (n > 1 ? 's' : '') : 'Tu portes déjà le meilleur.', n ? 'good' : '');
    }, { cls: 'gold wide' }));
  }
  function pickSlot(slot) {
    const S = DT.S;
    UI.sheet({ title: 'Choisir : ' + D.SLOTS.find((s) => s.id === slot).n, body: (el, close) => {
      const items = S.inv.filter((x) => x.slot === slot).sort((a, b) => C.itemScore(b) - C.itemScore(a));
      if (!items.length) el.append(h('p', { class: 'muted', text: 'Aucun objet pour cet emplacement.' }));
      items.forEach((it) => el.append(UI.itemRow(it, { onClick: () => { close(); UI.itemSheet(it); } })));
    } });
  }

  // ---------- Sac ----------
  function drawBag(b) {
    const S = DT.S;
    b.append(h('div', { class: 'card offer' }, UI.icon('potion', 'big'), h('div', { class: 'grow' }, h('b', { text: 'Potions : ' + S.potions }), h('small', { text: 'Soignent 40 % de tes PV en combat (3 max par combat).' })),
      UI.btn('Acheter', () => { UI.go('market'); DT.SCR.market.tab('shop'); }, { cls: 'ghost sm' })));
    b.append(h('div', { class: 'chips' }, [['all', 'Tout']].concat(D.SLOTS.map((s) => [s.id, s.n])).map(([id, n]) =>
      h('button', { type: 'button', class: 'chip-b' + (slotF === id ? ' on' : ''), on: { click: () => { slotF = id; draw(); } } }, n))));
    const items = S.inv.filter((x) => slotF === 'all' || x.slot === slotF)
      .sort((a, b2) => (DT.G.isEquipped(b2) - DT.G.isEquipped(a)) || (b2.r - a.r) || (b2.ilvl - a.ilvl));
    const tot = S.inv.reduce((s, x) => s + C.itemValue(x), 0);
    b.append(h('div', { class: 'row between' }, h('small', { class: 'muted', text: S.inv.length + ' objets · valeur totale' }), UI.val(tot)));
    if (!items.length) b.append(h('div', { class: 'card empty-st' }, h('p', { text: 'Ton sac est vide. Les donjons, les coffres et le Marché donnent du stuff.' }), UI.btn('Aller en donjon', () => UI.go('dungeon'), { cls: 'go' })));
    const list = h('div', { class: 'itemlist' });
    items.forEach((it) => list.append(UI.itemRow(it, { onClick: () => UI.itemSheet(it) })));
    b.append(list);
    const cheap = S.inv.filter((x) => x.r <= 1 && !DT.G.isEquipped(x) && !x.lock && !x.uq);
    if (cheap.length) b.append(UI.btn('Vendre les Communs et Peu communs (' + cheap.length + ')', async () => {
      const t = cheap.reduce((s, x) => s + DT.G.sellValue(x), 0);
      const ok = await UI.confirm({ title: 'Vente groupée', text: cheap.length + ' objets pour ' + U.fmt(t) + ' pièces ? (Astuce : les marchands du Marché en donnent souvent plus en échange.)', ok: 'Vendre' });
      if (ok) { const r = DT.G.sellBelow(1); DT.A.play('coin'); UI.toast('+' + U.fmt(r.tot) + ' pièces', 'good'); }
    }, { cls: 'ghost wide' }));
  }

  // ---------- Coffres ----------
  function drawChests(b) {
    const S = DT.S, G = DT.G;
    b.append(h('p', { class: 'muted', text: 'Coffres gagnés tous les 10 paliers de donjon, en séance guidée, en quêtes, au raid et chez les marchands. Améliore-les ou fusionne 3 coffres identiques pour viser des objets plus rares.' }));
    if (!S.chests.length) b.append(h('div', { class: 'card empty-st' }, UI.chestImg(0, 'big'), h('p', { text: 'Aucun coffre pour l\'instant. Le palier 10 de chaque donjon en donne un !' }), UI.btn('Aller en donjon', () => UI.go('dungeon'), { cls: 'go' })));
    for (let t = 5; t >= 0; t--) {
      const list = S.chests.filter((c) => c.t === t);
      if (!list.length) continue;
      const T = D.CHEST_T[t], up = G.chestUpCost(t);
      const acts = h('div', { class: 'acts' },
        UI.btn(list.length > 1 ? 'Ouvrir 1' : 'Ouvrir', () => UI.openChests([list[0].id]), { cls: 'go' }),
        list.length > 1 ? UI.btn('Tout ouvrir (' + list.length + ')', () => UI.openChests(list.map((c) => c.id)), { cls: 'gold' }) : null,
        up ? UI.btn(h('span', {}, 'Améliorer ', UI.gems(up.gems), ' ', UI.coins(up.coins)), () => {
          if (G.upgradeChest(list[0].id)) { DT.A.play('buy'); UI.toast('Coffre amélioré : ' + D.CHEST_T[t + 1].n + ' !', 'gold'); }
          else { DT.A.play('error'); UI.toast('Il manque des éclats ou des pièces.', 'bad'); }
        }, { cls: 'gemb', disabled: S.gems < up.gems || S.coins < up.coins }) : null,
        t < 5 && list.length >= 3 ? UI.btn('Fusionner 3 → ' + D.CHEST_T[t + 1].n, () => { if (G.fuseChests(t)) { DT.A.play('ach'); UI.toast('Fusion réussie : ' + D.CHEST_T[t + 1].n + ' !', 'gold'); } }, { cls: 'ghost' }) : null);
      b.append(h('div', { class: 'card chestcard', style: { '--c': T.c } }, h('div', { class: 'row gap' }, UI.chestImg(t, 'big'),
        h('div', { class: 'grow' }, h('div', { class: 'row between' }, h('b', { text: T.n }), h('b', { class: 'cnt', text: 'x' + list.length })),
          h('small', { text: chestTxt(t) }))), acts));
    }
    // tableau des coffres
    const tb = h('div', { class: 'chesttable' });
    D.CHEST_T.forEach((T, t) => tb.append(h('div', { class: 'ct-row' }, UI.chestImg(t), h('div', { class: 'grow' }, h('b', { style: { color: T.c }, text: T.n }), h('small', { text: chestTxt(t) })))));
    b.append(h('details', { class: 'card' }, h('summary', { text: 'Les 6 niveaux de coffres' }), tb));
  }
  function chestTxt(t) {
    const T = D.CHEST_T[t];
    return T.items + ' objet' + (T.items > 1 ? 's' : '') + ' · ' + D.RAR[T.min].n + ' minimum' + (T.gems ? ' · ' + T.gems + ' éclats' : '') + (T.skin ? ' · apparence rare possible' : '');
  }

  // ---------- Style ----------
  function drawStyle(b) {
    const S = DT.S;
    anim = heroAnim('triumph', { h: 60 });
    b.append(h('div', { class: 'card doll' }, anim.el, h('div', { class: 'grow' }, h('b', { text: S.nick }), h('small', { text: D.SKIN[S.skin].n + ' · ' + bonusTxt(D.SKIN[S.skin].bonus) }),
      S.pet ? h('small', { text: 'Familier : ' + D.PET[S.pet].n + ' · ' + bonusTxt(D.PET[S.pet].bonus) }) : null,
      h('small', { class: 'muted', text: 'Les apparences changent ton héros en donjon. Côté sport, ton athlète reste… toi.' }),
      UI.btn('Changer de pseudo', () => DT.SCR.settings.nick(), { cls: 'ghost sm' }))));
    b.append(h('h3', { text: 'Apparences ' + S.skins.length + '/' + D.SKINS.length }));
    const grid = h('div', { class: 'thumbs' });
    D.SKINS.forEach((sk) => {
      const own = S.skins.includes(sk.id);
      const L = C.heroLook({ skin: sk.id, gear: false });
      grid.append(h('button', { type: 'button', class: 'thumbbtn' + (S.skin === sk.id ? ' on' : '') + (own ? '' : ' lockd'), on: { click: () => {
        if (own) { DT.G.setSkin(sk.id); DT.A.play('click'); }
        else UI.toast(sk.n + ' : ' + sk.src, '');
      } } }, h('img', { class: 'thumb', src: own ? P.poseThumb('heroidle', L, 44) : P.poseThumb('heroidle', L, 44, 0, '#475069'), alt: '' }), h('small', { text: own ? sk.n : '???' }), h('em', { text: own ? bonusTxt(sk.bonus) : sk.src })));
    });
    b.append(grid);
    b.append(h('h3', { text: 'Familiers ' + S.pets.length + '/' + D.PETS.length }));
    const pg = h('div', { class: 'thumbs' });
    pg.append(h('button', { type: 'button', class: 'thumbbtn' + (!S.pet ? ' on' : ''), on: { click: () => DT.G.setPet(null) } }, h('span', { class: 'thumb none', text: '—' }), h('small', { text: 'Aucun' })));
    D.PETS.forEach((pt) => {
      const own = S.pets.includes(pt.id);
      pg.append(h('button', { type: 'button', class: 'thumbbtn' + (S.pet === pt.id ? ' on' : '') + (own ? '' : ' lockd'), on: { click: () => { if (own) DT.G.setPet(pt.id); else UI.toast(pt.n + ' : ' + pt.src, ''); } } },
        h('img', { class: 'thumb pet', src: own ? P.spriteURL(P.SPR[pt.spr], pt.pal, 3) : P.silURL(P.SPR[pt.spr]), alt: '' }), h('small', { text: own ? pt.n : '???' }), h('em', { text: own ? bonusTxt(pt.bonus) : pt.src })));
    });
    b.append(pg);
    b.append(h('h3', { text: 'Ton visage' }), h('p', { class: 'muted', text: 'Peau, cheveux et coiffure : partagés par ton athlète et ton héros.' }));
    const swatches = (label, list, key) => h('div', { class: 'cfg' }, h('span', { class: 'lbl', text: label }), h('div', { class: 'swatches' }, list.map((c) =>
      h('button', { type: 'button', class: 'sw' + (S.look[key] === c ? ' on' : ''), style: { background: c }, 'aria-label': label + ' ' + c, on: { click: () => { S.look[key] = c; DT.E.emit('look'); } } }))));
    b.append(swatches('Peau', D.SKIN_TONES, 'skin'), swatches('Cheveux', D.HAIR_COLORS, 'hair'), swatches('T-shirt (athlète)', D.TOP_COLORS, 'top'),
      h('div', { class: 'cfg' }, h('span', { class: 'lbl', text: 'Coiffure' }), h('div', { class: 'chips' }, D.HAIR_STYLES.map(([id, n]) =>
        h('button', { type: 'button', class: 'chip-b' + (S.look.hs === id ? ' on' : ''), on: { click: () => { S.look.hs = id; DT.E.emit('look'); } } }, n)))));
  }

  SCR.show = function () { draw(); };
  SCR.hide = function () { if (anim) { anim.stop(); anim = null; } };
  SCR.badge = function () {
    const S = DT.S;
    return (S.cls ? C.clsData(C.cls()).pts : 1) + S.chests.length;
  };
  DT.SCR.hero = SCR;
})(window.DT);
