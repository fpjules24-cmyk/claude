'use strict';
// Donjons & Tractions — équipement, sac, boutique, apparence
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h, P = DT.P, UI = DT.UI;
  const SCR = { tabbed: true };
  let sub = 'eq', els = {}, slotF = 'all', anim = null;

  SCR.render = function (root) {
    els.tabs = h('div', { class: 'seg', role: 'tablist' });
    els.body = h('div');
    root.append(h('h1', { class: 'scr-t', text: 'Stuff' }), els.tabs, els.body);
    DT.E.on('inv', () => { if (!SCR.root.hidden && (sub === 'eq' || sub === 'bag')) draw(); });
    DT.E.on('shop', () => { if (!SCR.root.hidden && sub === 'shop') draw(); });
    DT.E.on('look', () => { if (!SCR.root.hidden) draw(); });
    drawTabs(); draw();
  };
  SCR.tab = (t) => { sub = t; drawTabs(); draw(); };
  function drawTabs() {
    U.clear(els.tabs).append(...[['eq', 'Équipement'], ['bag', 'Sac'], ['shop', 'Boutique'], ['style', 'Style']].map(([id, n]) =>
      h('button', { type: 'button', role: 'tab', class: sub === id ? 'on' : '', 'aria-selected': sub === id ? 'true' : 'false', on: { click: () => { sub = id; drawTabs(); draw(); } } }, n)));
  }
  function draw() {
    if (anim) { anim.stop(); anim = null; }
    const b = U.clear(els.body);
    if (sub === 'eq') drawEq(b);
    else if (sub === 'bag') drawBag(b);
    else if (sub === 'shop') drawShop(b);
    else drawStyle(b);
  }

  function drawEq(b) {
    const S = DT.S, st = C.stats();
    anim = DT.PoseAnim('fight', { w: 56, h: 44, wcls: 'mid' });
    b.append(h('div', { class: 'card doll' }, anim.el, h('div', { class: 'grow' },
      h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'PUISSANCE' }), h('b', { class: 'big-n', text: U.fmtInt(C.power(st)) })),
      h('ul', { class: 'stats tight' },
        h('li', {}, h('span', { text: 'ATK' }), h('b', { text: U.fmt(st.atk) })), h('li', {}, h('span', { text: 'PV' }), h('b', { text: U.fmt(st.hp) })),
        h('li', {}, h('span', { text: 'DEF' }), h('b', { text: U.fmt(st.def) })), h('li', {}, h('span', { text: 'VIT' }), h('b', { text: st.spd.toFixed(1) })),
        h('li', {}, h('span', { text: 'CRIT' }), h('b', { text: (st.crit * 100).toFixed(1) + '% · x' + st.cdmg.toFixed(2) }))))));
    const bonusKeys = ['prod', 'rep', 'xp', 'loot'];
    const bl = bonusKeys.filter((k) => C.bonus(k) > 0).map((k) => '+' + (C.bonus(k) * 100).toFixed(0) + '% ' + D.STAT_NAMES[k]);
    if (bl.length) b.append(h('p', { class: 'muted center', text: 'Bonus actifs : ' + bl.join(' · ') }));
    D.SLOTS.forEach((sl) => {
      const it = S.eq[sl.id] && DT.G.findItem(S.eq[sl.id]);
      const count = S.inv.filter((x) => x.slot === sl.id && x.id !== S.eq[sl.id]).length;
      b.append(h('div', { class: 'slot' }, h('span', { class: 'lbl', text: sl.n.toUpperCase() + (count ? ' · ' + count + ' en réserve' : '') }),
        it ? UI.itemRow(it, { onClick: () => UI.itemSheet(it) }) : h('button', { type: 'button', class: 'item empty', on: { click: () => pickSlot(sl.id) } }, h('span', { text: count ? 'Vide : tape pour choisir' : 'Vide : trouve du stuff en donjon ou en boutique' })),
        count ? UI.btn('Changer', () => pickSlot(sl.id), { cls: 'ghost sm' }) : null));
    });
    b.append(UI.btn('Équiper le meilleur partout', () => {
      let n = 0;
      D.SLOTS.forEach((sl) => {
        const cands = S.inv.filter((x) => x.slot === sl.id);
        if (!cands.length) return;
        const best = cands.sort((a, b2) => C.itemScore(b2) - C.itemScore(a))[0];
        if (S.eq[sl.id] !== best.id) { S.eq[sl.id] = best.id; n++; }
      });
      C.dirty(); DT.E.emit('inv');
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

  function drawBag(b) {
    const S = DT.S;
    b.append(h('div', { class: 'chips' }, [['all', 'Tout']].concat(D.SLOTS.map((s) => [s.id, s.n])).map(([id, n]) =>
      h('button', { type: 'button', class: 'chip-b' + (slotF === id ? ' on' : ''), on: { click: () => { slotF = id; draw(); } } }, n))));
    const items = S.inv.filter((x) => slotF === 'all' || x.slot === slotF)
      .sort((a, b2) => (DT.G.isEquipped(b2) - DT.G.isEquipped(a)) || (b2.r - a.r) || (b2.ilvl - a.ilvl));
    b.append(h('p', { class: 'muted', text: S.inv.length + ' objets. Les objets verrouillés et équipés ne sont jamais vendus.' }));
    if (!items.length) b.append(h('div', { class: 'card empty-st' }, h('p', { text: 'Ton sac est vide. Les donjons, la boutique et les coffres donnent du stuff.' }), UI.btn('Aller en donjon', () => UI.go('dungeon'), { cls: 'go' })));
    const list = h('div', { class: 'itemlist' });
    items.forEach((it) => list.append(UI.itemRow(it, { onClick: () => UI.itemSheet(it) })));
    b.append(list);
    const cheap = S.inv.filter((x) => x.r <= 1 && !DT.G.isEquipped(x) && !x.lock && !x.uq);
    if (cheap.length) b.append(UI.btn('Vendre les Communs et Peu communs (' + cheap.length + ')', async () => {
      const tot = cheap.reduce((s, x) => s + DT.G.sellValue(x), 0);
      const ok = await UI.confirm({ title: 'Vente groupée', text: cheap.length + ' objets pour ' + U.fmt(tot) + ' pièces ?', ok: 'Vendre' });
      if (ok) { const r = DT.G.sellBelow(1); DT.A.play('coin'); UI.toast('+' + U.fmt(r.tot) + ' pièces', 'good'); }
    }, { cls: 'ghost wide' }));
  }

  function drawShop(b) {
    const S = DT.S;
    DT.G.shopRefresh(false);
    const left = (DT.G.SHOP_EVERY - (Date.now() - S.shop.t)) / 1000;
    b.append(h('div', { class: 'row between' }, h('h3', { text: 'Marchand du parc' }), h('small', { class: 'muted', id: 'shopT', text: 'Nouveau stock dans ' + U.timeFmt(left) })));
    const list = h('div', { class: 'itemlist' });
    S.shop.items.forEach((it) => {
      const price = DT.G.shopPrice(it);
      const btn = it.sold ? h('i', { class: 'tag', text: 'VENDU' }) : UI.btn(UI.coins(price), () => {
        const got = DT.G.buyShop(it.id);
        if (got) { DT.A.play('buy'); UI.toast('Acheté : ' + got.n, 'good'); }
        else { DT.A.play('error'); UI.toast('Pas assez de pièces.', 'bad'); }
      }, { cls: 'gold sm', disabled: S.coins < price });
      list.append(UI.itemRow(it, { right: btn, cls: it.sold ? 'sold' : '', onClick: () => preview(it) }));
    });
    b.append(list);
    if (S.gemsOn) b.append(UI.btn(h('span', {}, 'Renouveler maintenant (', UI.icon('gem'), ' 10)'), () => {
      if (!DT.G.spendGems(10)) { UI.toast('Pas assez d\'éclats.', 'bad'); return; }
      DT.G.shopRefresh(true); DT.A.play('buy');
    }, { cls: 'ghost wide', disabled: S.gems < 10 }));
    // boutique d'éclats
    b.append(h('h3', { text: 'Boutique d\'éclats' }));
    if (!S.gemsOn) { b.append(h('p', { class: 'muted', text: 'Débloque ton deuxième skill pour gagner tes premiers éclats.' })); return; }
    const offer = (ico, name, desc, price, fn) => h('div', { class: 'offer' }, UI.icon(ico, 'big'), h('div', { class: 'grow' }, h('b', { text: name }), h('small', { text: desc })),
      UI.btn(UI.gems(price), () => { if (S.gems < price) { DT.A.play('error'); UI.toast('Pas assez d\'éclats.', 'bad'); return; } fn(); }, { cls: 'gemb sm', disabled: S.gems < price }));
    b.append(offer('chest', DT.G.CHESTS.gold.n, DT.G.CHESTS.gold.d, 60, () => { const its = DT.G.buyChest('gold'); if (its) UI.rewards('Coffre Doré', { items: its }); }),
      offer('bolt', 'Énergie pleine', 'Remplit ta jauge d\'énergie.', 25, () => { DT.G.spendGems(25); DT.G.addEnergy(C.energyMax()); DT.A.play('buy'); UI.toast('Énergie rechargée !', 'good'); }),
      offer('fist', 'PUMP 1 heure', 'Production x2 pendant 1 h (cumulable jusqu\'à 2 h).', 30, () => { DT.G.spendGems(30); S.pump = Math.min(Math.max(S.pump, Date.now()) + 3600000, Date.now() + 2 * 3600000); DT.A.play('buy'); UI.toast('PUMP activé !', 'good'); }));
    D.SKINS.filter((s) => s.price).forEach((sk) => {
      if (S.skins.includes(sk.id)) return;
      b.append(h('div', { class: 'offer' }, h('img', { class: 'thumb sm', src: P.poseThumb('victory', P.lookFor(S.look, sk.id), 40), alt: '' }),
        h('div', { class: 'grow' }, h('b', { text: 'Apparence : ' + sk.n }), h('small', { text: bonusTxt(sk.bonus) })),
        UI.btn(UI.gems(sk.price), () => { if (DT.G.buySkin(sk.id)) { DT.A.play('ach'); draw(); } else { DT.A.play('error'); UI.toast('Pas assez d\'éclats.', 'bad'); } }, { cls: 'gemb sm', disabled: S.gems < sk.price })));
    });
  }
  function preview(it) {
    UI.sheet({ title: it.n, body: (el) => {
      el.append(h('div', { class: 'item-big r' + it.r }, h('img', { class: 'item-ico xl', src: P.itemURL(it.icon, D.RAR[it.r].c), alt: '' }), h('div', {}, h('b', { style: { color: D.RAR[it.r].c }, text: D.RAR[it.r].n }), h('div', { text: 'Niveau d\'objet ' + it.ilvl }))),
        h('p', { text: UI.statLine(it) }), ...UI.affLine(it).map((l) => h('p', { class: 'aff', text: l })));
    } });
  }
  function bonusTxt(bn) {
    if (!bn) return 'Aucun bonus';
    const [k, v] = bn;
    if (k === 'spd') return '+' + v + ' VIT';
    return '+' + Math.round(v * 100) + '% ' + (D.STAT_NAMES[k] || k);
  }

  function drawStyle(b) {
    const S = DT.S;
    anim = DT.PoseAnim('victory', { w: 56, h: 48, wcls: 'mid' });
    b.append(h('div', { class: 'card doll' }, anim.el, h('div', { class: 'grow' }, h('b', { text: S.nick }), h('small', { text: D.SKIN[S.skin].n + ' · ' + bonusTxt(D.SKIN[S.skin].bonus) }),
      S.pet ? h('small', { text: 'Familier : ' + D.PET[S.pet].n + ' · ' + bonusTxt(D.PET[S.pet].bonus) }) : null,
      UI.btn('Changer de pseudo', () => DT.SCR.settings.nick(), { cls: 'ghost sm' }))));
    // apparences
    b.append(h('h3', { text: 'Apparences ' + S.skins.length + '/' + D.SKINS.length }));
    const grid = h('div', { class: 'thumbs' });
    D.SKINS.forEach((sk) => {
      const own = S.skins.includes(sk.id);
      grid.append(h('button', { type: 'button', class: 'thumbbtn' + (S.skin === sk.id ? ' on' : '') + (own ? '' : ' lockd'), on: { click: () => {
        if (own) { DT.G.setSkin(sk.id); DT.A.play('click'); }
        else UI.toast(sk.n + ' : ' + sk.src, '');
      } } }, h('img', { class: 'thumb', src: own ? P.poseThumb('victory', P.lookFor(S.look, sk.id), 48) : P.poseThumb('victory', P.lookFor(S.look, sk.id), 48, 0, '#475069'), alt: '' }), h('small', { text: own ? sk.n : '???' }), h('em', { text: own ? bonusTxt(sk.bonus) : sk.src })));
    });
    b.append(grid);
    // familiers
    b.append(h('h3', { text: 'Familiers ' + S.pets.length + '/' + D.PETS.length }));
    const pg = h('div', { class: 'thumbs' });
    pg.append(h('button', { type: 'button', class: 'thumbbtn' + (!S.pet ? ' on' : ''), on: { click: () => DT.G.setPet(null) } }, h('span', { class: 'thumb none', text: '—' }), h('small', { text: 'Aucun' })));
    D.PETS.forEach((pt) => {
      const own = S.pets.includes(pt.id);
      pg.append(h('button', { type: 'button', class: 'thumbbtn' + (S.pet === pt.id ? ' on' : '') + (own ? '' : ' lockd'), on: { click: () => { if (own) DT.G.setPet(pt.id); else UI.toast(pt.n + ' : ' + pt.src, ''); } } },
        h('img', { class: 'thumb pet', src: own ? P.spriteURL(P.SPR[pt.spr], pt.pal, 3) : P.silURL(P.SPR[pt.spr]), alt: '' }), h('small', { text: own ? pt.n : '???' }), h('em', { text: own ? bonusTxt(pt.bonus) : pt.src })));
    });
    b.append(pg);
    // personnalisation
    b.append(h('h3', { text: 'Ton athlète' }), h('p', { class: 'muted', text: 'Utilisé avec l\'apparence « Débutant » et visible sous la plupart des autres.' }));
    const swatches = (label, list, key) => h('div', { class: 'cfg' }, h('span', { class: 'lbl', text: label }), h('div', { class: 'swatches' }, list.map((c) =>
      h('button', { type: 'button', class: 'sw' + (S.look[key] === c ? ' on' : ''), style: { background: c }, 'aria-label': label + ' ' + c, on: { click: () => { S.look[key] = c; DT.E.emit('look'); } } }))));
    b.append(swatches('Peau', D.SKIN_TONES, 'skin'), swatches('Cheveux', D.HAIR_COLORS, 'hair'), swatches('Haut', D.TOP_COLORS, 'top'),
      h('div', { class: 'cfg' }, h('span', { class: 'lbl', text: 'Coiffure' }), h('div', { class: 'chips' }, D.HAIR_STYLES.map(([id, n]) =>
        h('button', { type: 'button', class: 'chip-b' + (S.look.hs === id ? ' on' : ''), on: { click: () => { S.look.hs = id; DT.E.emit('look'); } } }, n)))));
  }

  SCR.update = function () {
    if (sub === 'shop') { const el = U.$('#shopT'); if (el) { const left = (DT.G.SHOP_EVERY - (Date.now() - DT.S.shop.t)) / 1000; if (left <= 0) draw(); else el.textContent = 'Nouveau stock dans ' + U.timeFmt(left); } }
  };
  SCR.show = function () { draw(); };
  SCR.hide = function () { if (anim) { anim.stop(); anim = null; } };
  DT.SCR.stuff = SCR;
})(window.DT);
