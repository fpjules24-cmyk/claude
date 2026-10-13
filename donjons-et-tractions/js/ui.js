'use strict';
// Donjons & Tractions — interface : HUD, onglets, fenêtres, notifications
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h;
  const UI = {};
  DT.SCR = {};
  let cur = null;
  const TABS = [
    ['park', 'Parc'], ['sport', 'Sport'], ['skills', 'Skills'], ['dungeon', 'Donjons'], ['stuff', 'Stuff'],
  ];

  UI.icon = (name, cls) => h('img', { class: 'ico ' + (cls || ''), src: DT.P.iconURL(name), alt: '', draggable: false });
  UI.coins = (n, cls) => h('span', { class: 'amt coin ' + (cls || '') }, UI.icon('coin'), h('b', { text: U.fmt(n) }));
  UI.gems = (n, cls) => h('span', { class: 'amt gem ' + (cls || '') }, UI.icon('gem'), h('b', { text: U.fmt(n) }));
  UI.btn = (label, fn, o = {}) => {
    const b = h('button', { class: 'btn ' + (o.cls || ''), type: 'button', disabled: !!o.disabled, title: o.title || null }, label);
    b.addEventListener('click', (e) => { if (b.disabled) return; if (!o.silent) DT.A.play('click'); fn && fn(e); });
    return b;
  };
  UI.bar = (frac, cls) => h('div', { class: 'bar ' + (cls || '') }, h('i', { style: { width: U.clamp(frac, 0, 1) * 100 + '%' } }));

  // ---------- Squelette ----------
  UI.init = function () {
    stack.length = 0; cur = null;
    document.body.classList.remove('sheet-open');
    const app = U.$('#app');
    U.clear(app);
    const hud = h('header', { class: 'hud', id: 'hud' },
      h('div', { class: 'hud-row' },
        h('button', { class: 'hud-cell hud-coins', type: 'button', id: 'hudCoins', 'aria-label': 'Pièces', on: { click: () => UI.go('skills') } },
          UI.icon('coin', 'big'), h('span', { class: 'col' }, h('b', { id: 'hcV', text: '0' }), h('small', { id: 'hcR', text: '0/s' }))),
        h('button', { class: 'hud-cell hud-gems', type: 'button', id: 'hudGems', 'aria-label': 'Éclats', on: { click: () => { UI.go('stuff'); DT.SCR.stuff.tab('shop'); } } },
          UI.icon('gem'), h('b', { id: 'hgV', text: '0' })),
        h('button', { class: 'hud-cell hud-en', type: 'button', id: 'hudEn', 'aria-label': 'Énergie', on: { click: () => UI.energyInfo() } },
          UI.icon('bolt'), h('span', { class: 'col' }, h('b', { id: 'heV', text: '20/20' }), h('small', { id: 'heT', text: '' }))),
        h('button', { class: 'hud-gear', type: 'button', 'aria-label': 'Réglages', on: { click: () => DT.SCR.settings.open() } }, UI.icon('gear', 'big'))),
      h('div', { class: 'hud-row2' },
        h('button', { class: 'lvl', type: 'button', id: 'hudLvl', on: { click: () => DT.SCR.settings.profile() } }, h('span', { id: 'hlV', text: 'Nv 1' }), h('div', { class: 'bar xp' }, h('i', { id: 'hlX' }))),
        h('span', { class: 'chip pump', id: 'hPump', hidden: true }, UI.icon('fist'), h('span', { id: 'hPumpT' })),
        h('span', { class: 'chip streak', id: 'hStreak', hidden: true }, UI.icon('flame'), h('span', { id: 'hStreakT' })),
        h('span', { class: 'chip net', id: 'hNet', hidden: true, title: 'Sauvegarde cloud active' }, h('span', { text: 'CLOUD' }))));
    const main = h('main', { id: 'main' });
    const nav = h('nav', { class: 'nav', id: 'nav' }, TABS.map(([id, n]) =>
      h('button', { type: 'button', class: 'nav-b', id: 'nav_' + id, data: { tab: id }, on: { click: () => { DT.A.play('click'); UI.go(id); } } },
        h('img', { class: 'nav-i', src: DT.P.navURL(id), alt: '' }), h('span', { text: n }), h('i', { class: 'badge', id: 'bdg_' + id, hidden: true }))));
    app.append(hud, main, nav, h('div', { id: 'toasts', 'aria-live': 'polite' }), h('div', { id: 'sheets' }), h('div', { id: 'floats' }));
    for (const id in DT.SCR) {
      const sc = DT.SCR[id];
      if (!sc.tabbed) continue;
      sc.root = h('section', { class: 'screen', id: 'scr_' + id, hidden: true });
      main.appendChild(sc.root);
      sc.render(sc.root);
    }
  };

  UI.go = function (id) {
    if (!DT.SCR[id] || !DT.SCR[id].tabbed) return;
    if (cur === id) { DT.SCR[id].root.scrollIntoView({ block: 'start' }); U.$('#main').scrollTop = 0; return; }
    if (cur && DT.SCR[cur].hide) DT.SCR[cur].hide();
    if (cur) DT.SCR[cur].root.hidden = true;
    cur = id;
    const sc = DT.SCR[id];
    sc.root.hidden = false;
    U.$('#main').scrollTop = 0;
    U.$$('.nav-b').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
    if (sc.show) sc.show();
    try { U.store.set('dt_tab', id); } catch (e) { /* ignore */ }
  };
  UI.cur = () => cur;

  // ---------- HUD ----------
  UI.hud = function () {
    const S = DT.S;
    U.$('#hcV').textContent = U.fmt(S.coins);
    U.$('#hcR').textContent = U.fmt(C.prod()) + '/s';
    const gemCell = U.$('#hudGems');
    gemCell.hidden = !S.gemsOn;
    U.$('#hgV').textContent = U.fmt(S.gems);
    const max = C.energyMax();
    U.$('#heV').textContent = Math.floor(S.energy) + '/' + max;
    const nx = DT.G.energyNextIn();
    U.$('#heT').textContent = S.energy >= max ? 'plein' : '+1 ' + U.clockFmt(nx);
    U.$('#hlV').textContent = 'Nv ' + S.lvl;
    U.$('#hlX').style.width = Math.min(100, S.xp / C.xpNeed(S.lvl) * 100) + '%';
    const pumpLeft = (S.pump - Date.now()) / 1000;
    U.$('#hPump').hidden = pumpLeft <= 0;
    if (pumpLeft > 0) U.$('#hPumpT').textContent = 'PUMP x2 ' + U.clockFmt(pumpLeft);
    const st = C.streakNow();
    U.$('#hStreak').hidden = st <= 0;
    if (st > 0) U.$('#hStreakT').textContent = st + 'j +' + Math.min(st, 10) * 5 + '%';
    U.$('#hNet').hidden = !(DT.NET && DT.NET.cloud);
  };
  UI.badge = function (tab, n) {
    const b = U.$('#bdg_' + tab);
    if (!b) return;
    b.hidden = !n;
    b.textContent = n > 9 ? '9+' : String(n || '');
  };
  UI.energyInfo = function () {
    const S = DT.S;
    UI.sheet({ title: 'Énergie', body: (el) => {
      el.append(
        h('p', { text: "L'énergie sert à entrer en donjon et à attaquer le boss de raid." }),
        h('ul', { class: 'list' },
          h('li', { text: '+1 toutes les 5 minutes, jusqu\'à ' + C.energyMax() + '.' }),
          h('li', { text: '+1 tous les 10 points d\'effort enregistrés en vrai (ça peut dépasser le maximum).' }),
          h('li', { text: '+10 à la fin d\'une séance guidée.' })),
        h('p', { class: 'muted', text: 'Actuellement : ' + Math.floor(S.energy) + ' / ' + C.energyMax() }),
        UI.btn(h('span', {}, 'Recharger (', UI.icon('gem'), ' 25)'), () => {
          if (!DT.G.spendGems(25)) { UI.toast("Pas assez d'éclats.", 'bad'); DT.A.play('error'); return; }
          DT.G.addEnergy(C.energyMax()); DT.A.play('buy'); UI.toast('Énergie rechargée !', 'good'); UI.closeSheet();
        }, { cls: 'gemb', disabled: S.gems < 25 }),
        UI.btn('Aller faire du sport', () => { UI.closeSheet(); UI.go('sport'); }, { cls: 'ghost' }));
    } });
  };

  // ---------- Fenêtres (bottom sheets) ----------
  const stack = [];
  UI.sheet = function (o) {
    const root = U.$('#sheets');
    const body = h('div', { class: 'sheet-body' });
    const close = () => UI.closeSheet(wrap);
    const wrap = h('div', { class: 'sheet-wrap', on: { click: (e) => { if (e.target === wrap && !o.modal) close(); } } },
      h('div', { class: 'sheet ' + (o.cls || ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '' },
        h('div', { class: 'sheet-head' }, h('h2', { text: o.title || '' }), o.modal ? null : h('button', { class: 'x', type: 'button', 'aria-label': 'Fermer', on: { click: close } }, '×')),
        body));
    wrap._onClose = o.onClose;
    root.appendChild(wrap);
    stack.push(wrap);
    document.body.classList.add('sheet-open');
    o.body && o.body(body, close);
    requestAnimationFrame(() => wrap.classList.add('open'));
    return close;
  };
  UI.closeSheet = function (w) {
    const wrap = w || stack[stack.length - 1];
    if (!wrap) return;
    const i = stack.indexOf(wrap);
    if (i >= 0) stack.splice(i, 1);
    if (!stack.length) document.body.classList.remove('sheet-open');
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 180);
    if (wrap._onClose) wrap._onClose();
  };
  UI.sheetOpen = () => stack.length > 0;
  UI.confirm = function (o) {
    return new Promise((res) => {
      let done = false;
      const fin = (v) => { if (done) return; done = true; res(v); };
      UI.sheet({ title: o.title || 'Confirmer', onClose: () => fin(false), body: (el, close) => {
        if (o.text) el.append(h('p', { text: o.text }));
        if (o.extra) el.append(o.extra);
        el.append(h('div', { class: 'row gap' },
          UI.btn(o.cancel || 'Annuler', () => { fin(false); close(); }, { cls: 'ghost' }),
          UI.btn(o.ok || 'Confirmer', () => { fin(true); close(); }, { cls: o.danger ? 'danger' : 'go' })));
      } });
    });
  };

  // ---------- Notifications ----------
  UI.toast = function (text, kind, big) {
    const root = U.$('#toasts');
    const t = h('div', { class: 'toast ' + (kind || '') + (big ? ' big' : '') }, text);
    root.appendChild(t);
    while (root.children.length > 3) root.firstChild.remove();
    setTimeout(() => t.classList.add('out'), big ? 3400 : 2200);
    setTimeout(() => t.remove(), big ? 3800 : 2600);
  };
  UI.float = function (x, y, text, color, cls) {
    const f = h('div', { class: 'float ' + (cls || ''), style: { left: x + 'px', top: y + 'px', color: color || '#ffcd75' } }, text);
    U.$('#floats').appendChild(f);
    setTimeout(() => f.remove(), 1000);
  };
  UI.floatFrom = function (el, text, color) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    UI.float(r.left + r.width / 2, r.top, text, color);
  };

  // ---------- Récompenses ----------
  UI.rewards = function (title, o) {
    DT.A.play(o.sound || 'chest');
    UI.sheet({ title, cls: 'reward', body: (el, close) => {
      if (o.text) el.append(h('p', { class: 'lead', text: o.text }));
      const list = h('div', { class: 'rw-list' });
      if (o.coins) list.append(h('div', { class: 'rw' }, UI.icon('coin', 'big'), h('b', { text: '+' + U.fmt(o.coins) }), h('span', { text: 'pièces' })));
      if (o.gems) list.append(h('div', { class: 'rw' }, UI.icon('gem', 'big'), h('b', { text: '+' + U.fmt(o.gems) }), h('span', { text: 'éclats' })));
      if (o.energy) list.append(h('div', { class: 'rw' }, UI.icon('bolt', 'big'), h('b', { text: '+' + o.energy }), h('span', { text: 'énergie' })));
      if (o.xp) list.append(h('div', { class: 'rw' }, UI.icon('up', 'big'), h('b', { text: '+' + U.fmt(o.xp) }), h('span', { text: 'XP' })));
      if (o.skin) list.append(h('div', { class: 'rw' }, h('img', { class: 'thumb sm', src: DT.P.poseThumb('victory', DT.P.lookFor(DT.S.look, o.skin), 40), alt: '' }), h('b', { text: D.SKIN[o.skin].n }), h('span', { text: 'apparence' })));
      if (o.pet) list.append(h('div', { class: 'rw' }, h('img', { class: 'thumb sm', src: DT.P.spriteURL(DT.P.SPR[D.PET[o.pet].spr], D.PET[o.pet].pal, 2), alt: '' }), h('b', { text: D.PET[o.pet].n }), h('span', { text: 'familier' })));
      (o.items || []).forEach((it) => list.append(UI.itemRow(it, { onClick: () => UI.itemSheet(it) })));
      el.append(list);
      el.append(UI.btn(o.okLabel || 'Super !', () => { close(); o.onOk && o.onOk(); }, { cls: 'go wide' }));
    } });
  };

  // ---------- Objets ----------
  UI.itemIcon = (it) => h('img', { class: 'item-ico', src: DT.P.itemURL(it.icon, D.RAR[it.r].c), alt: '' });
  UI.statLine = function (it) {
    const m = C.itemMain(it), parts = [];
    for (const k in m) {
      if (k === 'crit') parts.push('+' + (m[k] * 100).toFixed(1) + '% CRIT');
      else if (k === 'spd') parts.push('+' + m[k].toFixed(1) + ' VIT');
      else parts.push('+' + U.fmt(m[k]) + ' ' + D.STAT_NAMES[k]);
    }
    return parts.join(' · ');
  };
  UI.affLine = (it) => (it.aff || []).map(([k, v]) => '+' + (v * 100).toFixed(1) + '% ' + (D.AFFIXES.find((a) => a.k === k) || { n: k }).n);
  UI.itemRow = function (it, o = {}) {
    const eq = DT.G.isEquipped(it);
    const row = h('button', { type: 'button', class: 'item r' + it.r + (eq ? ' eq' : '') + (o.cls ? ' ' + o.cls : ''), on: { click: () => { DT.A.play('click'); o.onClick && o.onClick(it); } } },
      UI.itemIcon(it),
      h('span', { class: 'item-t' },
        h('b', { class: 'item-n', text: it.n + (it.plus ? ' +' + it.plus : '') }),
        h('small', { text: D.RAR[it.r].n + ' · ' + D.SLOTS.find((s) => s.id === it.slot).n + ' · niv. ' + it.ilvl }),
        h('small', { class: 'st', text: UI.statLine(it) })),
      o.right || (eq ? h('i', { class: 'tag', text: 'ÉQUIPÉ' }) : it.lock ? UI.icon('lock') : null));
    return row;
  };
  UI.itemSheet = function (it) {
    const G = DT.G, S = DT.S;
    UI.sheet({ title: it.n + (it.plus ? ' +' + it.plus : ''), cls: 'itemsheet', body: (el, close) => {
      const draw = () => {
        U.clear(el);
        const eqId = S.eq[it.slot];
        const cmp = eqId && eqId !== it.id ? G.findItem(eqId) : null;
        el.append(h('div', { class: 'item-big r' + it.r }, h('img', { class: 'item-ico xl', src: DT.P.itemURL(it.icon, D.RAR[it.r].c), alt: '' }),
          h('div', {}, h('b', { class: 'rar', style: { color: D.RAR[it.r].c }, text: D.RAR[it.r].n }), h('div', { text: D.SLOTS.find((s) => s.id === it.slot).n + ' · niveau d\'objet ' + it.ilvl }))));
        const ul = h('ul', { class: 'stats' });
        const m = C.itemMain(it), mc = cmp ? C.itemMain(cmp) : null;
        for (const k in m) {
          const v = m[k], o = mc ? (mc[k] || 0) : null;
          const fmtv = (x) => k === 'crit' ? (x * 100).toFixed(1) + '%' : k === 'spd' ? x.toFixed(1) : U.fmt(x);
          const diff = o != null ? v - o : 0;
          ul.append(h('li', {}, h('span', { text: D.STAT_NAMES[k] }), h('b', { text: '+' + fmtv(v) }),
            o != null && Math.abs(diff) > 1e-9 ? h('em', { class: diff > 0 ? 'up' : 'down', text: (diff > 0 ? '▲' : '▼') + fmtv(Math.abs(diff)) }) : null));
        }
        for (const line of UI.affLine(it)) ul.append(h('li', { class: 'aff' }, h('span', { text: 'Bonus' }), h('b', { text: line })));
        el.append(ul);
        if (it.uq) el.append(h('p', { class: 'lore', text: D.UNIQUES[it.uq].lore }));
        if (cmp) el.append(h('p', { class: 'muted', text: 'Comparé à ton objet équipé : ' + cmp.n + (cmp.plus ? ' +' + cmp.plus : '') }));
        const eq = G.isEquipped(it);
        const acts = h('div', { class: 'acts' });
        acts.append(eq ? UI.btn('Retirer', () => { G.unequip(it.slot); draw(); }, { cls: 'ghost' })
          : UI.btn('Équiper', () => { G.equip(it.id); DT.A.play('buy'); draw(); }, { cls: 'go' }));
        if (it.plus < 10) {
          const cost = G.upgradeCost(it);
          acts.append(UI.btn(h('span', {}, 'Améliorer +' + (it.plus + 1) + ' ', UI.coins(cost)), () => {
            if (G.upgrade(it.id)) { DT.A.play('buy'); UI.toast(it.n + ' +' + it.plus + ' !', 'good'); draw(); }
            else { DT.A.play('error'); UI.toast('Pas assez de pièces.', 'bad'); }
          }, { cls: 'gold', disabled: S.coins < cost }));
        }
        acts.append(UI.btn(it.lock ? 'Déverrouiller' : 'Verrouiller', () => { it.lock = !it.lock; DT.E.emit('inv'); draw(); }, { cls: 'ghost' }));
        if (!eq && !it.lock) acts.append(UI.btn(h('span', {}, 'Vendre ', UI.coins(G.sellValue(it))), () => { const v = G.sell(it.id); DT.A.play('coin'); UI.toast('Vendu : +' + U.fmt(v) + ' pièces', 'good'); close(); }, { cls: 'danger' }));
        el.append(acts);
      };
      draw();
    } });
  };

  DT.UI = UI;
})(window.DT);
