'use strict';
// Donjons & Tractions v2 — donjons à 30 paliers, combats au tour par tour, raid hebdomadaire
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h, P = DT.P, UI = DT.UI, BT = DT.BT;
  const ST_N = { burn: ['BRÛLURE', '#ef7d57'], poison: ['POISON', '#a7f070'], bleed: ['SAIGNE', '#ff5f6d'], stun: ['ÉTOURDI', '#ffcd75'], slow: ['RALENTI', '#73eff7'], def: ['ARMURE-', '#ffcd75'], mark: ['MARQUÉ', '#ff5f6d'], atk: ['ATK+', '#ef7d57'], crit: ['CRIT+', '#ffcd75'], spd: ['VIT+', '#73eff7'], defup: ['DEF', '#73eff7'], regen: ['RÉGÉN', '#a7f070'], rage: ['RAGE', '#e0667a'] };

  // ===================== Combat au tour par tour =====================
  function battleSheet(o) {
    const S = DT.S;
    const cfg = BT.heroCfg(o.cfg);
    if (S.pet && D.PET[S.pet]) cfg.petSpr = D.PET[S.pet];
    const fight = new BT.Fight(cfg);
    let view = null, raf = 0, last = 0, closed = false, phase = 'idle', overT = 0, label = '';
    const speed = () => S.settings.speed || 1;
    const auto = () => !!S.settings.auto;

    const canvas = h('canvas', { class: 'stage', 'aria-label': 'Combat : tape un ennemi pour le cibler', on: { pointerdown: onCanvas } });
    const title = h('div', { class: 'bt-title' });
    const order = h('div', { class: 'bt-order', 'aria-label': 'Ordre des tours' });
    const hpBar = h('div', { class: 'hp hero' }, h('i'), h('em'), h('span'));
    const mpBar = h('div', { class: 'hp mp' }, h('i'), h('span'));
    const stEl = h('div', { class: 'bt-st' });
    const tgtEl = h('div', { class: 'bt-tgt' });
    const overlay = h('div', { class: 'bt-over', hidden: true });
    const hint = h('p', { class: 'bt-hint' });
    const logEl = h('ul', { class: 'blog', 'aria-live': 'polite' });
    const acts = h('div', { class: 'bt-acts' });
    const abGrid = h('div', { class: 'bt-abs' });
    const ctrl = h('div', { class: 'bt-ctrl' });

    const log = (text, c) => {
      logEl.prepend(h('li', { style: c ? { color: c } : null, text }));
      while (logEl.children.length > 4) logEl.lastChild.remove();
    };
    const nameOf = (id) => { const a = fight.byId(id); return a ? (a.side === 'h' ? 'Tu' : a.n) : ''; };
    function logEvs(evs) {
      for (const e of evs) {
        if (e.t === 'act' && e.who === 'h' && e.kind === 'ab') log('Tu lances ' + e.name + ' !', e.c);
        else if (e.t === 'act' && e.who !== 'h' && e.kind === 'charge') log(nameOf(e.who) + ' charge une attaque lourde ! Étourdis-le ou mets-toi en garde.', '#e0667a');
        else if (e.t === 'act' && e.who === 'h' && e.kind === 'potion') log('Tu bois une potion.', '#a7f070');
        else if (e.t === 'text' && e.text === 'ENRAGÉ !') log(nameOf(e.id) + ' est enragé : il frappe plus fort !', '#ef7d57');
        else if (e.t === 'text' && e.text === 'INTERROMPU') log('Attaque de ' + nameOf(e.id) + ' interrompue !', '#73eff7');
        else if (e.t === 'hit' && e.id === 'h' && e.crit) log('Coup critique encaissé : ' + U.fmt(e.amt) + ' !', '#e0667a');
        else if (e.t === 'die') log(e.id === 'h' ? 'Tu es K.O.' : nameOf(e.id) + ' est vaincu !', e.id === 'h' ? '#e0667a' : '#a7f070');
      }
    }
    function play(evs) {
      if (!evs.length) return;
      if (view) view.play(evs, speed());
      logEvs(evs);
    }

    // ---------- Déroulé des tours ----------
    function step() {
      if (fight.over) { phase = 'over'; overT = 0.6; drawActs(); return; }
      const a = fight.nextActor();
      const ok = fight.startTurn(a);
      const evs = fight.ev.splice(0);
      if (fight.over || !ok) { play(evs); fight.check(); drawOrder(); return; }
      if (a.side === 'h') {
        play(evs);
        if (auto()) heroDo(fight.autoChoice());
        else { phase = 'input'; drawActs(); drawOrder(); }
      } else {
        fight.foeAct(a);
        play(evs.concat(fight.ev.splice(0)));
        drawOrder();
      }
    }
    function heroDo(act) {
      if (!fight.heroAct(act)) return false;
      play(fight.ev.splice(0));
      phase = 'run';
      drawActs(); drawOrder();
      return true;
    }
    function onCanvas(e) {
      if (!view) return;
      const r = canvas.getBoundingClientRect();
      const gx = (e.clientX - r.left) / r.width * BT.W, gy = (e.clientY - r.top) / r.height * BT.H;
      const f = view.pick(gx, gy);
      if (f) { fight.target = f.id; fight.cfg.keepTarget = true; DT.A.play('click'); drawTarget(); }
    }

    // ---------- Commandes ----------
    const mk = (label, sub, fn, cls) => h('button', { type: 'button', class: 'act ' + (cls || ''), on: { click: () => { if (phase !== 'input') return; DT.A.play('click'); U.vibrate(8); fn(); } } }, h('b', { text: label }), sub ? h('small', { text: sub }) : null);
    const bAtk = mk('Attaque', '+10 mana', () => heroDo({ k: 'attack' }), 'atk');
    const bDef = mk('Garde', '-50% dégâts', () => heroDo({ k: 'defend' }), 'def');
    const bPot = mk('Potion', 'x3', () => { if (fight.potions <= 0) { UI.toast('Plus de potion pour ce combat.', 'bad'); return; } heroDo({ k: 'potion' }); }, 'pot');
    acts.append(bAtk, bDef, bPot);
    const abBtns = fight.abs.map((slot, i) => {
      const cd = h('i', { class: 'cd' });
      const b = h('button', { type: 'button', class: 'ab', style: { '--c': BT.abColor(slot.id) }, on: { click: () => {
        if (phase !== 'input') return;
        if (!fight.canUse(i)) { DT.A.play('error'); UI.toast(slot.cd > 0 ? slot.a.n + ' : encore ' + slot.cd + ' tour' + (slot.cd > 1 ? 's' : '') + '.' : 'Pas assez de mana (' + slot.a.mp + ').', 'bad'); return; }
        DT.A.play('click'); U.vibrate(12); heroDo({ k: 'ab', i });
      } } }, h('b', { text: slot.a.n }), h('small', { text: (slot.a.mp ? slot.a.mp + ' mana' : 'gratuit') + (slot.a.tg === 'all' ? ' · zone' : slot.a.tg === 'self' ? ' · soi' : '') }), cd);
      return { b, cd, slot };
    });
    abGrid.append(...abBtns.map((x) => x.b));
    if (!abBtns.length) abGrid.append(h('p', { class: 'muted', text: 'Aucune capacité équipée : va dans Héros › Classe.' }));
    const autoB = UI.btn('', () => { S.settings.auto = !S.settings.auto; drawCtrl(); if (auto() && phase === 'input') heroDo(fight.autoChoice()); }, { cls: 'ghost sm' });
    const spdB = UI.btn('', () => { S.settings.speed = speed() >= 3 ? 1 : speed() + 1; drawCtrl(); }, { cls: 'ghost sm' });
    const fleeB = UI.btn(o.raid ? 'Arrêter' : 'Fuir', async () => {
      const ok = await UI.confirm({ title: o.raid ? 'Arrêter l\'attaque ?' : 'Quitter le donjon ?', text: o.raid ? 'Les dégâts déjà infligés comptent.' : 'Tu gardes le butin et les paliers déjà franchis.', ok: o.raid ? 'Arrêter' : 'Quitter', danger: true });
      if (ok) finish('flee');
    }, { cls: 'ghost sm danger-t' });
    ctrl.append(autoB, spdB, fleeB);
    function drawCtrl() {
      autoB.textContent = 'Auto : ' + (auto() ? 'oui' : 'non');
      autoB.classList.toggle('on', auto());
      spdB.textContent = 'Vitesse x' + speed();
    }
    function drawActs() {
      const my = phase === 'input';
      acts.classList.toggle('wait', !my); abGrid.classList.toggle('wait', !my);
      bPot.lastChild.textContent = 'x' + fight.potions + ' · +40% PV';
      bPot.classList.toggle('off', fight.potions <= 0);
      for (const x of abBtns) {
        const ready = fight.canUse(abBtns.indexOf(x));
        x.b.classList.toggle('ready', ready && my);
        x.b.classList.toggle('off', !ready);
        x.cd.textContent = x.slot.cd > 0 ? String(x.slot.cd) : '';
        x.cd.hidden = !(x.slot.cd > 0);
      }
      hint.textContent = fight.over ? '' : my ? 'À toi ! Choisis une action. Tape un ennemi pour le cibler.' : auto() ? 'Combat automatique…' : 'Tour ennemi…';
      hint.classList.toggle('me', my);
    }
    const thumbs = {};
    function thumbOf(a) {
      if (thumbs[a.id]) return thumbs[a.id];
      let src;
      if (a.side === 'h') src = P.poseThumb('heroidle', cfg.look, 32);
      else if (a.spr === 'human') src = P.poseThumb('stance', a.look, 32);
      else src = P.spriteURL(P.SPR[a.spr], a.pal, 2);
      return (thumbs[a.id] = src);
    }
    function drawOrder() {
      if (fight.over) { U.clear(order); return; }
      const ids = fight.order(7);
      U.clear(order).append(h('small', { text: 'TOURS' }), ...ids.map((id, i) => {
        const a = fight.byId(id);
        return h('span', { class: 'ord ' + (id === 'h' ? 'me' : 'foe') + (i === 0 ? ' now' : '') + (a && a.charge ? ' chg' : '') }, h('img', { src: thumbOf(a), alt: a ? a.n : '' }));
      }));
      drawTarget();
    }
    function stChips(a) {
      const out = [];
      for (const k in a.st) { const s = a.st[k]; if (s && s.t > 0 && ST_N[k]) out.push(h('i', { class: 'stc', style: { color: k === 'defup' && s.v < 0 ? '#e0667a' : ST_N[k][1] }, text: (k === 'defup' ? (s.v > 0 ? 'DEF+' : 'DEF-') : ST_N[k][0]) + ' ' + s.t })); }
      if (a.shield > 0) out.push(h('i', { class: 'stc', style: { color: '#73eff7' }, text: 'BOUCLIER ' + U.fmt(a.shield) }));
      if (a.dodge > 0) out.push(h('i', { class: 'stc', style: { color: '#a7f070' }, text: 'ESQUIVE x' + a.dodge }));
      if (a.guard) out.push(h('i', { class: 'stc', style: { color: '#ffcd75' }, text: 'GARDE' }));
      if (a.enraged) out.push(h('i', { class: 'stc', style: { color: '#e0667a' }, text: 'ENRAGÉ' }));
      if (a.charge) out.push(h('i', { class: 'stc blink', style: { color: '#e0667a' }, text: 'CHARGE !' }));
      return out;
    }
    function drawTarget() {
      const t = fight.pickTarget();
      if (!t) { U.clear(tgtEl); return; }
      U.clear(tgtEl).append(h('b', { text: '▸ ' + t.n }), h('span', { text: t.inv ? 'dégâts : ' + U.fmt(fight.dmgDealt) : U.fmt(Math.ceil(t.hp)) + '/' + U.fmt(Math.ceil(t.max)) }), ...stChips(t));
    }
    let lastSt = '';
    function setBars() {
      const H = fight.hero;
      const dhp = view ? Math.max(0, view.ent.h.dhp) : H.hp;
      hpBar.firstChild.style.width = (dhp / H.max * 100) + '%';
      hpBar.children[1].style.width = (H.shield > 0 ? Math.min(100, H.shield / H.max * 100) : 0) + '%';
      hpBar.lastChild.textContent = 'PV ' + U.fmt(Math.ceil(dhp)) + '/' + U.fmt(Math.ceil(H.max));
      hpBar.classList.toggle('low', dhp < H.max * 0.3);
      mpBar.firstChild.style.width = (H.mp / H.mpMax * 100) + '%';
      mpBar.lastChild.textContent = 'MANA ' + Math.floor(H.mp) + '/' + H.mpMax;
      const key = JSON.stringify(H.st) + H.shield + H.dodge + H.guard;
      if (key !== lastSt) { lastSt = key; U.clear(stEl).append(...stChips(H)); drawTarget(); }
      if (o.raid) title.textContent = label + ' · tour ' + Math.min(fight.turns, cfg.turnLimit) + '/' + cfg.turnLimit + ' · ' + U.fmt(fight.dmgDealt) + ' dégâts';
    }
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (!view) {
        if (!canvas.isConnected || !canvas.clientWidth) return;
        view = new BT.View(fight, canvas, o.theme);
        if (label) view.banner = { text: label, c: '#f4f4f4', until: 1.4 };
      }
      const now = ts / 1000;
      const dt = Math.min(0.05, now - (last || now));
      last = now;
      view.draw(dt);
      if (phase === 'run' && !view.busy()) step();
      else if (phase === 'over' && !view.busy()) { overT -= dt; if (overT <= 0) { phase = 'idle'; o.onResult(fight, api); } }
      setBars();
    }

    let close;
    function finish(reason) {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      close && close();
      o.onEnd && o.onEnd({ reason, fight });
    }
    const api = {
      // Nouvelle vague d'ennemis (palier suivant)
      next(foes, lbl) {
        label = lbl;
        fight.setFoes(foes);
        fight.cfg.keepTarget = false;
        if (view) { view.layout(); view.banner = { text: lbl, c: '#f4f4f4', until: view.t + 1.4 }; }
        title.textContent = o.title + ' · ' + lbl;
        log(foes.length === 1 && foes[0].n === lbl ? lbl + ' apparaît !' : lbl + ' : ' + foes.map((f) => f.n).join(', ') + '.', '#94b0c2');
        U.clear(overlay); overlay.hidden = true;
        phase = 'run';
        drawActs(); drawOrder();
      },
      // Repos entre deux paliers
      rest(hpF, mpF) {
        const H = fight.hero;
        H.hp = Math.min(H.max, H.hp + H.max * hpF);
        H.mp = Math.min(H.mpMax, H.mp + H.mpMax * mpF);
        H.st = {}; H.shield = 0; H.dodge = 0; H.guard = false;
        if (view) view.ent.h.dhp = H.hp;
      },
      revive(frac) {
        const H = fight.hero;
        H.hp = H.max * frac; H.alive = true; H.st = {}; H.dodge = 1;
        fight.over = false; fight.result = null;
        for (const f of fight.foes) f.charge = false;
        if (view) { view.ent.h.dhp = H.hp; view.ent.h.pose = 'stance'; view.ent.h.dead = false; }
        U.clear(overlay); overlay.hidden = true;
        phase = 'run';
        drawActs(); drawOrder();
      },
      overlay(nodes) { nodes = nodes.filter(Boolean); U.clear(overlay).append(...nodes); overlay.hidden = !nodes.length; },
      log, finish, fight,
    };
    close = UI.sheet({ title: '', cls: 'battle', modal: true, body: (el) => {
      el.append(title, order,
        h('div', { class: 'stage-wrap bt' }, canvas, overlay),
        h('div', { class: 'bt-me' }, hpBar, mpBar), stEl, tgtEl, logEl,
        h('div', { class: 'bt-bottom' }, hint, acts, abGrid, ctrl));
      title.textContent = o.title;
    } });
    drawCtrl(); drawActs();
    raf = requestAnimationFrame(loop);
    return api;
  }

  // ===================== Expédition (jusqu'à 10 paliers) =====================
  const kindOf = (fl) => fl === D.FLOORS ? 'boss' : fl % 10 === 0 ? 'guard' : 'mob';
  const floorLabel = (fl) => fl === D.FLOORS ? 'BOSS · palier 30' : fl % 10 === 0 ? 'GARDIEN · palier ' + fl : 'Palier ' + fl;
  function run(d, mode, start) {
    const S = DT.S, dg = D.DUNGEONS[d], cost = C.dungeonCost(d);
    if (!S.cls) { DT.SCR.hero.pickClass(() => run(d, mode, start)); return; }
    if (!DT.G.spendEnergy(cost)) { DT.A.play('error'); UI.energyInfo(); return; }
    const end = Math.min(D.FLOORS, Math.floor((start - 1) / 10) * 10 + 10);
    let fl = start, revived = false, contT = 0;
    const loot = { coins: 0, gems: 0, items: [], chests: [], potions: 0, n: 0, clear: null, pet: null };
    const api = battleSheet({
      theme: dg.theme, title: dg.n + (mode ? ' · ' + D.MODES[mode].n : ''),
      onResult(fight, api) {
        if (fight.result.win) {
          const kind = kindOf(fl);
          const r = DT.G.floorWin(d, mode, fl, kind);
          loot.coins += r.coins; loot.gems += r.gems; loot.items.push(...r.items); loot.n++;
          if (r.chest) loot.chests.push(r.chest);
          if (r.potion) loot.potions++;
          if (r.pet) loot.pet = r.pet;
          if (r.clear) loot.clear = r.clear;
          if (fl >= end) { api.finish('clear'); return; }
          // pause entre deux paliers
          const nodes = [h('b', { text: 'Palier ' + fl + ' franchi !' + (r.first ? ' (record)' : '') }),
            h('p', {}, '+' + U.fmt(r.coins) + ' pièces' + (r.gems ? ' · +' + r.gems + ' éclats' : '') + (r.items.length ? ' · ' + r.items.length + ' objet' + (r.items.length > 1 ? 's' : '') : '') + (r.potion ? ' · +1 potion' : '')),
            r.chest ? h('div', { class: 'row gap center' }, UI.chestImg(r.chest.t), h('b', { class: 'gold-t', text: D.CHEST_T[r.chest.t].n + ' !' })) : null,
            h('small', { class: 'muted', text: 'Repos : +25 % PV, +30 % mana. Suivant : ' + floorLabel(fl + 1) + '.' }),
            h('div', { class: 'row gap center' },
              UI.btn('Continuer', () => go(), { cls: 'go' }),
              UI.btn('Rentrer', () => api.finish('home'), { cls: 'ghost' }))];
          api.overlay(nodes);
          const go = () => { clearTimeout(contT); fl++; api.rest(0.25, 0.3); api.next(BT.floorFoes(d, fl, mode), floorLabel(fl)); };
          if (S.settings.auto && !r.chest) contT = setTimeout(go, 1800 / (S.settings.speed || 1));
        } else if (!revived) {
          api.overlay([h('b', { text: 'K.O. !' }), h('p', { text: 'Tu tombes au palier ' + fl + '.' }),
            h('div', { class: 'row gap center' },
              UI.btn(h('span', {}, 'Revenir (', UI.icon('gem'), ' 20)'), () => {
                if (!DT.G.spendGems(20)) { UI.toast('Pas assez d\'éclats.', 'bad'); return; }
                revived = true; api.revive(0.6); DT.A.play('heal');
              }, { cls: 'gemb', disabled: S.gems < 20 }),
              UI.btn('Rentrer', () => api.finish('dead'), { cls: 'ghost' }))]);
        } else api.finish('dead');
      },
      onEnd({ reason }) {
        clearTimeout(contT);
        const best = C.floor(d, mode);
        const c = loot.clear;
        const title = c ? 'Donjon conquis !' : reason === 'clear' ? 'Expédition réussie !' : reason === 'dead' ? 'Défaite' : 'Retour au camp';
        let text = loot.n + ' palier' + (loot.n > 1 ? 's' : '') + ' franchi' + (loot.n > 1 ? 's' : '') + ' · record ' + best + '/' + D.FLOORS + '.';
        if (c) text = 'Tu as vaincu ' + dg.boss.n + ' en ' + D.MODES[mode].n + ' ! ' + text;
        else if (reason === 'dead' && !loot.n) text = 'Monte ta classe en t\'entraînant, améliore ton stuff ou apprends des capacités, puis reviens.';
        UI.rewards(title, { text, coins: loot.coins, gems: loot.gems + (c ? c.gems : 0), items: loot.items.concat(c && c.item ? [c.item] : [], (c && c.items) || []), chests: loot.chests, potions: loot.potions,
          skin: c && c.skin, pet: (c && c.pet) || loot.pet, sound: reason === 'dead' ? 'lose' : 'win', okLabel: 'Retour' });
        SCR.redraw();
      },
    });
    api.next(BT.floorFoes(d, fl, mode), floorLabel(fl));
  }

  // ===================== Raid hebdomadaire =====================
  const RAID = {};
  const RAID_TURNS = 15;
  function raidBoss() { return D.RAID_BOSSES[U.weekIndex() % D.RAID_BOSSES.length]; }
  function raidLevel() {
    let hi = 0;
    D.DUNGEONS.forEach((x, i) => { if (C.dungeonUnlocked(i)) hi = i; });
    return hi;
  }
  RAID.open = function () {
    const S = DT.S, r = DT.G.raidState(), boss = raidBoss();
    UI.sheet({ title: 'Raid de la semaine', body: (el, close) => {
      const draw = () => {
        U.clear(el);
        const tier = r.th.filter((t) => r.dmg >= t).length;
        const realDmg = (DT.NET && DT.NET.raid) ? DT.NET.raid.reduce((s, x) => s + (x.dmg || 0), 0) : 0;
        const com = DT.G.raidCommunity(Math.min(0.2, realDmg / (r.th[3] * 40 || 1)));
        el.append(h('div', { class: 'raid-top' }, h('img', { class: 'boss-img', src: P.spriteURL(P.SPR[boss.spr], boss.pal, 4), alt: '' }),
          h('div', {}, h('h3', { text: boss.n }), h('p', { class: 'muted', text: 'Toute la communauté le frappe cette semaine. Chaque attaque dure ' + RAID_TURNS + ' tours : inflige un maximum de dégâts.' }),
            h('small', { text: 'Fin dans ' + U.timeFmt(U.nextWeekStart()) }))),
          h('div', { class: 'card' }, h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'COMMUNAUTÉ' }), h('b', { text: Math.round(com * 100) + '%' })), UI.bar(com, 'raidbar'),
            h('small', { class: 'muted', text: com >= 1 ? 'Le boss est tombé ! Les paliers restent à décrocher jusqu\'à lundi.' : 'Les athlètes du monde entier ont entamé sa barre de vie.' })),
          h('div', { class: 'card' }, h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'TES DÉGÂTS' }), h('b', { class: 'gold-t', text: U.fmt(r.dmg) })),
            h('small', { class: 'muted', text: r.hits + ' attaque' + (r.hits > 1 ? 's' : '') + ' cette semaine' }),
            h('ul', { class: 'tiers' }, r.th.map((t, i) => {
              const rw = DT.G.RAID_REW[i];
              const got = r.claimed.includes(i), ok = r.dmg >= t;
              return h('li', { class: ok ? 'ok' : '' }, h('span', { text: 'Palier ' + (i + 1) + ' · ' + U.fmt(t) }),
                h('small', { text: rw.gems + ' éclats' + (rw.chest != null ? ' + ' + D.CHEST_T[rw.chest].n : '') + (rw.skin ? ' + Spartiate' : '') }),
                got ? h('i', { class: 'tag', text: 'REÇU' }) : UI.btn('Prendre', () => {
                  const out = DT.G.raidClaim(i);
                  if (out) { UI.rewards('Palier ' + (i + 1), { gems: out.gems, coins: out.coins, chests: out.chest ? [out.chest] : [], skin: out.skin }); draw(); }
                }, { cls: 'gold sm', disabled: !ok }));
            }))),
          UI.btn(h('span', {}, 'Attaquer (', UI.icon('bolt'), ' 3)'), () => { close(); attack(); }, { cls: 'go wide big', disabled: S.energy < 3 }));
        if (tier >= 4) el.append(h('p', { class: 'center gold-t', text: 'Tous les paliers atteints. Respect !' }));
        const rows = raidBoard(r.dmg);
        el.append(h('div', { class: 'card' }, h('b', { text: 'Meilleurs dégâts' }), h('ol', { class: 'board' }, rows.map((x, i) => h('li', { class: x.me ? 'me' : x.real ? 'real' : '' }, h('i', { class: 'rk', text: '#' + (i + 1) }), h('span', { text: x.nick }), h('b', { text: U.fmt(x.dmg) }))))));
      };
      draw();
    } });
  };
  function raidBoard(myDmg) {
    const wk = U.weekIndex(), r = U.rng(U.hash('raid' + wk));
    const frac = DT.G.raidCommunity();
    const scale = Math.max(200, C.stats().atk * 120);
    const bots = D.BOTS.slice(0, 12).map((n) => ({ nick: n, dmg: Math.round(scale * Math.pow(r(), 1.6) * 2.4 * frac) }));
    const real = (DT.NET && DT.NET.raid) ? DT.NET.raid.filter((x) => !x.me).map((x) => ({ nick: x.nick, dmg: x.dmg, real: true })) : [];
    return bots.concat(real, [{ nick: DT.S.nick + ' (toi)', dmg: Math.round(myDmg), me: true }]).sort((a, b) => b.dmg - a.dmg).slice(0, 15);
  }
  function attack() {
    if (!DT.S.cls) { DT.SCR.hero.pickClass(() => attack()); return; }
    if (!DT.G.spendEnergy(3)) { UI.energyInfo(); return; }
    DT.G.raidState();
    const boss = raidBoss(), lv = raidLevel();
    const st = C.foeStats(lv, 3, 0, true);
    const foe = { n: boss.n, spr: boss.spr, pal: boss.pal, s: 2, hp: 1e15, atk: st.atk * 0.8, def: st.def, spd: st.spd, crit: 0.05, inv: true, sp: 'heavy' };
    const api = battleSheet({
      theme: 'crypt', title: 'Raid', raid: true, cfg: { turnLimit: RAID_TURNS, raid: true },
      onResult(fight, api) { api.finish(fight.result && fight.result.timeout ? 'time' : 'dead'); },
      onEnd({ fight }) {
        const dmg = Math.round(fight.dmgDealt);
        const before = DT.G.raidState().th.filter((t) => DT.G.raidState().dmg >= t).length;
        const tier = DT.G.raidAddDamage(dmg);
        DT.NET && DT.NET.pushRaid && DT.NET.pushRaid();
        UI.rewards('Attaque terminée', { text: U.fmt(dmg) + ' dégâts infligés en ' + Math.min(fight.turns, RAID_TURNS) + ' tours.' + (tier > before ? ' Nouveau palier atteint : ' + tier + '/4 !' : ''), sound: 'win', okLabel: 'Voir le raid', onOk: () => RAID.open() });
      },
    });
    api.next([foe], boss.n);
  }
  RAID.attack = attack;

  // ===================== Écran =====================
  const SCR = { tabbed: true };
  let els = {};
  const modeSel = {}, startSel = {};
  SCR.render = function (root) {
    els.power = h('div', { class: 'card powercard' });
    els.raid = h('div', { class: 'card raidcard' });
    els.list = h('div', { class: 'dlist' });
    root.append(h('h1', { class: 'scr-t', text: 'Donjons' }), els.power, els.raid, els.list);
    for (const ev of ['loadout', 'ability', 'cls', 'clsup', 'inv']) DT.E.on(ev, () => { if (SCR.root && !SCR.root.hidden) drawPower(); });
    SCR.redraw();
  };
  function drawPower() {
    const S = DT.S, st = C.stats();
    const cl = S.cls ? D.CLASSES[C.cls()] : null;
    const lo = h('div', { class: 'loadout' });
    for (let i = 0; i < C.abilitySlots(); i++) {
      const id = S.loadout[i], a = id && D.ABI[id];
      lo.append(h('button', { type: 'button', class: 'lo' + (a ? '' : ' empty'), style: a ? { '--c': BT.abColor(id) } : null, on: { click: () => { UI.go('hero'); DT.SCR.hero.tab('cls'); } } }, a ? a.n : 'Vide'));
    }
    U.clear(els.power).append(
      h('div', { class: 'row between' }, h('span', { class: 'lbl', text: cl ? cl.n.toUpperCase() + ' NIV. ' + C.clsLvl() : 'SANS CLASSE' }), h('span', {}, h('small', { class: 'lbl', text: 'PUISSANCE ' }), h('b', { class: 'big-n', text: U.fmtInt(C.power(st)) }))),
      h('div', { class: 'mini-stats' },
        h('span', {}, UI.icon('sword'), U.fmt(st.atk)), h('span', {}, UI.icon('heart'), U.fmt(st.hp)), h('span', {}, UI.icon('shield'), U.fmt(st.def)),
        h('span', {}, UI.icon('boot'), st.spd.toFixed(1)), h('span', {}, UI.icon('potion'), S.potions)),
      h('small', { class: 'lbl', text: 'CAPACITÉS EN COMBAT (tape pour changer)' }), lo);
    if (!cl) els.power.append(UI.btn('Choisir ma classe', () => DT.SCR.hero.pickClass(), { cls: 'gold wide' }));
  }
  function drawRaid() {
    const r = DT.G.raidState(), boss = raidBoss();
    const tier = r.th.filter((t) => r.dmg >= t).length;
    const claim = r.th.filter((t, i) => r.dmg >= t && !r.claimed.includes(i)).length;
    U.clear(els.raid).append(h('img', { class: 'raid-ico', src: P.spriteURL(P.SPR[boss.spr], boss.pal, 3), alt: '' }),
      h('div', { class: 'grow' }, h('span', { class: 'lbl', text: 'RAID DE LA SEMAINE' }), h('b', { text: boss.n }), h('small', { text: 'Palier ' + tier + '/4 · ' + U.fmt(r.dmg) + ' dégâts' + (claim ? ' · récompense à prendre !' : '') })),
      UI.btn('Ouvrir', () => RAID.open(), { cls: claim ? 'gold' : 'go' }));
  }
  function drawList() {
    const S = DT.S, myP = C.power();
    U.clear(els.list);
    D.DUNGEONS.forEach((dg, i) => {
      const unlocked = C.dungeonUnlocked(i);
      const bg = h('img', { class: 'dthumb', src: themeThumb(dg.theme), alt: '' });
      const card = h('div', { class: 'dcard' + (unlocked ? '' : ' locked') });
      if (!unlocked) {
        card.append(bg, h('div', { class: 'dbody' }, h('b', { text: dg.n }), h('small', { class: 'muted', text: 'Atteins le palier 30 de « ' + D.DUNGEONS[i - 1].n + ' » pour débloquer.' })), UI.icon('lock', 'big'));
        els.list.append(card);
        return;
      }
      if (modeSel[i] == null || !C.modeUnlocked(i, modeSel[i])) modeSel[i] = 0;
      const m = modeSel[i], best = C.floor(i, m);
      const cps = [1, 11, 21].filter((f) => f === 1 || best >= f - 1);
      let start = startSel[i + '_' + m];
      if (!cps.includes(start)) start = cps[cps.length - 1];
      startSel[i + '_' + m] = start;
      const end = Math.min(D.FLOORS, Math.floor((start - 1) / 10) * 10 + 10);
      const target = Math.min(D.FLOORS, Math.max(start, best + 1));
      const rec = C.recPower(i, m, target);
      const modes = h('div', { class: 'chips modes' }, D.MODES.map((md) => {
        const ok = C.modeUnlocked(i, md.id), done = C.floor(i, md.id) >= D.FLOORS;
        return h('button', { type: 'button', class: 'chip-b' + (m === md.id ? ' on' : ''), disabled: !ok, style: { '--bc': md.c }, on: { click: () => { modeSel[i] = md.id; drawList(); } } }, (done ? '✓ ' : ok ? '' : '🔒 ') + md.n);
      }));
      // progression : 30 paliers, coffre tous les 10
      const prog = h('div', { class: 'floors' }, h('div', { class: 'fl-bar' }, h('i', { style: { width: best / D.FLOORS * 100 + '%' } })),
        h('div', { class: 'fl-marks' }, [10, 20, 30].map((f) => {
          const tier = Math.min(5, f / 10 + m);
          return h('span', { class: 'fl-mark' + (best >= f ? ' done' : ''), style: { left: (f / D.FLOORS * 100) + '%' } }, UI.chestImg(Math.min(5, tier), '', best >= f));
        })));
      const cls = myP >= rec ? 'ok' : myP >= rec * 0.85 ? 'mid' : 'bad';
      const startChips = cps.length > 1 ? h('div', { class: 'chips' }, h('small', { class: 'lbl', text: 'DÉPART' }), cps.map((f) =>
        h('button', { type: 'button', class: 'chip-b' + (start === f ? ' on' : ''), on: { click: () => { startSel[i + '_' + m] = f; drawList(); } } }, 'Palier ' + f))) : null;
      const firstTxt = best < D.FLOORS ? (m === 0 ? 'Palier 30 : apparence « ' + D.SKIN[dg.first.skin].n + ' » + ' + D.UNIQUES[dg.first.item].n : m === 1 ? 'Palier 30 : familier « ' + D.PET[dg.pet].n + ' »' : 'Palier 30 : objet Mythique + Chevalier Dragon') : 'Conquis ! Rejoue pour le butin.';
      card.append(bg, h('div', { class: 'dbody' },
        h('b', { text: dg.n }), h('small', { class: 'muted', text: dg.desc }),
        modes,
        h('div', { class: 'row between' }, h('small', { text: 'Record : ' + best + '/' + D.FLOORS }), h('small', { class: 'rec ' + cls, text: 'Conseillé : ' + U.fmtInt(rec) })),
        prog, startChips,
        h('small', { class: 'first', text: firstTxt }),
        UI.btn(h('span', {}, 'Paliers ' + start + '–' + end + ' (', UI.icon('bolt'), ' ' + C.dungeonCost(i) + ')'), () => run(i, m, start), { cls: 'go', disabled: S.energy < C.dungeonCost(i) })));
      els.list.append(card);
    });
  }
  const thumbs = {};
  function themeThumb(theme) {
    if (thumbs[theme]) return thumbs[theme];
    const c = document.createElement('canvas'); c.width = 160; c.height = 90;
    c.getContext('2d').drawImage(P.themeBg(theme, 160, 90), 0, 0);
    return (thumbs[theme] = c.toDataURL());
  }
  SCR.redraw = function () { if (!els.list) return; drawPower(); drawRaid(); drawList(); };
  let lastEn = -1;
  SCR.update = function () { const e = Math.floor(DT.S.energy); if (e !== lastEn) { lastEn = e; drawList(); drawRaid(); } };
  SCR.show = function () { SCR.redraw(); };
  SCR.run = run;
  SCR.battle = battleSheet;
  DT.SCR.dungeon = SCR;
  DT.SCR.raid = RAID;
})(window.DT);
