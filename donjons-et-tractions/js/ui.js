'use strict';
// Donjons & Tractions — interface : HUD, onglets, fenêtres, notifications
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h;
  const UI = {};
  DT.SCR = {};
  let cur = null;
  const TABS = [
    ['park', 'Parc'], ['sport', 'Sport'], ['skills', 'Skills'], ['hero', 'Héros'], ['dungeon', 'Donjons'], ['market', 'Marché'],
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
        h('button', { class: 'hud-cell hud-gems', type: 'button', id: 'hudGems', 'aria-label': 'Éclats', on: { click: () => { UI.go('market'); DT.SCR.market.tab('gems'); } } },
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
      if (o.skin) list.append(h('div', { class: 'rw' }, h('img', { class: 'thumb sm', src: DT.P.poseThumb('triumph', C.heroLook({ skin: o.skin, gear: false }), 40), alt: '' }), h('b', { text: D.SKIN[o.skin].n }), h('span', { text: 'apparence' })));
      if (o.pet) list.append(h('div', { class: 'rw' }, h('img', { class: 'thumb sm', src: DT.P.spriteURL(DT.P.SPR[D.PET[o.pet].spr], D.PET[o.pet].pal, 2), alt: '' }), h('b', { text: D.PET[o.pet].n }), h('span', { text: 'familier' })));
      if (o.potions) list.append(h('div', { class: 'rw' }, UI.icon('potion', 'big'), h('b', { text: '+' + o.potions }), h('span', { text: 'potion' + (o.potions > 1 ? 's' : '') })));
      const chests = (o.chests || []).filter(Boolean);
      chests.forEach((ch) => list.append(h('div', { class: 'rw chestrw', style: { '--c': D.CHEST_T[ch.t].c } }, UI.chestImg(ch.t), h('b', { text: D.CHEST_T[ch.t].n }), h('span', { text: ch.src ? '(' + ch.src + ')' : '' }))));
      (o.items || []).forEach((it) => list.append(UI.itemRow(it, { onClick: () => UI.itemSheet(it) })));
      el.append(list);
      if (chests.length && chests.some((ch) => DT.S.chests.find((c) => c.id === ch.id))) el.append(UI.btn('Ouvrir ' + (chests.length > 1 ? 'les coffres' : 'le coffre'), () => { close(); UI.openChests(chests.map((c) => c.id)); }, { cls: 'gold wide' }));
      el.append(UI.btn(o.okLabel || 'Super !', () => { close(); o.onOk && o.onOk(); }, { cls: (chests.length ? 'ghost' : 'go') + ' wide' }));
    } });
  };

  // ---------- Objets ----------
  UI.itemIcon = (it, cls) => h('img', { class: 'item-ico ' + (cls || ''), src: DT.P.itemIconURL(it), alt: '' });
  UI.val = (n, cls) => h('span', { class: 'amt val ' + (cls || '') }, UI.icon('val'), h('b', { text: U.fmt(n) }));
  UI.chestImg = (tier, cls, open) => h('img', { class: 'chest-ico ' + (cls || ''), src: DT.P.chestURL(tier, !!open, 4), alt: D.CHEST_T[tier].n });

  // ---------- Capacités ----------
  const pc = (x) => Math.round(x * 100) + '%';
  UI.abDesc = function (a) {
    const e = a.eff || {}, out = [];
    const tg = { one: 'une cible', all: 'tous les ennemis', rand: 'des ennemis au hasard', self: '' }[a.tg] || '';
    if (a.p > 0) out.push(((a.hits || 1) > 1 ? a.hits + ' coups de ' : '') + pc(a.p) + ' ATK sur ' + tg);
    if (e.pierce) out.push('ignore ' + pc(e.pierce) + ' de la DEF');
    if (e.burn) out.push('brûlure ' + pc(e.burn[0]) + ' ATK/tour (' + e.burn[1] + ' t)');
    if (e.poison) out.push('poison ' + pc(e.poison[0]) + ' ATK/tour (' + e.poison[1] + ' t)');
    if (e.bleed) out.push('saignement ' + pc(e.bleed[0]) + ' ATK/tour (' + e.bleed[1] + ' t)');
    if (e.def) out.push('DEF ennemie ' + pc(e.def[0]) + ' (' + e.def[1] + ' t)');
    if (e.slow) out.push('ralentit de ' + pc(e.slow[0]) + ' (' + e.slow[1] + ' t)');
    if (e.mark) out.push('marque : +' + pc(e.mark[0]) + ' de dégâts subis (' + e.mark[1] + ' t)');
    if (e.stun) out.push('étourdit' + (e.chance ? ' (' + pc(e.chance) + ' de chance)' : '') + ' et interrompt les charges');
    if (e.exec) out.push('dégâts x2 sous ' + pc(e.exec) + ' PV');
    if (e.splash) out.push('éclabousse les autres ennemis (' + pc(e.splash) + ')');
    if (e.crit === 1) out.push('critique garanti');
    if (e.heal) out.push('soigne ' + pc(e.heal) + ' de tes PV max');
    if (e.lifesteal) out.push('récupère ' + pc(e.lifesteal) + ' des dégâts en PV');
    if (e.shield) out.push('bouclier de ' + pc(e.shield) + ' de tes PV max');
    if (e.atk) out.push('+' + pc(e.atk[0]) + ' ATK (' + e.atk[1] + ' t)');
    if (Array.isArray(e.crit)) out.push('+' + pc(e.crit[0]) + ' CRIT (' + e.crit[1] + ' t)');
    if (e.spd) out.push('+' + pc(e.spd[0]) + ' VIT (' + e.spd[1] + ' t)');
    if (e.defup) out.push((e.defup[0] > 0 ? '+' : '') + pc(e.defup[0]) + ' DEF (' + e.defup[1] + ' t)');
    if (e.regen) out.push('régénère ' + pc(e.regen[0]) + ' PV/tour (' + e.regen[1] + ' t)');
    if (e.dodge) out.push('esquive les ' + e.dodge + ' prochaines attaques');
    if (e.mp) out.push('+' + Math.round(e.mp) + ' mana');
    if (e.cleanse) out.push('retire les effets négatifs');
    if (e.selfdmg) out.push('te coûte ' + pc(e.selfdmg) + ' de tes PV');
    if (a.id === 'b_rage') out.push('plus tu es blessé, plus tu frappes fort');
    const t = out.join(' · ');
    return t.charAt(0).toUpperCase() + t.slice(1) + '.';
  };
  UI.abMeta = (a) => (a.mp ? a.mp + ' mana' : 'gratuit') + ' · ' + (a.cd ? 'recharge ' + a.cd + ' tour' + (a.cd > 1 ? 's' : '') : 'sans recharge');
  UI.abSrc = function (a) {
    if (a.cls) return 'Classe ' + D.CLASSES[a.cls].n + ' · niveau ' + a.lvl;
    if (a.scroll) return 'Grimoire';
    if (a.ench) return 'Enchantement d\'arme';
    return '';
  };
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
    const ab = it.ab && D.ABI[it.ab];
    const row = h('button', { type: 'button', class: 'item r' + it.r + (eq ? ' eq' : '') + (o.cls ? ' ' + o.cls : ''), on: { click: () => { DT.A.play('click'); o.onClick && o.onClick(it); } } },
      UI.itemIcon(it),
      h('span', { class: 'item-t' },
        h('b', { class: 'item-n', text: it.n + (it.plus ? ' +' + it.plus : '') }),
        h('small', { text: D.RAR[it.r].n + ' · ' + D.SLOTS.find((s) => s.id === it.slot).n + ' · niv. ' + it.ilvl }),
        h('small', { class: 'st', text: UI.statLine(it) }),
        ab ? h('small', { class: 'abt', text: '✦ ' + ab.n }) : null),
      o.right || h('span', { class: 'item-r' }, eq ? h('i', { class: 'tag', text: 'ÉQUIPÉ' }) : it.lock ? UI.icon('lock') : null, o.noVal ? null : UI.val(C.itemValue(it), 'sm')));
    return row;
  };
  UI.itemSheet = function (it) {
    const G = DT.G, S = DT.S;
    UI.sheet({ title: it.n + (it.plus ? ' +' + it.plus : ''), cls: 'itemsheet', body: (el, close) => {
      const draw = () => {
        U.clear(el);
        const eqId = S.eq[it.slot];
        const cmp = eqId && eqId !== it.id ? G.findItem(eqId) : null;
        el.append(h('div', { class: 'item-big r' + it.r }, UI.itemIcon(it, 'xl'),
          h('div', {}, h('b', { class: 'rar', style: { color: D.RAR[it.r].c }, text: D.RAR[it.r].n }), h('div', { text: D.SLOTS.find((s) => s.id === it.slot).n + ' · niveau d\'objet ' + it.ilvl }),
            h('div', { class: 'row gap' }, h('small', { class: 'muted', text: 'Valeur d\'échange' }), UI.val(C.itemValue(it))))));
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
        if (it.ab && D.ABI[it.ab]) {
          const a = C.abScaled(it.ab), r = Math.max(1, 1 + Math.floor((it.plus || 0) / 4));
          el.append(h('div', { class: 'card abcard', style: { '--c': DT.BT.abColor(it.ab) } }, h('div', { class: 'row between' }, h('b', { text: '✦ ' + a.n }), h('small', { class: 'muted', text: 'rang ' + r + ' (+1 tous les 4 niveaux d\'amélioration)' })),
            h('p', { text: UI.abDesc(a) }), h('small', { class: 'muted', text: UI.abMeta(a) + '. Capacité utilisable en combat tant que l\'objet est équipé.' })));
        }
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
        if (G.canEnchant(it)) acts.append(UI.btn(it.ab ? 'Changer l\'enchantement' : 'Enchanter (capacité)', () => UI.enchantSheet(it, draw), { cls: 'gemb' }));
        acts.append(UI.btn(it.lock ? 'Déverrouiller' : 'Verrouiller', () => { it.lock = !it.lock; DT.E.emit('inv'); draw(); }, { cls: 'ghost' }));
        if (!eq && !it.lock) {
          acts.append(UI.btn(h('span', {}, 'Vendre ', UI.coins(G.sellValue(it))), () => { const v = G.sell(it.id); DT.A.play('coin'); UI.toast('Vendu : +' + U.fmt(v) + ' pièces', 'good'); close(); }, { cls: 'danger' }));
          acts.append(UI.btn('Envoyer à un pote', () => { close(); UI.giftItem(it); }, { cls: 'ghost' }));
        }
        el.append(acts);
      };
      draw();
    } });
  };

  // ---------- Enchantement : acheter une capacité sur un objet ----------
  UI.enchantSheet = function (it, after) {
    const G = DT.G, S = DT.S;
    UI.sheet({ title: 'Enchanter ' + it.n, body: (el, close) => {
      const c = G.enchantCost(it);
      el.append(h('p', { text: 'Grave une capacité de combat dans cet objet. Elle est utilisable par toutes les classes tant que l\'objet est équipé, et monte de rang tous les 4 niveaux d\'amélioration (+4, +8). L\'objet vaut aussi plus cher en échange.' }),
        h('div', { class: 'row gap center' }, h('span', { class: 'muted', text: 'Prix :' }), UI.gems(c.gems), UI.coins(c.coins)));
      D.ENCHANTS.forEach((id) => {
        const a = D.ABI[id], cur = it.ab === id;
        el.append(h('div', { class: 'abcard card' + (cur ? ' inlo' : ''), style: { '--c': DT.BT.abColor(id) } },
          h('b', { text: '✦ ' + a.n }), h('small', { class: 'muted', text: UI.abMeta(a) }), h('p', { text: UI.abDesc(a) }),
          cur ? h('i', { class: 'tag', text: 'ACTUEL' }) : UI.btn('Graver', () => {
            if (G.enchant(it.id, id)) { DT.A.play('ach'); UI.toast(it.n + ' : ' + a.n + ' !', 'gold', true); close(); after && after(); }
            else { DT.A.play('error'); UI.toast('Il manque des éclats ou des pièces.', 'bad'); }
          }, { cls: 'gemb sm', disabled: S.gems < c.gems || S.coins < c.coins })));
      });
    } });
  };

  // ---------- Ouverture de coffres ----------
  UI.openChests = function (ids, onDone) {
    const queue = ids.filter((id) => DT.S.chests.find((c) => c.id === id));
    if (!queue.length) { onDone && onDone(); return; }
    const id = queue.shift();
    const ch = DT.S.chests.find((c) => c.id === id), T = D.CHEST_T[ch.t];
    let opened = false;
    DT.A.play('click');
    UI.sheet({ title: T.n, cls: 'reward chestopen', body: (el, close) => {
      const img = h('img', { class: 'chest-big', src: DT.P.chestURL(ch.t, false, 8), alt: T.n });
      const rays = h('i', { class: 'rays' });
      const stage = h('button', { type: 'button', class: 'chest-stage t' + ch.t, style: { '--c': T.c }, 'aria-label': 'Ouvrir le coffre', on: { click: () => open() } }, rays, img);
      const hint = h('p', { class: 'center muted', text: 'Tape le coffre pour l\'ouvrir !' });
      const res = h('div', { class: 'rw-list' });
      const acts = h('div', { class: 'acts' });
      el.append(stage, hint, res, acts);
      function open() {
        if (opened) return;
        opened = true;
        stage.classList.add('shake');
        U.vibrate([20, 40, 20, 40, 60]);
        setTimeout(() => {
          const out = DT.G.openChest(id);
          if (!out) { close(); return; }
          img.src = DT.P.chestURL(ch.t, true, 8);
          stage.classList.remove('shake'); stage.classList.add('open');
          DT.A.play(ch.t >= 3 ? 'ach' : 'chest');
          hint.textContent = out.items.length + ' objet' + (out.items.length > 1 ? 's' : '') + ' trouvé' + (out.items.length > 1 ? 's' : '') + (out.items.some((x) => x.r >= 4) ? ' — dont du très lourd !' : ' !');
          res.append(h('div', { class: 'rw' }, UI.icon('coin', 'big'), h('b', { text: '+' + U.fmt(out.coins) }), h('span', { text: 'pièces' })));
          if (out.gems) res.append(h('div', { class: 'rw' }, UI.icon('gem', 'big'), h('b', { text: '+' + out.gems }), h('span', { text: 'éclats' })));
          if (out.skin) res.append(h('div', { class: 'rw' }, h('img', { class: 'thumb sm', src: DT.P.poseThumb('triumph', C.heroLook({ skin: out.skin, gear: false }), 40), alt: '' }), h('b', { text: D.SKIN[out.skin].n }), h('span', { text: 'apparence exclusive !' })));
          if (out.pet) res.append(h('div', { class: 'rw' }, h('img', { class: 'thumb sm', src: DT.P.spriteURL(DT.P.SPR[D.PET[out.pet].spr], D.PET[out.pet].pal, 2), alt: '' }), h('b', { text: D.PET[out.pet].n }), h('span', { text: 'familier' })));
          out.items.sort((a, b) => b.r - a.r).forEach((it, i) => {
            const row = UI.itemRow(it, { onClick: () => UI.itemSheet(it) });
            row.classList.add('pop'); row.style.animationDelay = (i * 0.12) + 's';
            res.append(row);
          });
          const more = queue.filter((x) => DT.S.chests.find((c) => c.id === x)).length;
          if (more) acts.append(UI.btn('Coffre suivant (' + more + ')', () => { close(); setTimeout(() => UI.openChests(queue, onDone), 200); }, { cls: 'gold' }));
          acts.append(UI.btn(more ? 'Plus tard' : 'Super !', () => { close(); if (!more) onDone && onDone(); }, { cls: more ? 'ghost' : 'go' }));
        }, 650);
      }
    } });
  };

  // ---------- Envoyer un objet à un pote (code) ----------
  UI.giftItem = async function (it) {
    const ok = await UI.confirm({ title: 'Envoyer « ' + it.n + ' » ?', text: 'L\'objet quitte ton sac et devient un code à usage unique. Envoie ce code à ton pote : il le colle dans Marché › Potes pour le recevoir.', ok: 'Créer le code' });
    if (!ok) return;
    const code = DT.G.itemToCode(it.id);
    if (!code) { UI.toast('Impossible d\'envoyer cet objet (équipé ou verrouillé).', 'bad'); return; }
    UI.codeSheet(code, it);
  };
  UI.codeSheet = function (code, it) {
    UI.sheet({ title: 'Code cadeau', body: (el) => {
      const ta = h('textarea', { class: 'code', readonly: true, rows: 4 });
      ta.value = code;
      if (it) el.append(UI.itemRow(it, { noVal: true }));
      el.append(h('p', { text: 'Copie ce code et envoie-le à ton pote. Il ne marche qu\'une seule fois.' }), ta,
        UI.btn('Copier le code', async () => {
          try { await navigator.clipboard.writeText(code); UI.toast('Code copié !', 'good'); }
          catch (e) { ta.select(); try { document.execCommand('copy'); UI.toast('Code copié !', 'good'); } catch (e2) { UI.toast('Sélectionne le code et copie-le à la main.', ''); } }
        }, { cls: 'go wide' }));
    } });
  };

  DT.UI = UI;
})(window.DT);
