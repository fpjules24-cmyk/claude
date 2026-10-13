'use strict';
// Donjons & Tractions v2 — le Marché : armurerie, échanges, grimoires, éclats, potes
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h, P = DT.P, UI = DT.UI;
  const SCR = { tabbed: true };
  const SUBS = [['shop', 'Armurerie'], ['trade', 'Échanges'], ['scroll', 'Grimoires'], ['gems', 'Éclats'], ['friends', 'Potes']];
  let sub = 'shop', els = {};

  SCR.render = function (root) {
    els.tabs = h('div', { class: 'seg', role: 'tablist' });
    els.body = h('div');
    root.append(h('h1', { class: 'scr-t', text: 'Marché' }), els.tabs, els.body);
    const on = (ev, list) => DT.E.on(ev, () => { if (SCR.root && !SCR.root.hidden && list.includes(sub)) draw(); });
    on('shop', ['shop']);
    on('trade', ['trade']);
    on('ability', ['scroll']);
    on('gems', ['gems', 'scroll']);
    drawTabs(); draw();
  };
  SCR.tab = (t) => { sub = t; drawTabs(); draw(); };
  function drawTabs() {
    U.clear(els.tabs).append(...SUBS.map(([id, n]) => h('button', { type: 'button', role: 'tab', class: sub === id ? 'on' : '', 'aria-selected': sub === id ? 'true' : 'false', on: { click: () => { sub = id; drawTabs(); draw(); } } }, n)));
  }
  function draw() {
    const b = U.clear(els.body);
    if (sub === 'shop') drawShop(b);
    else if (sub === 'trade') drawTrade(b);
    else if (sub === 'scroll') drawScrolls(b);
    else if (sub === 'gems') drawGems(b);
    else drawFriends(b);
  }
  const nope = (what) => { DT.A.play('error'); UI.toast('Pas assez ' + (what || 'de pièces') + '.', 'bad'); };

  // ---------- Armurerie ----------
  function drawShop(b) {
    const S = DT.S, G = DT.G;
    G.shopRefresh(false);
    const left = (G.SHOP_EVERY - (Date.now() - S.shop.t)) / 1000;
    b.append(h('div', { class: 'card trader-head' }, h('img', { class: 'thumb sm', src: P.poseThumb('heroidle', { fx: true, skin: '#a0663f', hair: '#1a1c2c', hs: 'bald', beard: '#1a1c2c', top: '#333c57', armor: 'plate', pauldron: '#94b0c2', bottom: '#333c57', hat: 'band', hatC: '#ef7d57', weapon: { vis: 'hammer', r: 2 } }, 32), alt: '' }),
      h('div', { class: 'grow' }, h('b', { text: 'Armurerie de Brunhilde' }), h('small', { text: '« Du vrai matos, forgé pour ta classe. Essaie avant d\'acheter ! »' }), h('small', { class: 'muted', id: 'shopT', text: 'Nouveau stock dans ' + U.timeFmt(left) }))));
    const list = h('div', { class: 'itemlist' });
    S.shop.items.forEach((it) => {
      const price = G.shopPrice(it);
      const btn = it.sold ? h('i', { class: 'tag', text: 'VENDU' }) : UI.btn(UI.coins(price), () => buy(it), { cls: 'gold sm', disabled: S.coins < price });
      list.append(UI.itemRow(it, { right: btn, cls: it.sold ? 'sold' : '', onClick: () => tryOn(it) }));
    });
    b.append(h('p', { class: 'muted', text: 'Tape un objet pour l\'essayer sur ton héros.' }), list);
    if (S.gemsOn) b.append(UI.btn(h('span', {}, 'Nouveau stock maintenant (', UI.icon('gem'), ' 10)'), () => {
      if (!G.spendGems(10)) { nope('d\'éclats'); return; }
      G.shopRefresh(true); DT.A.play('buy');
    }, { cls: 'ghost wide', disabled: S.gems < 10 }));
    // potions
    const pp = G.potionPrice();
    b.append(h('h3', { text: 'Apothicaire' }), h('div', { class: 'card offer' }, UI.icon('potion', 'big'), h('div', { class: 'grow' }, h('b', { text: 'Potion de soin (' + S.potions + '/20)' }), h('small', { text: 'Rend 40 % des PV en combat. 3 par combat maximum.' })),
      h('div', { class: 'col gap' },
        UI.btn(h('span', {}, 'x1 ', UI.coins(pp)), () => { if (G.buyPotions(1)) { DT.A.play('buy'); draw(); } else nope(); }, { cls: 'gold sm', disabled: S.coins < pp || S.potions >= 20 }),
        UI.btn(h('span', {}, 'x5 ', UI.coins(pp * 5)), () => { if (G.buyPotions(5)) { DT.A.play('buy'); draw(); } else nope(); }, { cls: 'gold sm', disabled: S.coins < pp * 5 || S.potions > 15 }))));
  }
  function buy(it) {
    const got = DT.G.buyShop(it.id);
    if (got) { DT.A.play('buy'); UI.toast('Acheté : ' + got.n, 'good'); return got; }
    nope();
    return null;
  }
  function tryOn(it) {
    const S = DT.S;
    const worn = C.equipped().filter((x) => x.slot !== it.slot).concat([it]);
    const anim = DT.PoseAnim('stance', { w: 64, h: 60, wcls: 'big hero-anim', bg: '#1a1c2c', look: () => C.heroLook({ items: worn, gear: true }) });
    UI.sheet({ title: it.n, onClose: () => anim.stop(), body: (el, close) => {
      const cur = S.eq[it.slot] && DT.G.findItem(S.eq[it.slot]);
      const m = C.itemMain(it), mc = cur ? C.itemMain(cur) : {};
      const ul = h('ul', { class: 'stats' });
      for (const k in m) {
        const fmtv = (x) => k === 'crit' ? (x * 100).toFixed(1) + '%' : k === 'spd' ? x.toFixed(1) : U.fmt(x);
        const diff = m[k] - (mc[k] || 0);
        ul.append(h('li', {}, h('span', { text: D.STAT_NAMES[k] }), h('b', { text: '+' + fmtv(m[k]) }), Math.abs(diff) > 1e-9 ? h('em', { class: diff > 0 ? 'up' : 'down', text: (diff > 0 ? '▲' : '▼') + fmtv(Math.abs(diff)) }) : null));
      }
      for (const line of UI.affLine(it)) ul.append(h('li', { class: 'aff' }, h('span', { text: 'Bonus' }), h('b', { text: line })));
      el.append(anim.el, h('div', { class: 'item-big r' + it.r }, UI.itemIcon(it, 'xl'), h('div', {}, h('b', { style: { color: D.RAR[it.r].c }, text: D.RAR[it.r].n }), h('div', { text: D.SLOTS.find((s) => s.id === it.slot).n + ' · niveau ' + it.ilvl }), h('div', { class: 'row gap' }, h('small', { class: 'muted', text: 'Valeur' }), UI.val(C.itemValue(it))))), ul);
      if (it.ab) { const a = D.ABI[it.ab]; el.append(h('div', { class: 'card abcard', style: { '--c': DT.BT.abColor(it.ab) } }, h('b', { text: '✦ ' + a.n }), h('p', { text: UI.abDesc(a) }))); }
      if (cur) el.append(h('p', { class: 'muted', text: 'Comparé à ton ' + cur.n + (cur.plus ? ' +' + cur.plus : '') + '.' }));
      const price = DT.G.shopPrice(it);
      if (!it.sold) el.append(UI.btn(h('span', {}, 'Acheter et équiper ', UI.coins(price)), () => { const got = buy(it); if (got) { DT.G.equip(got.id); close(); } }, { cls: 'gold wide', disabled: S.coins < price }));
    } });
  }

  // ---------- Échanges ----------
  function drawTrade(b) {
    const S = DT.S, G = DT.G;
    G.tradeRefresh(false);
    const tr = G.trends();
    const left = (G.TRADE_EVERY - (Date.now() - S.trade.t)) / 1000;
    b.append(h('p', { class: 'muted', text: 'Chaque objet a une valeur. Les marchands acceptent tes objets en paiement : leur cote change chaque jour et chacun a ses préférences.' }));
    b.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'COTE DU JOUR' }), h('small', { class: 'muted', id: 'tradeT', text: 'Marchands dans ' + U.timeFmt(left) })),
      h('div', { class: 'trends' }, D.SLOTS.map((sl) => { const v = tr[sl.id]; return h('span', { class: 'trend ' + (v >= 1.1 ? 'up' : v <= 0.9 ? 'down' : '') }, sl.n + ' ', h('b', { text: (v >= 1 ? '▲' : '▼') + ' x' + v.toFixed(2) })); }))));
    S.trade.offers.forEach((off) => {
      const t = D.TRADERS.find((x) => x.id === off.tr);
      const what = off.chest != null
        ? h('div', { class: 'rw chestrw', style: { '--c': D.CHEST_T[off.chest].c } }, UI.chestImg(off.chest), h('b', { text: D.CHEST_T[off.chest].n }), h('span', { text: D.CHEST_T[off.chest].items + ' objets' }))
        : UI.itemRow(off.item, { noVal: true, onClick: () => tryOnOffer(off.item) });
      const pref = t.pref === 'weapon' ? 'Adore les armes' : t.pref === 'armor' ? 'Adore les armures' : t.pref === 'acc' ? 'Adore les accessoires' : t.pref === 'rare' ? 'Que de l\'Épique ou mieux' : 'Prend de tout';
      b.append(h('div', { class: 'card offercard' + (off.done ? ' done' : ''), style: { '--c': t.c } },
        h('div', { class: 'row gap' }, h('img', { class: 'thumb sm', src: P.poseThumb('heroidle', Object.assign({ fx: true }, t.look), 30), alt: '' }),
          h('div', { class: 'grow' }, h('b', { style: { color: t.c }, text: t.n }), h('small', { text: '« ' + t.line + ' »' }), h('small', { class: 'muted', text: pref }))),
        what,
        h('div', { class: 'row between' }, h('span', {}, h('small', { class: 'muted', text: 'Demande ' }), UI.val(off.ask)),
          off.done ? h('i', { class: 'tag', text: 'ÉCHANGÉ' }) : UI.btn('Proposer', () => tradeSheet(off), { cls: 'go sm' }))));
    });
    if (S.gemsOn) b.append(UI.btn(h('span', {}, 'Faire venir d\'autres marchands (', UI.icon('gem'), ' 10)'), () => {
      if (!G.spendGems(10)) { nope('d\'éclats'); return; }
      G.tradeRefresh(true); DT.A.play('buy');
    }, { cls: 'ghost wide', disabled: S.gems < 10 }));
  }
  function tryOnOffer(it) {
    const worn = C.equipped().filter((x) => x.slot !== it.slot).concat([it]);
    const anim = DT.PoseAnim('stance', { w: 64, h: 60, wcls: 'big hero-anim', bg: '#1a1c2c', look: () => C.heroLook({ items: worn, gear: true }) });
    UI.sheet({ title: it.n, onClose: () => anim.stop(), body: (el) => {
      el.append(anim.el, UI.itemRow(it, { noVal: true }), h('p', { class: 'muted', text: 'Valeur de base : ' + U.fmt(C.itemValue(it)) }));
      if (it.ab) { const a = D.ABI[it.ab]; el.append(h('div', { class: 'card abcard', style: { '--c': DT.BT.abColor(it.ab) } }, h('b', { text: '✦ ' + a.n }), h('p', { text: UI.abDesc(a) }))); }
    } });
  }
  function tradeSheet(off) {
    const S = DT.S, G = DT.G, t = D.TRADERS.find((x) => x.id === off.tr);
    const sel = new Set();
    UI.sheet({ title: 'Échange avec ' + t.n.split(' ')[0], body: (el, close) => {
      const items = S.inv.filter((it) => !G.isEquipped(it) && !it.lock).map((it) => ({ it, v: Math.round(C.itemValue(it) * G.traderMult(t, it)) })).sort((a, b) => a.v - b.v);
      const tot = h('b');
      const bar = h('div', { class: 'bar trade' }, h('i'));
      const ok = UI.btn('Échanger', async () => {
        const res = G.doTrade(off.id, [...sel]);
        if (!res) { nope('de valeur'); return; }
        close();
        DT.A.play('ach');
        UI.rewards('Marché conclu !', { text: t.n + ' : « Un plaisir de faire affaire. »', items: res.item ? [res.item] : [], chests: res.chest ? [res.chest] : [], sound: 'chest' });
      }, { cls: 'gold wide' });
      const upd = () => {
        const v = G.offerPay(off, [...sel]);
        tot.textContent = U.fmt(v) + ' / ' + U.fmt(off.ask);
        bar.firstChild.style.width = Math.min(100, v / off.ask * 100) + '%';
        bar.classList.toggle('ok', v >= off.ask);
        ok.disabled = v < off.ask;
      };
      el.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'TA PROPOSITION' }), h('span', { class: 'amt val' }, UI.icon('val'), tot)), bar,
        h('small', { class: 'muted', text: 'Valeurs ajustées selon la cote du jour et les goûts du marchand. Objets équipés et verrouillés exclus.' })),
      h('div', { class: 'row gap' }, UI.btn('Sélection auto', () => {
        // au plus juste : le plus petit objet qui comble l'écart, sinon le plus gros de ceux qui ne suffisent pas
        sel.clear();
        const pool = items.filter((x) => !x.it.uq);
        let v = 0;
        while (v < off.ask) {
          const left = pool.filter((x) => !sel.has(x.it.id));
          if (!left.length) break;
          const need = off.ask - v;
          const one = left.find((x) => x.v >= need) || left[left.length - 1];
          sel.add(one.it.id); v += one.v;
        }
        if (v < off.ask) UI.toast('Même avec tout ton sac, ça ne suffit pas.', 'bad');
        drawList(); upd();
      }, { cls: 'ghost sm' }), UI.btn('Vider', () => { sel.clear(); drawList(); upd(); }, { cls: 'ghost sm' })));
      const list = h('div', { class: 'itemlist pick' });
      const drawList = () => {
        U.clear(list);
        if (!items.length) list.append(h('p', { class: 'muted', text: 'Aucun objet échangeable : déséquipe ou déverrouille des objets, ou va en donjon.' }));
        items.forEach(({ it, v }) => list.append(UI.itemRow(it, { cls: sel.has(it.id) ? 'picked' : '', right: h('span', { class: 'item-r' }, h('i', { class: 'check', text: sel.has(it.id) ? '✓' : '' }), UI.val(v, 'sm')), onClick: () => { if (sel.has(it.id)) sel.delete(it.id); else sel.add(it.id); drawList(); upd(); } })));
      };
      drawList();
      el.append(list, ok);
      upd();
    } });
  }

  // ---------- Grimoires ----------
  function drawScrolls(b) {
    const S = DT.S, G = DT.G;
    b.append(h('p', { class: 'muted', text: 'Les grimoires apprennent une capacité à ton héros, quelle que soit sa classe. Équipe-les dans Héros › Classe.' }));
    D.AB.filter((a) => a.scroll).forEach((a) => {
      const own = S.scrolls.includes(a.id), pr = G.scrollPrice(a), inLo = S.loadout.includes(a.id);
      const can = pr.gems ? S.gems >= pr.gems : S.coins >= pr.coins;
      b.append(h('div', { class: 'abcard card' + (inLo ? ' inlo' : ''), style: { '--c': DT.BT.abColor(a.id) } },
        h('div', { class: 'row between' }, h('b', { text: a.n }), own ? h('i', { class: 'tag', text: 'APPRIS' }) : null),
        h('small', { class: 'muted', text: UI.abMeta(a) }), h('p', { text: UI.abDesc(a) }),
        own ? UI.btn(inLo ? 'Retirer du combat' : 'En combat', () => { if (!G.toggleLoadout(a.id)) UI.toast('Emplacements pleins : retire une capacité dans Héros › Classe.', 'bad'); else draw(); }, { cls: inLo ? 'ghost sm' : 'go sm' })
          : UI.btn(h('span', {}, 'Apprendre ', pr.gems ? UI.gems(pr.gems) : UI.coins(pr.coins)), () => {
            if (G.buyScroll(a.id)) { DT.A.play('ach'); UI.toast('Grimoire appris : ' + a.n + ' !', 'gold'); draw(); } else nope(pr.gems ? 'd\'éclats' : 'de pièces');
          }, { cls: (pr.gems ? 'gemb' : 'gold') + ' sm', disabled: !can || (pr.gems && !S.gemsOn) })));
    });
  }

  // ---------- Éclats ----------
  function drawGems(b) {
    const S = DT.S, G = DT.G;
    if (!S.gemsOn) { b.append(h('div', { class: 'card empty-st' }, UI.icon('gem', 'big'), h('p', { text: 'Débloque ton deuxième skill pour gagner tes premiers éclats.' }), UI.btn('Voir les skills', () => UI.go('skills'), { cls: 'go' }))); return; }
    const offer = (ico, name, desc, price, fn) => h('div', { class: 'card offer' }, ico, h('div', { class: 'grow' }, h('b', { text: name }), h('small', { text: desc })),
      UI.btn(UI.gems(price), () => { if (S.gems < price) { nope('d\'éclats'); return; } fn(); draw(); }, { cls: 'gemb sm', disabled: S.gems < price }));
    b.append(h('h3', { text: 'Coffres' }));
    for (const t of [2, 3, 4]) {
      const T = D.CHEST_T[t];
      b.append(offer(UI.chestImg(t, 'big'), T.n, T.items + ' objets, ' + D.RAR[T.min].n + ' minimum' + (T.skin ? ', apparence rare possible' : '') + '.', G.CHEST_PRICE[t], () => {
        const ch = G.buyChest(t);
        if (ch) { DT.A.play('buy'); UI.openChests([ch.id]); }
      }));
    }
    b.append(h('h3', { text: 'Boosts' }),
      offer(UI.icon('bolt', 'big'), 'Énergie pleine', 'Remplit ta jauge d\'énergie.', 25, () => { G.spendGems(25); G.addEnergy(C.energyMax()); DT.A.play('buy'); UI.toast('Énergie rechargée !', 'good'); }),
      offer(UI.icon('fist', 'big'), 'PUMP 1 heure', 'Production x2 pendant 1 h (cumulable jusqu\'à 2 h).', 30, () => { G.spendGems(30); S.pump = Math.min(Math.max(S.pump, Date.now()) + 3600000, Date.now() + 2 * 3600000); DT.A.play('buy'); UI.toast('PUMP activé !', 'good'); }));
    const skins = D.SKINS.filter((s) => s.price && !S.skins.includes(s.id));
    if (skins.length) b.append(h('h3', { text: 'Apparences' }));
    skins.forEach((sk) => {
      b.append(h('div', { class: 'card offer' }, h('img', { class: 'thumb sm', src: P.poseThumb('heroidle', C.heroLook({ skin: sk.id, gear: false }), 44), alt: '' }),
        h('div', { class: 'grow' }, h('b', { text: sk.n }), h('small', { text: sk.bonus ? (sk.bonus[0] === 'spd' ? '+' + sk.bonus[1] + ' VIT' : '+' + Math.round(sk.bonus[1] * 100) + '% ' + D.STAT_NAMES[sk.bonus[0]]) : '' })),
        UI.btn(UI.gems(sk.price), () => { if (G.buySkin(sk.id)) { DT.A.play('ach'); G.setSkin(sk.id); draw(); } else nope('d\'éclats'); }, { cls: 'gemb sm', disabled: S.gems < sk.price })));
    });
  }

  // ---------- Potes ----------
  function drawFriends(b) {
    const S = DT.S, G = DT.G;
    b.append(h('div', { class: 'card' }, h('h3', { text: 'Recevoir un objet' }), h('p', { class: 'muted', text: 'Un pote t\'a envoyé un code ? Colle-le ici.' }),
      (() => {
        const ta = h('textarea', { class: 'code', rows: 3, placeholder: 'DT-…' });
        return h('div', { class: 'col gap' }, ta, UI.btn('Recevoir', () => {
          const r = G.codeToItem(ta.value);
          if (r.err) { DT.A.play('error'); UI.toast(r.err, 'bad'); return; }
          ta.value = '';
          UI.rewards('Cadeau de ' + r.from + ' !', { items: [r.item], sound: 'chest' });
        }, { cls: 'go wide' }));
      })()));
    b.append(h('h3', { text: 'Envoyer un objet' }), h('p', { class: 'muted', text: 'Choisis un objet : il devient un code à usage unique que tu envoies à ton pote (message, SMS…).' }));
    const items = S.inv.filter((it) => !G.isEquipped(it) && !it.lock).sort((a, b2) => b2.r - a.r || C.itemValue(b2) - C.itemValue(a));
    if (!items.length) b.append(h('p', { class: 'muted', text: 'Aucun objet à envoyer (les objets équipés et verrouillés restent chez toi).' }));
    const list = h('div', { class: 'itemlist' });
    items.forEach((it) => list.append(UI.itemRow(it, { onClick: () => UI.giftItem(it) })));
    b.append(list);
  }

  SCR.update = function () {
    if (sub === 'shop') { const el = U.$('#shopT'); if (el) { const left = (DT.G.SHOP_EVERY - (Date.now() - DT.S.shop.t)) / 1000; if (left <= 0) draw(); else el.textContent = 'Nouveau stock dans ' + U.timeFmt(left); } }
    if (sub === 'trade') { const el = U.$('#tradeT'); if (el) { const left = (DT.G.TRADE_EVERY - (Date.now() - DT.S.trade.t)) / 1000; if (left <= 0) draw(); else el.textContent = 'Marchands dans ' + U.timeFmt(left); } }
  };
  SCR.show = function () { draw(); };
  DT.SCR.market = SCR;
})(window.DT);
