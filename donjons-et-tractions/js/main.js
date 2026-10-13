'use strict';
// Donjons & Tractions — démarrage, boucles de jeu, sauvegarde automatique
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, G = DT.G, E = DT.E;
  let booted = false, lastTick = Date.now(), loopsOn = false;

  function wire() {
    const UI = DT.UI;
    E.on('toast', (o) => UI.toast(o.t, o.k === 'ach' || o.k === 'skin' || o.k === 'pet' ? 'gold' : o.k === 'gem' ? 'gem' : 'good', o.big));
    E.on('lvlup', (l) => { DT.A.play('lvl'); UI.toast('Niveau d\'athlète ' + l + ' !' + (DT.S.gemsOn ? ' +3 éclats' : ''), 'gold', true); });
    E.on('skillLvl', ({ id, ms }) => {
      if (ms && ms.length) { DT.A.play('ach'); UI.toast(D.SKILL[id].n + ' : palier ' + ms[ms.length - 1] + ' atteint, production x2 !', 'gold'); }
      if (DT.S.tut === 1) { DT.S.tut = 2; UI.toast('Bien joué ! Reviens t\'entraîner pour accélérer, et découvre les donjons.', 'good', true); }
    });
    E.on('log', () => {
      if (DT.S.tut === 0) {
        DT.S.tut = 1;
        setTimeout(() => UI.toast('Va dans l\'onglet Skills : achète des niveaux de Pompes pour produire plus.', 'gold', true), 1800);
      }
    });
    E.on('look', () => { DT.lookV = (DT.lookV || 0) + 1; });
    E.on('clsup', ({ cls, lvl }) => { DT.A.play('lvl'); UI.toast(D.CLASSES[cls].n + ' niveau ' + lvl + ' ! +1 point de capacité', 'gold', true); });
    E.on('chest', () => badges());
    E.on('net', () => { UI.hud(); if (DT.SCR.park && DT.NET.players.length) DT.SCR.park.refreshBots(); });
    for (const ev of ['log', 'skill', 'skillLvl', 'inv', 'dungeon', 'quest', 'prestige', 'look', 'raid', 'gems', 'shop', 'chest', 'cls', 'clsup', 'ability', 'trade', 'loadout']) E.on(ev, () => DT.NET.mark());
  }

  function badges() {
    const S = DT.S;
    let n = 0;
    for (const sk of D.SKILLS) if (!S.skills[sk.id] && C.unlockState(sk.id).ok) n++;
    DT.UI.badge('skills', n);
    const r = G.raidState();
    const claim = r.th.filter((t, i) => r.dmg >= t && !r.claimed.includes(i)).length;
    DT.UI.badge('dungeon', claim);
    DT.UI.badge('hero', DT.SCR.hero.badge());
    const qClaim = S.daily.q.filter((id) => { const q = D.QUESTS.find((x) => x.id === id); return q && G.questProgress(q) >= q.n && !S.daily.got.includes(id); }).length;
    DT.UI.badge('park', qClaim + (S.daily.chest ? 0 : 1));
  }

  function offlinePopup(off) {
    if (!off || !(off.coins > 0) || !DT.S.started) return;
    DT.UI.rewards('Bon retour !', {
      text: 'Pendant ton absence (' + U.timeFmt(off.away) + '), tes skills ont produit des pièces' + (off.capped ? ' (limité à ' + Math.round(C.offlineCap() / 3600) + ' h)' : '') + '. Une petite série pour lancer le PUMP ?',
      coins: off.coins, sound: 'coin', okLabel: 'Merci !',
    });
  }

  function startLoops() {
    if (loopsOn) return;
    loopsOn = true;
    setInterval(() => {
      const now = Date.now(), S = DT.S;
      if (now - S.last > 30000) { const off = G.offline(); lastTick = now; offlinePopup(off); return; }
      const dt = Math.min(5, Math.max(0, (now - lastTick) / 1000));
      lastTick = now;
      G.tick(dt);
    }, 100);
    setInterval(() => {
      if (document.hidden) return;
      DT.UI.hud();
      const cur = DT.UI.cur();
      if (cur && DT.SCR[cur].update) DT.SCR[cur].update();
    }, 250);
    setInterval(() => { if (!document.hidden) badges(); }, 1000);
    setInterval(() => { DT.SAVE.save(); if (G.dailyCheck()) DT.UI.toast('Nouvelle journée : nouvelles quêtes et nouveau cadeau !', 'gold', true); G.checkAch(); }, 10000);
    const flush = () => { DT.SAVE.save(); DT.NET.flush(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else { lastTick = Date.now(); DT.SCR.park.resize && DT.SCR.park.resize(); } });
    window.addEventListener('pagehide', flush);
    window.addEventListener('resize', () => { DT.SCR.park.resize && DT.SCR.park.resize(); });
  }

  function buildUI(tab) {
    E.reset();
    wire();
    DT.UI.init();
    DT.UI.go(tab && DT.SCR[tab] && DT.SCR[tab].tabbed ? tab : 'park');
    DT.UI.hud();
    badges();
  }

  function start(hotData) {
    if (booted) return;
    booted = true;
    let saved = null;
    if (hotData && hotData.save) { try { saved = JSON.parse(hotData.save); } catch (e) { saved = null; } }
    const local = DT.SAVE.load();
    if (!saved || !DT.SAVE.valid(saved) || (local && (local.t || 0) > (saved.t || 0))) saved = local;
    DT.SAVE.setState(saved);
    G.dailyCheck();
    G.shopRefresh(false);
    G.tradeRefresh(false);
    const off = saved ? G.offline() : null;
    DT.S.last = Date.now();
    buildUI(U.store.get('dt_tab'));
    startLoops();
    if (!DT.S.started) DT.SCR.settings.onboard(() => { DT.SAVE.save(); DT.SCR.hero.pickClass(() => { DT.SAVE.save(); DT.SCR.settings.firstMission(); }, { modal: true, intro: 'Dernière étape : ton héros. Chaque classe grandit avec une famille d\'exercices que tu fais pour de vrai.' }); });
    else {
      offlinePopup(off);
      if (!DT.S.cls) DT.SCR.hero.pickClass(() => DT.SAVE.save(), { modal: true, intro: 'Nouveau : ton athlète a un alter ego fantasy ! Choisis sa classe. Tes skills et tout ton entraînement réel lui ont déjà donné de l\'expérience.' });
    }
    if (DT.S.settings.music) document.addEventListener('pointerdown', () => DT.A.musicOn(true), { once: true });
    DT.SAVE.save();
    try { if (window.claude && window.claude.hot && typeof window.claude.hot.snapshot === 'function') window.claude.hot.snapshot(() => ({ save: DT.SAVE.serialize() })); } catch (e) { /* pas de rechargement à chaud */ }
    DT.NET.init().catch(() => {});
    registerSW();
  }
  // Recharge l'interface après le chargement d'une sauvegarde cloud
  DT.restart = function () { buildUI('park'); };

  function registerSW() {
    try {
      if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window && document.querySelector('link[rel="manifest"]')) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    } catch (e) { /* hébergement sans service worker */ }
  }

  function boot() {
    const go = () => {
      const hot = window.claude && window.claude.hot;
      if (hot && typeof hot.ready === 'function') {
        try { hot.ready((data) => start(data || {})); } catch (e) { start({}); }
        setTimeout(() => start({}), 1500);
      } else start((hot && hot.data) || {});
    };
    const fontsReady = document.fonts && document.fonts.load ? Promise.race([
      Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('20px "VT323"')]),
      new Promise((r) => setTimeout(r, 1200)),
    ]).catch(() => {}) : Promise.resolve();
    fontsReady.then(go, go);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.DT);
