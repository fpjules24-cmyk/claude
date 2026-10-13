'use strict';
// Donjons & Tractions — donjons, combats, raid hebdomadaire
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h, P = DT.P, UI = DT.UI, BT = DT.BT;

  // ---------- Combat en plein écran ----------
  function battleSheet(o) {
    const S = DT.S;
    const cfg = BT.heroCfg(o.cfg);
    if (S.pet && D.PET[S.pet]) cfg.petSpr = D.PET[S.pet];
    const fight = new BT.Fight(cfg);
    let view = null, raf = 0, last = 0, closed = false, waitT = 0, phase = 'fight';
    const canvas = h('canvas', { class: 'stage' });
    const hpH = h('div', { class: 'hp hero' }, h('i'), h('em'), h('span'));
    const hpF = h('div', { class: 'hp foe' }, h('i'), h('em'), h('span'));
    const title = h('div', { class: 'bt-title' });
    const abRow = h('div', { class: 'abrow' });
    const ctrl = h('div', { class: 'row gap bt-ctrl' });
    const overlay = h('div', { class: 'bt-over', hidden: true });
    const logEl = h('ul', { class: 'blog', 'aria-live': 'polite' });
    const log = (text, c) => {
      logEl.prepend(h('li', { style: c ? { color: c } : null, text }));
      while (logEl.children.length > 7) logEl.lastChild.remove();
    };
    const onEv = (e) => {
      const f = fight.foe, fn = f ? f.n : '';
      if (e.t === 'ability') log('Tu lances ' + e.name + ' !', e.c);
      else if (e.t === 'charge') log(fn + ' charge une attaque lourde ! Étourdis-le ou esquive.', '#e0667a');
      else if (e.t === 'text' && e.text === 'ENRAGÉ !') log(fn + ' est enragé : il frappe plus fort.', '#ef7d57');
      else if (e.t === 'text' && e.text === 'INTERROMPU') log('Attaque de ' + fn + ' interrompue !', '#73eff7');
      else if (e.t === 'heal' && e.who === 'foe') log(fn + ' récupère ' + U.fmt(e.amt) + ' PV.', '#a7f070');
      else if (e.t === 'shield' && e.who === 'foe') log(fn + ' se protège derrière un bouclier.', '#73eff7');
      else if (e.t === 'dmg' && e.crit && e.who === 'foe' && e.amt > 0) log('Coup critique : ' + U.fmt(e.amt) + ' dégâts !', '#ffcd75');
      else if (e.t === 'die') log(e.who === 'foe' ? fn + ' est vaincu !' : 'Tu es K.O.', e.who === 'foe' ? '#a7f070' : '#e0667a');
    };
    const abBtns = fight.abs.map((a, i) => {
      const cd = h('i', { class: 'cd' });
      const b = h('button', { type: 'button', class: 'ab', style: { '--c': BT.abColor(a.id) }, on: { pointerdown: (e) => { e.preventDefault(); if (fight.use(i)) U.vibrate(12); } } },
        h('b', { text: a.def.n }), cd);
      return { b, cd, a };
    });
    abRow.append(...abBtns.map((x) => x.b));
    if (!abBtns.length) abRow.append(h('p', { class: 'muted', text: 'Débloque des skills pour obtenir des techniques de combat.' }));
    const autoB = UI.btn('', () => { S.settings.auto = !S.settings.auto; fight.auto = S.settings.auto; drawCtrl(); }, { cls: 'ghost sm' });
    const spdB = UI.btn('', () => { S.settings.speed = S.settings.speed >= 3 ? 1 : S.settings.speed + 1; drawCtrl(); }, { cls: 'ghost sm' });
    const fleeB = UI.btn(o.raid ? 'Abandonner' : 'Fuir', async () => {
      const ok = await UI.confirm({ title: o.raid ? 'Arrêter l\'attaque ?' : 'Fuir le donjon ?', text: o.raid ? 'Les dégâts déjà infligés comptent.' : 'Tu gardes le butin des salles déjà terminées.', ok: o.raid ? 'Arrêter' : 'Fuir', danger: true });
      if (ok) finish('flee');
    }, { cls: 'ghost sm danger-t' });
    function drawCtrl() {
      autoB.textContent = 'Auto : ' + (S.settings.auto ? 'oui' : 'non');
      autoB.classList.toggle('on', S.settings.auto);
      spdB.textContent = 'Vitesse x' + S.settings.speed;
    }
    ctrl.append(autoB, spdB, fleeB);
    drawCtrl();

    let close;
    function finish(reason) {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      close && close();
      o.onEnd && o.onEnd({ reason, fight });
    }
    function setBars() {
      const H = fight.hero, f = fight.foe;
      hpH.firstChild.style.width = (H.hp / H.max * 100) + '%';
      hpH.children[1].style.width = (H.shield > 0 ? Math.min(100, H.shield / H.max * 100) : 0) + '%';
      hpH.lastChild.textContent = S.nick + '  ' + U.fmt(Math.ceil(H.hp)) + '/' + U.fmt(Math.ceil(H.max));
      if (f) {
        if (f.inv) { hpF.firstChild.style.width = '100%'; hpF.lastChild.textContent = f.n + '  dégâts : ' + U.fmt(fight.dmgDealt); }
        else { hpF.firstChild.style.width = (f.hp / f.max * 100) + '%'; hpF.lastChild.textContent = f.n + '  ' + U.fmt(Math.ceil(f.hp)) + '/' + U.fmt(Math.ceil(f.max)); }
        hpF.children[1].style.width = (f.shield > 0 ? Math.min(100, f.shield / f.max * 100) : 0) + '%';
        hpF.classList.toggle('enr', !!f.enraged);
      }
      for (const x of abBtns) {
        x.cd.style.height = (x.a.cd / x.a.max * 100) + '%';
        x.b.classList.toggle('ready', fight.ready(abBtns.indexOf(x)));
      }
      if (o.raid) title.textContent = o.title + ' · ' + Math.max(0, Math.ceil(fight.timeLimit - fight.time)) + ' s';
    }
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (!view) { if (!canvas.parentElement || !canvas.parentElement.clientWidth) return; view = new BT.View(fight, canvas, o.theme); view.onEv = onEv; }
      const now = ts / 1000;
      const rdt = Math.min(0.05, now - (last || now));
      last = now;
      const dt = rdt * S.settings.speed;
      if (phase === 'fight') {
        let rem = dt;
        while (rem > 0) { const s = Math.min(0.02, rem); fight.update(s); rem -= s; }
        if (fight.over) { phase = 'wait'; waitT = 1.1; }
      } else if (phase === 'wait') {
        waitT -= rdt;
        if (waitT <= 0) { phase = 'idle'; o.onResult(fight, api); }
      }
      view.draw(dt);
      setBars();
    }
    const api = {
      next(foe, label) { fight.setFoe(foe); phase = 'fight'; if (view) { view.fAnim.fade = 1; view.banner = { text: label, c: '#f4f4f4', until: view.t + 1.2 }; } title.textContent = o.title + ' · ' + label; log(label + ' : ' + foe.n + ' apparaît.', '#94b0c2'); },
      heal(frac) { fight.hero.hp = Math.min(fight.hero.max, fight.hero.hp + fight.hero.max * frac); fight.hero.stun = 0; },
      revive(frac) { fight.hero.hp = fight.hero.max * frac; fight.over = false; fight.result = null; phase = 'fight'; fight.foe.gauge = 0; fight.hero.dodge = 1; },
      overlay(nodes) { U.clear(overlay).append(...nodes); overlay.hidden = !nodes.length; },
      log,
      finish,
      fight,
    };
    close = UI.sheet({ title: '', cls: 'battle', modal: true, body: (el) => {
      el.append(title, h('div', { class: 'bars' }, hpH, hpF), h('div', { class: 'stage-wrap bt' }, canvas, overlay), logEl, h('div', { class: 'bt-bottom' }, abRow, ctrl));
      title.textContent = o.title;
    } });
    raf = requestAnimationFrame(loop);
    return api;
  }

  // ---------- Expédition dans un donjon ----------
  function run(d, mode) {
    const S = DT.S, dg = D.DUNGEONS[d], cost = C.dungeonCost(d);
    if (!DT.G.spendEnergy(cost)) { DT.A.play('error'); UI.energyInfo(); return; }
    const foes = U.shuffle(dg.foes).slice(0, 4);
    const rooms = foes.map((f, i) => BT.makeFoe(d, i, mode, f, false)).concat([BT.makeFoe(d, 4, mode, dg.boss, true)]);
    let room = 0, revived = false;
    const loot = { coins: 0, gems: 0, items: [], pets: [] };
    const label = (i) => i === 4 ? 'BOSS : ' + dg.boss.n : 'Salle ' + (i + 1) + '/5';
    const api = battleSheet({
      theme: dg.theme, title: dg.n + (mode ? ' (' + D.MODES[mode].n + ')' : ''),
      onResult(fight, api) {
        if (fight.result.win) {
          const r = DT.G.roomReward(d, mode, room, room === 4);
          loot.coins += r.coins; loot.gems += r.gems; loot.items.push(...r.items); if (r.pet) loot.pets.push(r.pet);
          api.log('Butin : +' + U.fmt(r.coins) + ' pièces' + (r.items.length ? ' · ' + r.items.map((x) => x.n).join(', ') : '') + (r.gems ? ' · +' + r.gems + ' éclats' : ''), '#ffcd75');
          room++;
          if (room >= rooms.length) { api.finish('clear'); return; }
          api.heal(0.25);
          api.next(rooms[room], label(room));
        } else {
          if (!revived) {
            api.overlay([h('b', { text: 'K.O. !' }), h('p', { text: 'Tu as atteint la ' + label(room).toLowerCase() + '.' }),
              h('div', { class: 'row gap center' },
                UI.btn(h('span', {}, 'Revenir (', UI.icon('gem'), ' 20)'), () => {
                  if (!DT.G.spendGems(20)) { UI.toast('Pas assez d\'éclats.', 'bad'); return; }
                  revived = true; api.overlay([]); api.revive(0.6); DT.A.play('heal');
                }, { cls: 'gemb', disabled: S.gems < 20 }),
                UI.btn('Abandonner', () => { api.overlay([]); api.finish('dead'); }, { cls: 'ghost' }))]);
          } else api.finish('dead');
        }
      },
      onEnd({ reason }) {
        let clear = null;
        if (reason === 'clear') clear = DT.G.dungeonClear(d, mode);
        const title = reason === 'clear' ? 'Donjon terminé !' : reason === 'flee' ? 'Retraite' : 'Défaite';
        const text = reason === 'clear' ? (clear.first ? 'Première victoire en ' + D.MODES[mode].n + ' !' : 'Encore une victoire.') : 'Salles terminées : ' + room + '/5. ' + (room ? 'Le butin est à toi.' : 'Améliore ton stuff, monte des skills ou entraîne-toi pour gagner en puissance.');
        const items = loot.items.concat(clear && clear.item ? [clear.item] : []);
        UI.rewards(title, { text, coins: loot.coins, gems: loot.gems + (clear ? clear.gems : 0), items, skin: clear && clear.skin, pet: (clear && clear.pet) || loot.pets[0], sound: reason === 'clear' ? 'win' : 'lose', okLabel: 'Retour' });
        SCR.redraw();
      },
    });
    api.next(rooms[0], label(0));
  }

  // ---------- Raid hebdomadaire ----------
  const RAID = {};
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
          h('div', {}, h('h3', { text: boss.n }), h('p', { class: 'muted', text: 'Toute la communauté le frappe cette semaine. Chaque attaque dure 25 secondes : inflige un maximum de dégâts.' }),
            h('small', { text: 'Fin dans ' + U.timeFmt(U.nextWeekStart()) }))),
          h('div', { class: 'card' }, h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'COMMUNAUTÉ' }), h('b', { text: Math.round(com * 100) + '%' })), UI.bar(com, 'raidbar'),
            h('small', { class: 'muted', text: com >= 1 ? 'Le boss est tombé ! Les paliers restent à décrocher jusqu\'à lundi.' : 'Les athlètes du monde entier ont entamé sa barre de vie.' })),
          h('div', { class: 'card' }, h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'TES DÉGÂTS' }), h('b', { class: 'gold-t', text: U.fmt(r.dmg) })),
            h('small', { class: 'muted', text: r.hits + ' attaque' + (r.hits > 1 ? 's' : '') + ' cette semaine' }),
            h('ul', { class: 'tiers' }, r.th.map((t, i) => {
              const rw = DT.G.RAID_REW[i];
              const got = r.claimed.includes(i), ok = r.dmg >= t;
              return h('li', { class: ok ? 'ok' : '' }, h('span', { text: 'Palier ' + (i + 1) + ' · ' + U.fmt(t) }),
                h('small', { text: rw.gems + ' éclats' + (rw.chest ? ' + coffre' : '') + (rw.skin ? ' + Spartiate' : '') }),
                got ? h('i', { class: 'tag', text: 'REÇU' }) : UI.btn('Prendre', () => {
                  const out = DT.G.raidClaim(i);
                  if (out) { UI.rewards('Palier ' + (i + 1), { gems: out.gems, coins: out.coins, items: out.items, skin: out.skin }); draw(); }
                }, { cls: 'gold sm', disabled: !ok }));
            }))),
          UI.btn(h('span', {}, 'Attaquer (', UI.icon('bolt'), ' 3)'), () => { close(); attack(); }, { cls: 'go wide big', disabled: S.energy < 3 }));
        if (tier >= 4) el.append(h('p', { class: 'center gold-t', text: 'Tous les paliers atteints. Respect !' }));
        // classement du raid
        const rows = raidBoard(r.dmg);
        el.append(h('div', { class: 'card' }, h('b', { text: 'Meilleurs dégâts' }), h('ol', { class: 'board' }, rows.map((x, i) => h('li', { class: x.me ? 'me' : x.real ? 'real' : '' }, h('i', { class: 'rk', text: '#' + (i + 1) }), h('span', { text: x.nick }), h('b', { text: U.fmt(x.dmg) }))))));
      };
      draw();
    } });
  };
  function raidBoard(myDmg) {
    const wk = U.weekIndex(), r = U.rng(U.hash('raid' + wk));
    const frac = DT.G.raidCommunity();
    const scale = Math.max(800, C.stats().atk * 700);
    const bots = D.BOTS.slice(0, 12).map((n) => ({ nick: n, dmg: Math.round(scale * Math.pow(r(), 1.6) * 2.4 * frac) }));
    const real = (DT.NET && DT.NET.raid) ? DT.NET.raid.filter((x) => !x.me).map((x) => ({ nick: x.nick, dmg: x.dmg, real: true })) : [];
    return bots.concat(real, [{ nick: DT.S.nick + ' (toi)', dmg: Math.round(myDmg), me: true }]).sort((a, b) => b.dmg - a.dmg).slice(0, 15);
  }
  function attack() {
    if (!DT.G.spendEnergy(3)) { UI.energyInfo(); return; }
    const boss = raidBoss(), lv = raidLevel();
    const st = C.foeStats(lv, 3, 0, true);
    const foe = { n: boss.n, spr: boss.spr, pal: boss.pal, s: 2, hp: 1e18, atk: st.atk * 0.9, def: st.def, spd: st.spd, crit: 0.05, inv: true, boss: true, sp: 'heavy' };
    const api = battleSheet({
      theme: 'crypt', title: 'Raid', raid: true, cfg: { timeLimit: 25, raid: true },
      onResult(fight, api) { api.finish(fight.result && fight.result.timeout ? 'time' : 'dead'); },
      onEnd({ fight }) {
        const dmg = Math.round(fight.dmgDealt);
        const before = DT.G.raidState().th.filter((t) => DT.G.raidState().dmg >= t).length;
        const tier = DT.G.raidAddDamage(dmg);
        DT.NET && DT.NET.pushRaid && DT.NET.pushRaid();
        UI.rewards('Attaque terminée', { text: U.fmt(dmg) + ' dégâts infligés.' + (tier > before ? ' Nouveau palier atteint : ' + tier + '/4 !' : ''), sound: 'win', okLabel: 'Voir le raid', onOk: () => RAID.open() });
      },
    });
    api.next(foe, boss.n);
  }
  RAID.attack = attack;

  // ---------- Écran ----------
  const SCR = { tabbed: true };
  let els = {}, modeSel = {};
  SCR.render = function (root) {
    els.power = h('div', { class: 'card powercard' });
    els.raid = h('div', { class: 'card raidcard' });
    els.list = h('div', { class: 'dlist' });
    root.append(h('h1', { class: 'scr-t', text: 'Donjons' }), els.power, els.raid, els.list);
    DT.E.on('loadout', () => drawPower());
    SCR.redraw();
  };
  function drawPower() {
    const S = DT.S, st = C.stats();
    const lo = h('div', { class: 'loadout' });
    for (let i = 0; i < C.abilitySlots(); i++) {
      const id = S.loadout[i];
      lo.append(h('button', { type: 'button', class: 'lo' + (id ? '' : ' empty'), style: id ? { '--c': BT.abColor(id) } : null, on: { click: editLoadout } }, id ? D.SKILL[id].ab.n : 'Vide'));
    }
    U.clear(els.power).append(
      h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'TA PUISSANCE' }), h('b', { class: 'big-n', text: U.fmtInt(C.power(st)) })),
      h('div', { class: 'mini-stats' },
        h('span', {}, UI.icon('sword'), U.fmt(st.atk)), h('span', {}, UI.icon('heart'), U.fmt(st.hp)), h('span', {}, UI.icon('shield'), U.fmt(st.def)),
        h('span', {}, UI.icon('boot'), st.spd.toFixed(1)), h('span', {}, UI.icon('star'), Math.round(st.crit * 100) + '%')),
      h('small', { class: 'lbl', text: 'TECHNIQUES (tape pour changer)' }), lo);
  }
  function editLoadout() {
    const S = DT.S;
    UI.sheet({ title: 'Techniques de combat', body: (el) => {
      const draw = () => {
        U.clear(el).append(h('p', { class: 'muted', text: 'Choisis jusqu\'à ' + C.abilitySlots() + ' techniques. Chaque skill débloqué en apporte une.' }));
        const list = h('div', { class: 'ablist' });
        Object.keys(S.skills).sort((a, b) => D.SKILL[b].t - D.SKILL[a].t).forEach((id) => {
          const sk = D.SKILL[id], on = S.loadout.includes(id);
          list.append(h('button', { type: 'button', class: 'abitem' + (on ? ' on' : ''), style: { '--c': BT.abColor(id) }, on: { click: () => {
            if (on) S.loadout = S.loadout.filter((x) => x !== id);
            else if (S.loadout.length < C.abilitySlots()) S.loadout.push(id);
            else { UI.toast('Emplacements pleins : retire une technique d\'abord.', 'bad'); return; }
            DT.E.emit('loadout'); draw();
          } } }, h('b', { text: sk.ab.n }), h('small', { text: DT.abDesc(sk.ab) + ' (' + sk.ab.cd + ' s) · ' + sk.n })));
        });
        el.append(list);
      };
      draw();
    } });
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
      const prog = S.dungeon.prog[dg.id] || {};
      if (modeSel[i] == null) modeSel[i] = 0;
      const m = modeSel[i];
      const rec = C.recPower(i, m);
      const bg = h('img', { class: 'dthumb', src: themeThumb(dg.theme), alt: '' });
      const card = h('div', { class: 'dcard' + (unlocked ? '' : ' locked') });
      if (!unlocked) {
        card.append(bg, h('div', { class: 'dbody' }, h('b', { text: dg.n }), h('small', { class: 'muted', text: 'Termine « ' + D.DUNGEONS[i - 1].n + ' » pour débloquer.' })), UI.icon('lock', 'big'));
        els.list.append(card);
        return;
      }
      const modes = h('div', { class: 'chips modes' }, D.MODES.map((md) => {
        const ok = C.modeUnlocked(i, md.id);
        return h('button', { type: 'button', class: 'chip-b' + (m === md.id ? ' on' : '') + (prog['c' + md.id] ? ' done' : ''), disabled: !ok, style: { '--bc': md.c }, on: { click: () => { modeSel[i] = md.id; drawList(); } } }, (prog['c' + md.id] ? '✓ ' : '') + md.n);
      }));
      const first = !prog['c' + m];
      const reward = m === 0 ? 'Apparence « ' + D.SKIN[dg.first.skin].n + ' » + ' + D.UNIQUES[dg.first.item].n : m === 1 ? 'Familier « ' + D.PET[dg.pet].n + ' »' : 'Objet Mythique garanti';
      const cls = myP >= rec ? 'ok' : myP >= rec * 0.85 ? 'mid' : 'bad';
      card.append(bg, h('div', { class: 'dbody' },
        h('b', { text: dg.n }), h('small', { class: 'muted', text: dg.desc }),
        modes,
        h('div', { class: 'row between' }, h('small', { class: 'rec ' + cls, text: 'Conseillé : ' + U.fmtInt(rec) }), h('small', { text: 'Boss : ' + dg.boss.n })),
        first ? h('small', { class: 'first', text: '1re victoire : ' + reward }) : null,
        UI.btn(h('span', {}, 'Entrer (', UI.icon('bolt'), ' ' + C.dungeonCost(i) + ')'), () => run(i, m), { cls: 'go', disabled: S.energy < C.dungeonCost(i) })));
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
  DT.SCR.dungeon = SCR;
  DT.SCR.raid = RAID;
})(window.DT);
