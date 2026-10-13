'use strict';
// Donjons & Tractions — le Parc : hub vivant (héros, familier, autres athlètes)
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h, P = DT.P;
  const W = 160, H = 90, GROUND = 80;
  const BOT_POSES = ['pushup', 'squat', 'burpee', 'plank', 'crow', 'handstand', 'jjack', 'lunge', 'stretch', 'wave', 'hollow', 'pistol', 'lean', 'clap', 'mclimb', 'vsit'];

  let stage = null, raf = 0, t0 = 0, bots = [], parts = [], showPose = null, lastTapS = 0, tapCount = 0, chatT = 3;
  const hero = { x: 62, y: GROUND };

  function heroPose() {
    const S = DT.S;
    if (showPose && S.skills[showPose]) return D.SKILL[showPose].pose;
    // par défaut : le skill débloqué du plus haut palier
    let best = 'pushup';
    for (const id in S.skills) if (D.SKILL[id].t > D.SKILL[best].t) best = id;
    return D.SKILL[best].pose;
  }

  function makeBots() {
    const r = U.rng(U.hash('bots' + U.dayIndex()));
    const names = U.shuffle(D.BOTS, r).slice(0, 6);
    const real = (DT.NET && DT.NET.players) ? DT.NET.players.slice(0, 3) : [];
    // les autres héros du parc : une classe, parfois une apparence de prestige
    const fancy = D.SKINS.filter((s) => s.id !== 'base').map((s) => s.id);
    const list = real.map((p) => ({ name: p.nick, real: true, look: C.heroLook({ base: p.look || {}, skin: p.skin || 'base', cls: p.cls || U.pick(D.CLASS_ORDER, r), gear: false }) }))
      .concat(names.map((n) => ({ name: n, look: C.heroLook({ base: { skin: U.pick(D.SKIN_TONES.slice(0, 6), r), hair: U.pick(D.HAIR_COLORS, r), hs: U.pick(['short', 'long', 'mohawk', 'bun', 'spiky', 'ponytail'], r) }, cls: U.pick(D.CLASS_ORDER, r), skin: r() < 0.3 ? U.pick(fancy, r) : 'base', gear: false }) })));
    const SPOTS = [14, 32, 96, 118, 142];
    bots = list.slice(0, 5).map((b, i) => ({ ...b, x: SPOTS[i] + r() * 6, y: GROUND - 3 - Math.floor(r() * 5), tx: null, st: 'idle', pose: 'idle', t: r() * 3, timer: 1 + r() * 4, flip: r() < 0.5, chat: null }));
  }

  function updBots(dt) {
    for (const b of bots) {
      b.t += dt; b.timer -= dt;
      if (b.st === 'walk') {
        const dx = b.tx - b.x;
        b.flip = dx < 0;
        b.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 12);
        if (Math.abs(dx) < 0.5) { b.st = 'idle'; b.pose = 'idle'; b.timer = 1 + Math.random() * 3; }
      } else if (b.timer <= 0) {
        if (Math.random() < 0.55) { b.st = 'walk'; b.pose = 'walk'; b.tx = U.clamp(b.x + U.rand(-40, 40), 8, W - 8); if (b.tx > 44 && b.tx < 82) b.tx = b.tx < 63 ? 44 : 82; }
        else { b.st = 'exo'; b.pose = U.pick(BOT_POSES); b.t = 0; b.timer = 4 + Math.random() * 6; }
      }
      if (b.chat && b.chat.until < t0) b.chat = null;
    }
    chatT -= dt;
    if (chatT <= 0 && bots.length) {
      chatT = 5 + Math.random() * 6;
      const b = U.pick(bots.filter((x) => !x.real) || bots);
      if (b) b.chat = { text: U.pick(D.BOT_LINES), until: t0 + 4.5 };
    }
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const now = ts / 1000;
    // 30 images/s suffisent pour du pixel art (et économisent la batterie)
    if (t0 && now - t0 < 1 / 31) return;
    const dt = Math.min(0.1, now - (t0 || now));
    t0 = now;
    if (!stage) return;
    updBots(dt);
    const S = DT.S, lc = stage.lc;
    lc.drawImage(P.parkBg(W, H), 0, 0);
    // entités triées par profondeur
    const ents = bots.map((b) => ({ y: b.y, draw: () => P.drawFigure(lc, b.pose, b.look, b.x, b.y, { time: b.t, flip: b.flip, noProps: true }) }));
    const look = C.heroLook();
    const pose = heroPose();
    ents.push({ y: hero.y + 0.5, draw: () => P.drawFigure(lc, pose, look, hero.x, hero.y, { time: now }) });
    if (S.pet && D.PET[S.pet]) {
      const pet = D.PET[S.pet];
      const bob = Math.round(Math.sin(now * 3) * 1);
      ents.push({ y: hero.y + 1, draw: () => lc.drawImage(P.spriteCanvas(P.SPR[pet.spr], pet.pal, { flip: true }), hero.x - 30, hero.y - 15 + bob) });
    }
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.draw());
    // particules
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += 60 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      lc.fillStyle = p.c; lc.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    stage.present();
    stage.text(S.nick, hero.x, hero.y - 33, { color: '#ffcd75', size: 4 });
    for (const b of bots) {
      if (b.chat) stage.text(b.chat.text.length > 30 ? b.chat.text.slice(0, 29) + '…' : b.chat.text, U.clamp(b.x, 34, W - 34), b.y - 30, { size: 3.2, bg: 'rgba(26,28,44,0.85)', color: '#f4f4f4', shadow: false });
      else if (b.real) stage.text(b.name, b.x, b.y - 30, { size: 3, color: '#73eff7' });
    }
  }

  function burst(x, y, n, c) {
    for (let i = 0; i < n; i++) parts.push({ x, y, vx: U.rand(-30, 30), vy: U.rand(-55, -20), life: U.rand(0.4, 0.8), c: c || U.pick(['#ffcd75', '#ef7d57', '#f4f4f4']), s: Math.random() < 0.3 ? 2 : 1 });
  }

  function onTap(e) {
    if (!stage) return;
    const r = stage.cv.getBoundingClientRect();
    const gx = (e.clientX - r.left) / r.width * W, gy = (e.clientY - r.top) / r.height * H;
    const nowS = performance.now() / 1000;
    if (Math.floor(nowS) !== lastTapS) { lastTapS = Math.floor(nowS); tapCount = 0; }
    if (++tapCount > 8) return;
    // tape sur un bot : il te salue
    const b = bots.find((x) => Math.abs(x.x - gx) < 6 && gy > x.y - 26 && gy < x.y + 2);
    if (b) { b.st = 'exo'; b.pose = 'wave'; b.t = 0; b.timer = 2; b.chat = { text: U.pick(['Salut !', 'Force à toi !', 'On s\'entraîne ?', 'Respect', 'Allez, une série !']), until: t0 + 2.5 }; DT.A.play('tap'); return; }
    const coins = Math.max(1, C.prod() * 0.15);
    DT.G.addCoins(coins);
    DT.S.life.taps++;
    burst(hero.x, hero.y - 20, 4);
    DT.A.play('tap');
    DT.U.vibrate(8);
    DT.UI.float(e.clientX, e.clientY - 10, '+' + U.fmt(coins), '#ffcd75');
  }

  // ---------- Écran ----------
  const SCR = { tabbed: true };
  let els = {};
  SCR.render = function (root) {
    const cv = h('canvas', { class: 'stage', on: { pointerdown: onTap }, 'aria-label': 'Le parc : tape ton athlète pour l\'encourager' });
    els.stageWrap = h('div', { class: 'stage-wrap' }, cv);
    els.prod = h('b', { text: '0/s' });
    els.pumpLine = h('p', { class: 'pump-line' });
    els.daily = h('div', { class: 'daily' });
    els.quests = h('span', { class: 'badge-in' });
    els.ach = h('span', { class: 'badge-in' });
    els.prest = h('button', { class: 'tile', type: 'button', on: { click: () => DT.SCR.social.prestige() } }, DT.UI.icon('aura', 'big'), h('b', { text: 'Renaissance' }), h('small', { id: 'prestTxt' }));
    root.append(
      els.stageWrap,
      h('p', { class: 'hint', text: 'Tape ton héros pour l\'encourager. Tape les autres pour les saluer.' }),
      h('div', { class: 'card prodcard' },
        h('div', { class: 'row between' }, h('span', { class: 'lbl', text: 'PRODUCTION' }), els.prod),
        els.pumpLine,
        h('div', { class: 'row gap' },
          DT.UI.btn('Changer de skill', () => pickShow(), { cls: 'ghost sm' }),
          DT.UI.btn('Faire un exo', () => DT.UI.go('sport'), { cls: 'go sm' }))),
      els.daily,
      h('div', { class: 'tiles' },
        h('button', { class: 'tile', type: 'button', on: { click: () => DT.SCR.social.quests() } }, DT.UI.icon('scroll', 'big'), h('b', { text: 'Quêtes du jour' }), els.quests),
        h('button', { class: 'tile', type: 'button', on: { click: () => DT.SCR.social.achievements() } }, DT.UI.icon('trophy', 'big'), h('b', { text: 'Succès' }), els.ach),
        h('button', { class: 'tile', type: 'button', on: { click: () => DT.SCR.social.leaderboard() } }, DT.UI.icon('crown', 'big'), h('b', { text: 'Classement' }), h('small', { text: 'Athlètes du monde' })),
        h('button', { class: 'tile', type: 'button', on: { click: () => DT.SCR.raid.open() } }, DT.UI.icon('skull', 'big'), h('b', { text: 'Raid de la semaine' }), h('small', { id: 'raidTxt' })),
        els.prest,
        h('button', { class: 'tile', type: 'button', on: { click: () => DT.SCR.social.howto() } }, DT.UI.icon('star', 'big'), h('b', { text: 'Comment jouer' }), h('small', { text: 'Le guide' }))),
    );
    stage = new P.Stage(cv, W, H);
    makeBots();
  };
  function pickShow() {
    const S = DT.S;
    DT.UI.sheet({ title: 'Skill montré au parc', body: (el, close) => {
      const grid = h('div', { class: 'thumbs' });
      const look = C.heroLook();
      Object.keys(S.skills).sort((a, b) => D.SKILL[b].t - D.SKILL[a].t).forEach((id) => {
        const sk = D.SKILL[id];
        grid.append(h('button', { type: 'button', class: 'thumbbtn' + (showPose === id ? ' on' : ''), on: { click: () => { showPose = id; U.store.set('dt_show', id); close(); } } },
          h('img', { class: 'thumb', src: P.poseThumb(sk.pose, look, 48), alt: '' }), h('small', { text: sk.n })));
      });
      el.append(grid);
    } });
  }
  SCR.update = function () {
    const S = DT.S;
    els.prod.textContent = U.fmt(C.prod()) + ' pièces/s';
    const pumpLeft = (S.pump - Date.now()) / 1000;
    els.pumpLine.textContent = pumpLeft > 0 ? 'PUMP actif : production x2 pendant encore ' + U.timeFmt(pumpLeft) + '.' : 'Enregistre un exercice réel pour activer le PUMP (production x2).';
    els.pumpLine.classList.toggle('on', pumpLeft > 0);
    // coffre quotidien
    if (!S.daily.chest) {
      if (!els.daily.firstChild) els.daily.append(DT.UI.btn(h('span', {}, DT.UI.icon('chest'), ' Récupérer le cadeau du jour'), () => {
        const r = DT.G.claimDailyChest();
        if (r) DT.UI.rewards('Cadeau du jour', { coins: r.coins, gems: r.gems, energy: r.energy, text: 'Reviens demain pour le suivant !' });
        U.clear(els.daily);
      }, { cls: 'gold wide pulse' }));
    } else if (els.daily.firstChild) U.clear(els.daily);
    const qDone = S.daily.q.filter((id) => { const q = D.QUESTS.find((x) => x.id === id); return q && DT.G.questProgress(q) >= q.n; }).length;
    const qClaim = S.daily.q.filter((id) => { const q = D.QUESTS.find((x) => x.id === id); return q && DT.G.questProgress(q) >= q.n && !S.daily.got.includes(id); }).length;
    els.quests.textContent = qDone + '/3' + (qClaim ? ' · à récupérer !' : '');
    els.quests.classList.toggle('hot', qClaim > 0);
    els.ach.textContent = Object.keys(S.ach).length + '/' + D.ACHS.length;
    const g = C.auraGain();
    els.prest.hidden = !(g >= 1 || S.prestige.count > 0);
    const pt = U.$('#prestTxt'); if (pt) pt.textContent = g >= 1 ? '+' + g + ' Aura disponible' : 'Aura : ' + S.prestige.aura;
    const rt = U.$('#raidTxt'); if (rt) { const r = DT.G.raidState(); rt.textContent = 'Palier ' + r.th.filter((x) => r.dmg >= x).length + '/4'; }
    DT.UI.badge('park', qClaim + (S.daily.chest ? 0 : 1));
  };
  SCR.show = function () {
    showPose = U.store.get('dt_show');
    if (stage) stage.resize();
    if (!raf) raf = requestAnimationFrame(frame);
    SCR.update();
  };
  SCR.hide = function () { cancelAnimationFrame(raf); raf = 0; t0 = 0; };
  SCR.resize = () => stage && stage.resize();
  SCR.refreshBots = makeBots;
  DT.SCR.park = SCR;
})(window.DT);
