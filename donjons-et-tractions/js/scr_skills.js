'use strict';
// Donjons & Tractions — arbre des skills (générateurs de pièces + techniques de combat)
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h, P = DT.P, UI = DT.UI;

  function abDesc(ab) {
    const p = (x) => Math.round(x * 100) + '%';
    switch (ab.ty) {
      case 'dmg': return 'Inflige ' + p(ab.p) + ' de ton ATK.';
      case 'multi': return ab.n2 + ' coups de ' + p(ab.p) + ' ATK.';
      case 'crit': return 'Coup critique garanti de ' + p(ab.p) + ' ATK.';
      case 'stun': return p(ab.p) + ' ATK et étourdit ' + ab.s + ' s.';
      case 'heal': return 'Soigne ' + p(ab.h) + ' de tes PV max.';
      case 'shield': return 'Bouclier de ' + p(ab.h) + ' de tes PV max pendant ' + ab.d + ' s.';
      case 'buff': return '+' + p(ab.v) + ' ATK pendant ' + ab.d + ' s.';
      case 'bcrit': return '+' + p(ab.v) + ' de chance de critique pendant ' + ab.d + ' s.';
      case 'haste': return '+' + p(ab.v) + ' de vitesse pendant ' + ab.d + ' s.';
      case 'drain': return p(ab.p) + ' ATK et récupère ' + p(ab.h) + ' des dégâts en PV.';
      case 'dodge': return 'Esquive les ' + ab.n2 + ' prochaines attaques.';
      default: return '';
    }
  }
  DT.abDesc = abDesc;
  const tierTag = (t) => 'P' + t;

  // Quantité achetée selon le mode x1 / x10 / x100 / MAX
  function buyN(id) {
    const m = DT.S.settings.buy;
    if (m === 'max') return Math.max(1, C.maxBuy(id));
    return m;
  }

  function unlockFx(id) {
    const sk = D.SKILL[id];
    DT.A.play('skill');
    U.vibrate([30, 30, 60]);
    const anim = DT.PoseAnim(sk.pose, { w: 80, h: 56, wcls: 'big' });
    UI.sheet({ title: 'Nouveau skill !', cls: 'reward', onClose: () => anim.stop(), body: (el, close) => {
      el.append(anim.el, h('h3', { class: 'center', text: sk.n }),
        h('p', { class: 'center', text: 'Il produit maintenant des pièces en continu. Monte-le en niveau pour multiplier sa production.' }),
        h('div', { class: 'rw-list' },
          h('div', { class: 'rw' }, UI.icon('gem', 'big'), h('b', { text: '+' + D.TIERS[sk.t].gems }), h('span', { text: 'éclats' })),
          h('div', { class: 'rw' }, UI.icon('sword', 'big'), h('b', { text: sk.ab.n }), h('span', { text: abDesc(sk.ab) }))),
        h('p', { class: 'muted center', text: 'Tu sais le faire pour de vrai ? Certifie-le pour x3 de production.' }),
        UI.btn('Continuer', close, { cls: 'go wide' }));
    } });
  }

  function detail(id) {
    const sk = D.SKILL[id], S = DT.S;
    const anim = DT.PoseAnim(sk.pose, { w: 80, h: 56, wcls: 'big' });
    UI.sheet({ title: sk.n, onClose: () => anim.stop(), body: (el, close) => {
      const draw = () => {
        U.clear(el);
        const st = S.skills[id], br = D.BRANCHES[sk.br];
        el.append(anim.el,
          h('div', { class: 'row gap center' }, h('span', { class: 'pill', style: { color: br.c }, text: br.n }), h('span', { class: 'pill', text: 'Palier ' + sk.t }), st && st.cert ? h('span', { class: 'pill gold', text: 'CERTIFIÉ IRL' }) : null),
          h('p', { class: 'tip', text: sk.tip }));
        const ul = h('ul', { class: 'stats' });
        if (st) {
          ul.append(h('li', {}, h('span', { text: 'Niveau' }), h('b', { text: st.lvl })),
            h('li', {}, h('span', { text: 'Production' }), h('b', { text: U.fmt(C.skillProd(id) * (1 + C.bonus('prod')) * C.auraProd()) + '/s' })),
            h('li', {}, h('span', { text: 'Prochain palier x2' }), h('b', { text: C.nextMilestone(st.lvl) ? 'niveau ' + C.nextMilestone(st.lvl) : 'max' })));
        } else {
          ul.append(h('li', {}, h('span', { text: 'Production de base' }), h('b', { text: U.fmt(D.TIERS[sk.t].prod) + '/s par niveau' })));
        }
        ul.append(h('li', {}, h('span', { text: 'Bonus de combat' }), h('b', { text: '+' + (br.stat === 'crit' ? (0.4 * sk.t).toFixed(1) + '% CRIT' : br.stat === 'spd' ? (0.15 * sk.t).toFixed(2) + ' VIT' : U.fmt(D.TIERS[sk.t].stat * (br.stat === 'hp' ? 6 : br.stat === 'def' ? 0.6 : 1)) + ' ' + br.sn) + (st && st.cert ? ' (x2)' : '') })));
        el.append(ul);
        el.append(h('div', { class: 'card ab' }, h('div', { class: 'row gap' }, UI.icon('sword', 'big'), h('b', { text: sk.ab.n })), h('p', { text: abDesc(sk.ab) + ' Recharge : ' + sk.ab.cd + ' s.' })));
        el.append(h('div', { class: 'card irl' }, h('b', { text: 'Validation dans la vraie vie' }), h('p', { text: sk.irl })));
        const acts = h('div', { class: 'acts' });
        if (st) {
          const inLo = S.loadout.includes(id);
          acts.append(UI.btn(inLo ? 'Retirer du combat' : 'Utiliser en combat', () => {
            if (inLo) S.loadout = S.loadout.filter((x) => x !== id);
            else if (S.loadout.length < C.abilitySlots()) S.loadout.push(id);
            else { UI.toast('Tes ' + C.abilitySlots() + ' emplacements de techniques sont pleins. Retires-en une d\'abord.', 'bad'); return; }
            DT.E.emit('loadout'); draw();
          }, { cls: inLo ? 'ghost' : 'go' }));
          if (!st.cert) acts.append(UI.btn('Je le réussis pour de vrai', async () => {
            const ok = await UI.confirm({ title: 'Certifier « ' + sk.n + ' »', text: 'Critère : ' + sk.irl + '. Tu confirmes l\'avoir réussi en vrai ? (Le jeu te fait confiance.)', ok: 'Oui, je l\'ai fait !' });
            if (ok && DT.G.certify(id)) { DT.A.play('ach'); UI.toast(sk.n + ' certifié ! Production x3, +' + D.TIERS[sk.t].gems * 2 + ' éclats', 'gold', true); draw(); SCR.redraw(); }
          }, { cls: 'gold' }));
          acts.append(UI.btn('Montrer au parc', () => { U.store.set('dt_show', id); close(); UI.go('park'); }, { cls: 'ghost' }));
        }
        el.append(acts);
      };
      draw();
    } });
  }

  // ---------- Écran ----------
  const SCR = { tabbed: true };
  let br = 'all', els = {}, refs = [];
  SCR.render = function (root) {
    els.sum = h('div', { class: 'card sumcard' });
    els.chips = h('div', { class: 'chips' });
    els.buy = h('div', { class: 'seg small' });
    els.list = h('div', { class: 'skilllist' });
    root.append(h('h1', { class: 'scr-t', text: 'Skills' }), els.sum, els.chips, h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'ACHAT' }), els.buy), els.list);
    DT.E.on('skill', () => SCR.redraw());
    DT.E.on('prestige', () => SCR.redraw());
    SCR.redraw();
  };
  SCR.redraw = function () {
    drawChips(); drawBuy(); drawList(); SCR.update();
  };
  function drawChips() {
    const S = DT.S;
    const count = (b) => D.SKILLS.filter((s) => (b === 'all' || s.br === b) && S.skills[s.id]).length + '/' + D.SKILLS.filter((s) => b === 'all' || s.br === b).length;
    U.clear(els.chips).append(h('button', { type: 'button', class: 'chip-b' + (br === 'all' ? ' on' : ''), on: { click: () => { br = 'all'; SCR.redraw(); } } }, 'Tous ' + count('all')),
      ...D.BR_ORDER.map((b) => h('button', { type: 'button', class: 'chip-b' + (br === b ? ' on' : ''), style: { '--bc': D.BRANCHES[b].c }, on: { click: () => { br = b; SCR.redraw(); } } }, D.BRANCHES[b].n + ' ' + count(b))));
  }
  function drawBuy() {
    const S = DT.S;
    U.clear(els.buy).append(...[[1, 'x1'], [10, 'x10'], [100, 'x100'], ['max', 'MAX']].map(([v, n]) =>
      h('button', { type: 'button', class: S.settings.buy === v ? 'on' : '', on: { click: () => { S.settings.buy = v; drawBuy(); SCR.update(); } } }, n)));
  }
  function drawList() {
    const S = DT.S, look = P.lookFor(S.look, S.skin);
    U.clear(els.list);
    refs = [];
    const order = br === 'all' ? D.BR_ORDER : [br];
    for (const b of order) {
      const skills = D.SKILLS.filter((s) => s.br === b).sort((x, y) => x.t - y.t);
      if (br === 'all') els.list.append(h('h3', { class: 'brh', style: { color: D.BRANCHES[b].c }, text: D.BRANCHES[b].n }));
      for (const sk of skills) {
        const st = S.skills[sk.id];
        const thumb = h('img', { class: 'thumb', src: st ? P.poseThumb(sk.pose, look, 48) : P.poseThumb(sk.pose, look, 48, 0, C.unlockState(sk.id).preOk ? '#7a8aa6' : '#475069'), alt: '' });
        if (st) {
          const lvl = h('small'), prod = h('small', { class: 'prod' }), ms = UI.bar(0, 'ms');
          const btn = h('button', { type: 'button', class: 'btn gold buy', on: { click: (e) => {
            const n = buyN(sk.id);
            if (DT.G.buyLevels(sk.id, n)) { DT.A.play('buy'); UI.floatFrom(btn, '+' + n + ' niv.', '#a7f070'); SCR.update(); }
            else DT.A.play('error');
            e.stopPropagation();
          } } });
          const card = h('div', { class: 'skill on' + (st.cert ? ' cert' : '') },
            h('button', { type: 'button', class: 'skill-main', on: { click: () => detail(sk.id) } }, thumb,
              h('span', { class: 'skill-t' }, h('b', {}, sk.n, st.cert ? h('i', { class: 'certb', title: 'Certifié IRL' }, '★') : null), lvl, prod, ms)),
            btn);
          refs.push({ type: 'on', id: sk.id, lvl, prod, ms, btn });
          els.list.append(card);
        } else {
          const req = h('div', { class: 'reqs' });
          const btn = h('button', { type: 'button', class: 'btn go learn', on: { click: (e) => {
            e.stopPropagation();
            if (DT.G.unlockSkill(sk.id)) { unlockFx(sk.id); }
            else { DT.A.play('error'); UI.toast('Conditions pas encore remplies.', 'bad'); }
          } } });
          const card = h('div', { class: 'skill off' }, h('button', { type: 'button', class: 'skill-main', on: { click: () => detail(sk.id) } }, thumb,
            h('span', { class: 'skill-t' }, h('b', {}, sk.n, h('i', { class: 'tier', text: tierTag(sk.t) })), req)), btn);
          refs.push({ type: 'off', id: sk.id, req, btn, card });
          els.list.append(card);
        }
      }
    }
  }
  SCR.update = function () {
    const S = DT.S;
    if (els.sum) {
      const n = Object.keys(S.skills).length, cert = Object.values(S.skills).filter((x) => x.cert).length;
      U.clear(els.sum).append(h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'PRODUCTION' }), h('b', { class: 'gold-t', text: U.fmt(C.prod()) + '/s' })),
        h('small', { class: 'muted', text: n + '/49 skills débloqués · ' + cert + ' certifiés IRL · chaque palier de niveau (10, 25, 50, 100…) double la production' }));
    }
    let avail = 0;
    for (const r of refs) {
      if (r.type === 'on') {
        const st = S.skills[r.id];
        if (!st) continue;
        const n = buyN(r.id), cost = C.levelCost(r.id, n);
        r.lvl.textContent = 'Niveau ' + st.lvl;
        r.prod.textContent = U.fmt(C.skillProd(r.id) * (1 + C.bonus('prod')) * C.auraProd()) + ' pièces/s';
        const nm = C.nextMilestone(st.lvl), pm = [0, ...D.MILESTONES].filter((m) => m <= st.lvl).pop();
        r.ms.firstChild.style.width = nm ? ((st.lvl - pm) / (nm - pm) * 100) + '%' : '100%';
        r.ms.title = nm ? 'x2 au niveau ' + nm : 'Tous les paliers atteints';
        const can = S.coins >= cost;
        r.btn.disabled = !can;
        const key = n + '|' + U.fmt(cost);
        if (r.key !== key) { r.key = key; U.clear(r.btn).append(h('span', { class: 'n', text: '+' + n }), UI.coins(cost)); }
      } else {
        const us = C.unlockState(r.id), sk = D.SKILL[r.id];
        const parts = [];
        if (!us.preOk) parts.push(h('small', { class: 'no', text: 'Requiert : ' + sk.pre.filter((p) => !S.skills[p]).map((p) => D.SKILL[p].n).join(', ') }));
        if (sk.req > 0) parts.push(h('small', { class: us.volOk ? 'ok' : 'no' }, D.BRANCHES[sk.br].n + ' IRL : ' + U.fmtInt(Math.min(us.vol, sk.req)) + '/' + U.fmtInt(sk.req) + ' pts', UI.bar(us.vol / sk.req, 'irlbar')));
        const key = us.preOk + '|' + Math.floor(Math.min(us.vol, sk.req));
        if (r.key !== key) { r.key = key; U.clear(r.req).append(...parts); U.clear(r.btn).append(h('span', { class: 'n', text: 'Apprendre' }), us.cost ? UI.coins(us.cost) : h('b', { text: 'Gratuit' })); }
        r.btn.disabled = !us.ok;
        r.card.classList.toggle('ready', us.ok);
        r.card.classList.toggle('far', !us.preOk);
        if (us.ok) avail++;
      }
    }
    if (!refs.length) {
      for (const sk of D.SKILLS) if (!S.skills[sk.id] && C.unlockState(sk.id).ok) avail++;
    }
    UI.badge('skills', avail);
  };
  SCR.show = function () { SCR.redraw(); };
  SCR.detail = detail;
  DT.SCR.skills = SCR;
})(window.DT);
