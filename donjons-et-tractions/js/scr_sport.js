'use strict';
// Donjons & Tractions — Sport : exercices réels, séance guidée, historique
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h, P = DT.P, UI = DT.UI;
  const CATS = [['all', 'Tous'], ['push', 'Poussée'], ['pull', 'Tirage'], ['legs', 'Jambes'], ['core', 'Gainage'], ['skill', 'Équilibre'], ['cardio', 'Cardio'], ['mobility', 'Mobilité']];
  const CAT_N = { push: 'Poussée', pull: 'Tirage', legs: 'Jambes', core: 'Gainage', skill: 'Équilibre', cardio: 'Cardio', mobility: 'Mobilité' };

  // ---------- Animation de pose réutilisable ----------
  function PoseAnim(poseId, o = {}) {
    const w = o.w || 64, hh = o.h || 52;
    const cv = h('canvas', { class: 'anim ' + (o.cls || '') });
    const wrap = h('div', { class: 'anim-wrap ' + (o.wcls || '') }, cv);
    let st = null, raf = 0, start = performance.now(), pose = poseId;
    const look = () => P.lookFor(DT.S.look, DT.S.skin);
    function draw(ts) {
      raf = requestAnimationFrame(draw);
      if (!st) { if (!wrap.isConnected || !wrap.clientWidth) return; st = new P.Stage(cv, w, hh); }
      if (!wrap.isConnected) { cancelAnimationFrame(raf); return; }
      const lc = st.lc;
      lc.fillStyle = o.bg || '#29366f'; lc.fillRect(0, 0, w, hh);
      lc.fillStyle = '#333c57'; lc.fillRect(0, hh - 6, w, 6);
      lc.fillStyle = '#566c86'; lc.fillRect(0, hh - 6, w, 1);
      const b = P.figureBounds(pose);
      const ox = Math.round(w / 2 - (b.x0 + b.x1) / 2);
      P.drawFigure(lc, pose, look(), ox, hh - 7, { time: (ts - start) / 1000 * (o.speed || 1) });
      st.present();
    }
    raf = requestAnimationFrame(draw);
    return { el: wrap, set(p) { pose = p; start = performance.now(); }, stop() { cancelAnimationFrame(raf); } };
  }
  DT.PoseAnim = PoseAnim;

  function wakeLock() {
    let lock = null;
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {}); } catch (e) { /* refusé */ }
    return () => { try { lock && lock.release(); } catch (e) { /* ignore */ } };
  }

  // ---------- Enregistreur d'exercice ----------
  function gainsPreview(ex, n, mult = 1) {
    const pe = n * ex.rv * mult;
    return { pe, coins: C.repCoins(pe), xp: pe * (1 + C.bonus('xp')) * C.streakMult(), en: Math.floor(DT.S.energyFrac + pe / 10) };
  }
  function celebrate(res, anchor) {
    if (!res) return;
    DT.A.play('coin');
    U.vibrate([20, 40, 20]);
    if (anchor) UI.floatFrom(anchor, '+' + U.fmt(res.coins), '#ffcd75');
    UI.toast(h('span', {}, '+' + U.fmt(res.coins) + ' pièces · +' + U.fmt(res.xp) + ' XP' + (res.energy ? ' · +' + res.energy + ' énergie' : '')), 'good');
    if (res.streakUp) UI.toast('Série d\'entraînement : ' + res.streak + ' jour' + (res.streak > 1 ? 's' : '') + ' ! Bonus +' + Math.min(res.streak, 10) * 5 + '%', 'gold', true);
  }
  function logger(exId) {
    const ex = D.EXO[exId];
    const S = DT.S;
    let n = 0, running = false, tStart = 0, base = 0, timer = 0, rest = 0, restT = 0;
    const anim = PoseAnim(ex.pose, { w: 72, h: 56, wcls: 'big' });
    UI.sheet({ title: ex.n, cls: 'logger', onClose: () => { anim.stop(); clearInterval(timer); clearInterval(restT); }, body: (el) => {
      const val = h('div', { class: 'count', 'aria-live': 'polite' });
      const prev = h('div', { class: 'preview' });
      const restBox = h('div', { class: 'rest', hidden: true });
      const unitTxt = ex.unit === 'reps' ? 'reps' : 's';
      const refresh = () => {
        val.textContent = ex.unit === 'sec' ? U.clockFmt(n) : String(n);
        const g = gainsPreview(ex, n);
        U.clear(prev).append(n > 0 ? h('span', {}, '≈ ', UI.coins(g.coins), ' · +' + U.fmt(g.xp) + ' XP · ' + (Math.round(g.pe * 10) / 10) + ' pts d\'effort')
          : h('span', { class: 'muted', text: ex.unit === 'reps' ? 'Tape à chaque rep, ou saisis le total.' : 'Lance le chrono ou saisis la durée.' }));
        valid.disabled = n <= 0;
        input.value = n ? String(Math.round(n)) : '';
      };
      const input = h('input', { id: 'logInput', type: 'number', inputmode: 'numeric', min: '0', max: String(ex.max), placeholder: ex.unit === 'reps' ? 'Reps' : 'Secondes', 'aria-label': 'Quantité',
        on: { input: () => { const v = parseInt(input.value, 10); n = isNaN(v) ? 0 : U.clamp(v, 0, ex.max); if (running) { base = n; tStart = performance.now(); } val.textContent = ex.unit === 'sec' ? U.clockFmt(n) : String(n); const g = gainsPreview(ex, n); U.clear(prev).append(h('span', {}, '≈ ', UI.coins(g.coins), ' · +' + U.fmt(g.xp) + ' XP')); valid.disabled = n <= 0; } } });
      const add = (k) => { n = U.clamp(n + k, 0, ex.max); refresh(); };
      let controls;
      if (ex.unit === 'reps') {
        const pad = h('button', { class: 'tap-pad', type: 'button', on: { pointerdown: (e) => { e.preventDefault(); add(1); DT.A.play('tap'); U.vibrate(10); pad.classList.remove('hit'); void pad.offsetWidth; pad.classList.add('hit'); } } },
          val, h('small', { text: ex.id === 'pushup' || ex.id === 'diamond' ? 'TAPE À CHAQUE REP (le nez marche aussi !)' : 'TAPE À CHAQUE REP' }));
        controls = h('div', {}, pad, h('div', { class: 'row gap center' },
          UI.btn('-1', () => add(-1), { cls: 'ghost sm' }), UI.btn('+5', () => add(5), { cls: 'ghost sm' }), UI.btn('+10', () => add(10), { cls: 'ghost sm' }), input));
      } else {
        const go = UI.btn('Démarrer', () => {
          if (!running) { running = true; tStart = performance.now(); base = n; go.textContent = 'Pause'; DT.A.play('go');
            timer = setInterval(() => { n = Math.min(ex.max, Math.floor(base + (performance.now() - tStart) / 1000)); refresh(); if (n % 10 === 0 && n > 0) DT.A.play('beep'); }, 250);
          } else { running = false; clearInterval(timer); go.textContent = 'Reprendre'; }
        }, { cls: 'go' });
        controls = h('div', {}, h('div', { class: 'tap-pad timer' }, val, h('small', { text: 'CHRONO' })),
          h('div', { class: 'row gap center' }, go, UI.btn('+10 s', () => add(10), { cls: 'ghost sm' }), UI.btn('+30 s', () => add(30), { cls: 'ghost sm' }), UI.btn('0', () => { n = 0; base = 0; tStart = performance.now(); refresh(); }, { cls: 'ghost sm' }), input));
      }
      const valid = UI.btn('Valider la série', () => {
        if (n <= 0) return;
        if (running) { running = false; clearInterval(timer); }
        const res = DT.G.logExercise(ex.id, n);
        celebrate(res, valid);
        n = 0; base = 0;
        if (controls.querySelector('.go')) controls.querySelector('.go').textContent = 'Démarrer';
        refresh();
        startRest();
        DT.E.emit('sportChange');
      }, { cls: 'gold wide big', silent: true });
      const startRest = () => {
        rest = S.settings.rest || 75;
        restBox.hidden = false;
        clearInterval(restT);
        const tick = () => {
          U.clear(restBox).append(h('b', { text: 'Repos ' + U.clockFmt(rest) }), UI.btn('+15 s', () => { rest += 15; tick(); }, { cls: 'ghost sm' }), UI.btn('Passer', () => { clearInterval(restT); restBox.hidden = true; }, { cls: 'ghost sm' }));
          if (rest <= 3 && rest > 0) DT.A.play('beep');
          if (rest <= 0) { clearInterval(restT); DT.A.play('go'); U.vibrate([60, 60, 60]); U.clear(restBox).append(h('b', { text: 'C\'est reparti : série suivante !' })); setTimeout(() => { restBox.hidden = true; }, 3000); }
          rest--;
        };
        tick();
        restT = setInterval(tick, 1000);
      };
      el.append(
        h('div', { class: 'logger-top' }, anim.el, h('div', { class: 'col' },
          h('span', { class: 'pill', style: { color: (D.BRANCHES[ex.cat] || { c: '#94b0c2' }).c }, text: CAT_N[ex.cat] }),
          h('small', { text: '1 ' + (ex.unit === 'reps' ? 'rep' : 'seconde') + ' = ' + ex.rv + ' pt' + (ex.rv > 1 ? 's' : '') + ' d\'effort' }),
          h('small', { text: 'Total : ' + U.fmtInt(S.exo[ex.id] || 0) + ' ' + unitTxt + (S.best[ex.id] ? ' · record ' + S.best[ex.id] + ' ' + unitTxt : '') }))),
        h('p', { class: 'tip', text: ex.tip }),
        controls, prev, valid, restBox,
        h('p', { class: 'honor', text: 'Le jeu te fait confiance : n\'enregistre que ce que tu as vraiment fait.' }));
      refresh();
    } });
  }
  DT.logger = logger;

  // ---------- Générateur de séance ----------
  const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'];
  function rnd(a, b, unit) { const v = U.randInt(a, b); return unit === 'sec' ? Math.round(v / 5) * 5 : v; }
  function targetSkill(cats) {
    const S = DT.S;
    const brs = new Set(cats);
    const cand = D.SKILLS.filter((s) => !S.skills[s.id] && s.pre.every((p) => S.skills[p]) && (brs.has(s.br) || brs.size === 0)).sort((a, b) => a.t - b.t);
    return cand[0] || D.SKILLS.filter((s) => S.skills[s.id] && !S.skills[s.id].cert).sort((a, b) => b.t - a.t)[0] || null;
  }
  function generate(cfg) {
    const lv = cfg.level, focus = D.FOCUS.find((f) => f.id === cfg.focus) || D.FOCUS[0];
    const blocks = [];
    const item = (arr, sets, rest, extra) => ({ n: arr[0], exo: arr[1], mult: arr[2], unit: arr[3], amt: rnd(arr[4], arr[5], arr[3]), sets, rest, ...(extra || {}) });
    // échauffement
    const wu = U.shuffle(D.WARMUP).slice(0, cfg.dur <= 15 ? 3 : 4).map((w) => item(w, 1, 10));
    blocks.push({ n: 'Échauffement', items: wu });
    // travail de skill
    if (cfg.dur >= 30) {
      const sk = targetSkill(focus.cats.concat(cfg.focus === 'skills' ? ['skill'] : []));
      if (sk) {
        const [exo, mult, amt] = sk.drill, ex = D.EXO[exo];
        blocks.push({ n: 'Objectif skill : ' + sk.n, items: [{ n: ex.n + (mult !== 1 ? ' (version ' + sk.n + ')' : ''), exo, mult, unit: ex.unit, amt, sets: 3, rest: Math.max(60, cfg.rest), skill: sk.id, tip: sk.tip }] });
      }
    }
    // force
    const nStr = { 15: 3, 30: 4, 45: 5, 60: 6 }[cfg.dur] || 4;
    const used = new Set();
    const str = [];
    for (let i = 0; i < nStr; i++) {
      const cat = focus.cats[i % focus.cats.length];
      let pool = D.LIB[cat][lv].filter((x) => (cfg.bar || !x[6]) && !used.has(x[0]));
      if (!pool.length) pool = D.LIB[cat][Math.max(0, lv - 1)].filter((x) => (cfg.bar || !x[6]) && !used.has(x[0]));
      if (!pool.length) pool = D.LIB.core[lv].filter((x) => !used.has(x[0]));
      if (!pool.length) continue;
      const x = U.pick(pool);
      used.add(x[0]);
      str.push(item(x, cfg.dur >= 45 ? 4 : 3, cfg.rest));
    }
    blocks.push({ n: 'Force', items: str });
    // finisher
    if (cfg.dur >= 30) {
      const fin = U.shuffle(D.LIB.cardio[lv].filter((x) => cfg.bar || !x[6])).slice(0, 2).map((x) => item(x, 2, 20));
      fin.push(item(['Gainage', 'plank', 1, 'sec', 30, 45], 2, 30));
      blocks.push({ n: 'Finisher', items: fin });
    }
    blocks.push({ n: 'Retour au calme', items: U.shuffle(D.COOLDOWN).slice(0, cfg.dur >= 45 ? 3 : 2).map((w) => item(w, 1, 5)) });
    // estimation
    let sec = 0, pe = 0;
    for (const b of blocks) for (const it of b.items) {
      const work = it.unit === 'sec' ? it.amt : it.amt * 3;
      sec += it.sets * (work + it.rest);
      pe += it.sets * it.amt * D.EXO[it.exo].rv * it.mult;
    }
    return { cfg, blocks, sec, pe };
  }

  // Lecteur de séance guidée
  function player(plan) {
    const steps = [];
    plan.blocks.forEach((b) => b.items.forEach((it) => { for (let s = 1; s <= it.sets; s++) steps.push({ b: b.n, it, s }); }));
    let i = 0, phase = 'work', left = 0, timer = 0, done = 0, peTot = 0, coinsTot = 0, actual = 0, startT = Date.now();
    const release = wakeLock();
    const anim = PoseAnim(D.EXO[steps[0].it.exo].pose, { w: 80, h: 56, wcls: 'big' });
    let close;
    const finish = (complete) => {
      clearInterval(timer);
      anim.stop();
      release();
      const mins = Math.round((Date.now() - startT) / 60000);
      if (complete || done >= steps.length * 0.6) {
        const S = DT.S;
        S.life.seances++;
        DT.G.daily('seance');
        const bonus = Math.max(500, C.baseProd() * 600) * (1 + plan.cfg.dur / 30);
        DT.G.addCoins(bonus);
        DT.G.addEnergy(10);
        S.pump = Math.min(Math.max(S.pump, Date.now()) + 3600000, Date.now() + 2 * 3600000);
        const items = DT.G.openChest('seance');
        DT.G.checkAch();
        DT.E.emit('coins');
        close && close();
        UI.rewards('Séance terminée !', { text: done + ' séries en ' + mins + ' min · ' + Math.round(peTot) + ' points d\'effort. Production x2 pendant 1 h.', coins: coinsTot + bonus, energy: 10, items, sound: 'win', okLabel: 'Bien joué !' });
      } else {
        close && close();
        UI.toast('Séance interrompue. Les séries faites sont enregistrées.', '');
      }
      DT.E.emit('sportChange');
    };
    close = UI.sheet({ title: 'Séance guidée', cls: 'player', modal: true, body: (el) => {
      const head = h('div', { class: 'pl-head' });
      const bar = h('div', { class: 'bar' }, h('i'));
      const name = h('h3');
      const target = h('div', { class: 'pl-target' });
      const tip = h('p', { class: 'tip' });
      const big = h('div', { class: 'count' });
      const ctrl = h('div', { class: 'pl-ctrl' });
      const next = h('p', { class: 'muted' });
      el.append(head, bar, h('div', { class: 'logger-top' }, anim.el, h('div', { class: 'col' }, name, target)), tip, big, ctrl, next,
        h('div', { class: 'row gap' }, UI.btn('Passer', () => advance(true), { cls: 'ghost sm' }), UI.btn('Arrêter', async () => {
          const ok = await UI.confirm({ title: 'Arrêter la séance ?', text: 'Les séries déjà validées restent enregistrées. Au-delà de 60 % de la séance, tu reçois quand même la récompense.', ok: 'Arrêter', danger: true });
          if (ok) finish(false);
        }, { cls: 'ghost sm danger-t' })));
      const show = () => {
        const st = steps[i], it = st.it, ex = D.EXO[it.exo];
        head.textContent = st.b + ' · ' + (i + 1) + '/' + steps.length;
        bar.firstChild.style.width = (i / steps.length * 100) + '%';
        name.textContent = it.n;
        target.textContent = (it.sets > 1 ? 'Série ' + st.s + '/' + it.sets + ' · ' : '') + (it.unit === 'sec' ? it.amt + ' secondes' : it.amt + ' reps');
        tip.textContent = it.tip || ex.tip;
        anim.set(ex.pose);
        const nx = steps[i + 1];
        next.textContent = nx ? 'Ensuite : ' + nx.it.n + (nx.it.unit === 'sec' ? ' · ' + nx.it.amt + ' s' : ' · ' + nx.it.amt + ' reps') : 'Dernière série !';
        U.clear(ctrl);
        clearInterval(timer);
        if (phase === 'work') {
          if (it.unit === 'sec') {
            left = it.amt;
            big.textContent = U.clockFmt(left);
            let started = false;
            const go = UI.btn('Go !', () => {
              if (started) return; started = true; go.disabled = true; DT.A.play('go');
              timer = setInterval(() => {
                left--; big.textContent = U.clockFmt(Math.max(0, left));
                if (left <= 3 && left > 0) DT.A.play('beep');
                if (left <= 0) { clearInterval(timer); DT.A.play('go'); U.vibrate([80, 50, 80]); validate(it.amt); }
              }, 1000);
            }, { cls: 'go big' });
            ctrl.append(go, UI.btn('Fini', () => validate(Math.max(1, it.amt - Math.max(0, left))), { cls: 'gold' }));
          } else {
            actual = it.amt;
            const upd = () => { big.textContent = actual + ' reps'; };
            upd();
            ctrl.append(UI.btn('−', () => { actual = Math.max(0, actual - 1); upd(); }, { cls: 'ghost' }),
              UI.btn('Série faite !', () => validate(actual), { cls: 'gold big' }),
              UI.btn('+', () => { actual++; upd(); }, { cls: 'ghost' }));
          }
        } else {
          big.textContent = 'Repos ' + U.clockFmt(left);
          ctrl.append(UI.btn('+15 s', () => { left += 15; big.textContent = 'Repos ' + U.clockFmt(left); }, { cls: 'ghost' }), UI.btn('Passer le repos', () => { clearInterval(timer); phase = 'work'; i++; show(); }, { cls: 'go' }));
          timer = setInterval(() => {
            left--; big.textContent = 'Repos ' + U.clockFmt(Math.max(0, left));
            if (left <= 3 && left > 0) DT.A.play('beep');
            if (left <= 0) { clearInterval(timer); DT.A.play('go'); U.vibrate([60, 40, 60]); phase = 'work'; i++; show(); }
          }, 1000);
        }
      };
      const validate = (amount) => {
        const st = steps[i], it = st.it;
        if (amount > 0) {
          const res = DT.G.logExercise(it.exo, amount, { mult: it.mult, pumpMin: 0, noBest: it.mult !== 1 });
          if (res) { peTot += res.pe; coinsTot += res.coins; DT.A.play('coin'); if (res.lvlUp) UI.toast('Niveau ' + DT.S.lvl + ' !', 'gold', true); if (res.streakUp) UI.toast('Série : ' + res.streak + ' jours !', 'gold'); }
        }
        done++;
        advance(false);
      };
      const advance = (skip) => {
        clearInterval(timer);
        if (i >= steps.length - 1) { finish(true); return; }
        const it = steps[i].it;
        if (!skip && it.rest > 0) { phase = 'rest'; left = it.rest; show(); }
        else { phase = 'work'; i++; show(); }
      };
      show();
    } });
  }

  // ---------- Écran ----------
  const SCR = { tabbed: true };
  let sub = 'log', cat = 'all', els = {}, plan = null;
  SCR.render = function (root) {
    els.tabs = h('div', { class: 'seg', role: 'tablist' });
    els.body = h('div');
    root.append(h('h1', { class: 'scr-t', text: 'Entraînement' }), els.tabs, els.body);
    drawTabs();
    draw();
    DT.E.on('sportChange', () => { if (sub === 'hist' && !SCR.root.hidden) draw(); else if (sub === 'log') updCards(); });
  };
  function drawTabs() {
    U.clear(els.tabs).append(...[['log', 'Exercices'], ['seance', 'Séance guidée'], ['hist', 'Historique']].map(([id, n]) =>
      h('button', { type: 'button', role: 'tab', class: sub === id ? 'on' : '', 'aria-selected': sub === id ? 'true' : 'false', on: { click: () => { sub = id; drawTabs(); draw(); } } }, n)));
  }
  function draw() {
    const b = U.clear(els.body);
    if (sub === 'log') drawLog(b);
    else if (sub === 'seance') drawSeance(b);
    else drawHist(b);
  }
  function drawLog(b) {
    b.append(h('p', { class: 'intro', text: 'Fais l\'exercice pour de vrai, puis enregistre-le. Chaque rep rapporte des pièces, de l\'XP et de l\'énergie, et active le PUMP (production x2).' }));
    b.append(h('div', { class: 'chips' }, CATS.map(([id, n]) => h('button', { type: 'button', class: 'chip-b' + (cat === id ? ' on' : ''), on: { click: () => { cat = id; draw(); } } }, n))));
    const grid = h('div', { class: 'exgrid' });
    const look = P.lookFor(DT.S.look, DT.S.skin);
    els.cards = [];
    D.EXOS.filter((e) => cat === 'all' || e.cat === cat).forEach((e) => {
      const tot = h('small', { class: 'tot' });
      const card = h('button', { type: 'button', class: 'excard', on: { click: () => { DT.A.play('click'); logger(e.id); } } },
        h('img', { class: 'thumb', src: P.poseThumb(e.pose, look, 48), alt: '' }),
        h('b', { text: e.n }),
        h('small', { style: { color: (D.BRANCHES[e.cat] || { c: '#94b0c2' }).c }, text: CAT_N[e.cat] + ' · ' + e.rv + ' pt/' + (e.unit === 'reps' ? 'rep' : 's') }), tot);
      els.cards.push([e, tot]);
      grid.append(card);
    });
    b.append(grid);
    updCards();
  }
  function updCards() {
    if (!els.cards) return;
    for (const [e, tot] of els.cards) { const v = DT.S.exo[e.id] || 0; tot.textContent = v ? U.fmtInt(v) + (e.unit === 'reps' ? ' reps' : ' s') + ' au total' : 'Jamais fait'; }
  }
  function drawSeance(b) {
    const S = DT.S, st = S.settings;
    const row = (label, opts, key, cb) => h('div', { class: 'cfg' }, h('span', { class: 'lbl', text: label }), h('div', { class: 'chips' }, opts.map(([v, n]) =>
      h('button', { type: 'button', class: 'chip-b' + (st[key] === v ? ' on' : ''), on: { click: () => { st[key] = v; cb && cb(); draw(); } } }, n))));
    b.append(h('p', { class: 'intro', text: 'Le coach construit ta séance complète : échauffement, travail du prochain skill à débloquer, force, finisher et étirements. Fin de séance = gros bonus, coffre et production x2 pendant 1 h.' }),
      row('Durée', [[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '60 min']], 'dur'),
      row('Focus', D.FOCUS.map((f) => [f.id, f.n]), 'focus'),
      row('Niveau', LEVELS.map((n, i) => [i, n]), 'level'),
      row('Barre de traction', [[true, 'Oui'], [false, 'Non']], 'bar'),
      row('Repos entre séries', [[45, '45 s'], [60, '60 s'], [75, '75 s'], [90, '90 s']], 'rest'),
      UI.btn('Générer ma séance', () => { plan = generate({ dur: st.dur, focus: st.focus, level: st.level, bar: st.bar, rest: st.rest }); draw(); }, { cls: 'gold wide big' }));
    if (plan) {
      const look = P.lookFor(S.look, S.skin);
      const box = h('div', { class: 'plan card' }, h('div', { class: 'row between' }, h('b', { text: 'Ta séance' }), h('small', { text: '≈ ' + Math.round(plan.sec / 60) + ' min · ' + Math.round(plan.pe) + ' pts d\'effort' })));
      plan.blocks.forEach((bl) => {
        box.append(h('h4', { text: bl.n }));
        bl.items.forEach((it) => box.append(h('div', { class: 'plan-it' }, h('img', { class: 'thumb xs', src: P.poseThumb(D.EXO[it.exo].pose, look, 48), alt: '' }),
          h('span', { text: it.n }), h('b', { text: (it.sets > 1 ? it.sets + ' × ' : '') + it.amt + (it.unit === 'sec' ? ' s' : '') }))));
      });
      box.append(h('div', { class: 'row gap' }, UI.btn('Autre séance', () => { plan = generate(plan.cfg); draw(); }, { cls: 'ghost' }), UI.btn('Commencer', () => player(plan), { cls: 'go big' })));
      b.append(box);
    }
  }
  function drawHist(b) {
    const S = DT.S, di = U.dayIndex();
    const days = [];
    for (let k = 13; k >= 0; k--) days.push([di - k, (S.hist[di - k] || { rv: 0 }).rv]);
    const max = Math.max(20, ...days.map((d) => d[1]));
    const chart = h('div', { class: 'chart', role: 'img', 'aria-label': 'Points d\'effort des 14 derniers jours' });
    days.forEach(([d, v]) => chart.append(h('div', { class: 'col' + (d === di ? ' today' : '') + (v >= 20 ? ' ok' : '') },
      h('small', { class: 'v', text: v ? Math.round(v) : '' }), h('i', { style: { height: Math.max(2, v / max * 100) + '%' } }), h('small', { text: U.dayLabel(d).slice(0, 1) }))));
    const cats = C.cats();
    const vol = S.vol;
    b.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('b', { text: '14 derniers jours' }), h('small', { class: 'muted', text: 'Un jour compte dans ta série à partir de 20 pts' })), chart),
      h('div', { class: 'statgrid' },
        h('div', { class: 'st' }, h('small', { text: 'Points d\'effort' }), h('b', { text: U.fmtInt(S.life.rv) })),
        h('div', { class: 'st' }, h('small', { text: 'Série actuelle' }), h('b', { text: C.streakNow() + ' j' })),
        h('div', { class: 'st' }, h('small', { text: 'Meilleure série' }), h('b', { text: S.life.bestStreak + ' j' })),
        h('div', { class: 'st' }, h('small', { text: 'Séances guidées' }), h('b', { text: S.life.seances }))),
      h('div', { class: 'card' }, h('b', { text: 'Tes caractéristiques réelles' }),
        h('p', { class: 'muted', text: 'Elles viennent uniquement de ton volume d\'entraînement et renforcent ton héros en donjon.' }),
        h('ul', { class: 'stats' },
          h('li', {}, h('span', { text: 'Force (poussée + tirage)' }), h('b', { text: cats.FOR }), h('em', { text: U.fmtInt(vol.push + vol.pull) + ' pts' })),
          h('li', {}, h('span', { text: 'Endurance (jambes + cardio)' }), h('b', { text: cats.END }), h('em', { text: U.fmtInt(vol.legs + vol.cardio) + ' pts' })),
          h('li', {}, h('span', { text: 'Gainage' }), h('b', { text: cats.GAI }), h('em', { text: U.fmtInt(vol.core) + ' pts' })),
          h('li', {}, h('span', { text: 'Agilité (équilibre + cardio)' }), h('b', { text: cats.AGI }), h('em', { text: U.fmtInt(vol.skill + vol.cardio * 0.5) + ' pts' })))));
    const recs = D.EXOS.filter((e) => S.best[e.id]);
    if (recs.length) b.append(h('div', { class: 'card' }, h('b', { text: 'Records (meilleure série)' }), h('ul', { class: 'stats' }, recs.map((e) => h('li', {}, h('span', { text: e.n }), h('b', { text: S.best[e.id] + (e.unit === 'reps' ? ' reps' : ' s') }))))));
    const log = h('div', { class: 'card' }, h('b', { text: 'Dernières séries' }));
    if (!S.log.length) log.append(h('p', { class: 'muted', text: 'Rien pour l\'instant. Ta première série t\'attend dans l\'onglet Exercices.' }));
    else log.append(h('ul', { class: 'loglist' }, S.log.slice(0, 20).map((l) => h('li', {}, h('span', { text: (D.EXO[l.e] || { n: l.e }).n }), h('b', { text: l.u + (D.EXO[l.e] && D.EXO[l.e].unit === 'sec' ? ' s' : '') }), h('small', { text: ago(l.t) })))));
    b.append(log);
  }
  function ago(t) {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'à l\'instant';
    if (s < 3600) return 'il y a ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.floor(s / 3600) + ' h';
    return 'il y a ' + Math.floor(s / 86400) + ' j';
  }
  SCR.update = function () {};
  let seenLook = 0;
  SCR.show = function () {
    if (sub === 'hist' || (sub === 'log' && seenLook !== (DT.lookV || 0))) draw();
    else if (sub === 'log') updCards();
    seenLook = DT.lookV || 0;
  };
  SCR.generate = generate;
  SCR.openSeance = () => { sub = 'seance'; drawTabs(); draw(); };
  DT.SCR.sport = SCR;
})(window.DT);
