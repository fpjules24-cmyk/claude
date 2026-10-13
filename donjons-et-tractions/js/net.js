'use strict';
// Donjons & Tractions — en ligne (optionnel) : sauvegarde cloud, classement et raid partagés.
// Fonctionne uniquement quand la page est ouverte comme artifact claude.ai ; sinon tout reste local.
(function (DT) {
  const U = DT.U;
  const NET = { cloud: false, board: [], raid: [], players: [], db: null, uid: null };
  let dirty = false, saveTimer = 0, writing = false, lastLb = '', lastBody = '';

  const strip = (k, v) => (k === 't' || k === 'last' || k === 'offline' ? undefined : v);

  async function init() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    let db, user;
    try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch (e) { return; }
    if (!db || !user) return;
    let uid = null;
    try { uid = await user.id(); } catch (e) { uid = null; }
    if (!uid) return;
    NET.db = db; NET.uid = uid;
    const ref = db.doc('data/users/' + uid + '/save');
    try {
      const snap = await ref.get();
      if (snap.exists) {
        const d = snap.data() || {};
        let o = null;
        try { o = JSON.parse(d.json); } catch (e) { o = null; }
        if (o && DT.SAVE.valid(o) && (o.t || 0) > (DT.S.t || 0) + 5000) offerCloud(o);
        else if (o) lastBody = JSON.stringify(o, strip);
      }
      NET.cloud = true;
      dirty = true;
      scheduleSave(3000);
    } catch (e) {
      NET.cloud = false;
    }
    subscribe();
    pushLb();
    DT.E.emit('net');
  }

  function offerCloud(o) {
    const when = new Date(o.t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    DT.UI.confirm({
      title: 'Sauvegarde cloud trouvée',
      text: 'Une partie plus récente existe sur ton compte (' + (o.nick || 'Athlète') + ', niveau ' + (o.lvl || 1) + ', ' + when + '). La charger ici ?',
      ok: 'Charger', cancel: 'Garder celle-ci',
    }).then((ok) => {
      if (ok) {
        DT.SAVE.setState(o);
        DT.S.last = Date.now();
        DT.SAVE.save();
        lastBody = JSON.stringify(DT.S, strip);
        DT.restart && DT.restart();
        DT.UI.toast('Partie cloud chargée !', 'good');
      } else { dirty = true; scheduleSave(1000); }
    });
  }

  function mark() { if (!NET.cloud) return; dirty = true; scheduleSave(15000); }
  function scheduleSave(ms) {
    if (!NET.cloud) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveCloud(false), ms);
  }
  async function saveCloud(force) {
    if (!NET.cloud || !NET.db || writing) return;
    if (!dirty && !force) return;
    const body = JSON.stringify(DT.S, strip);
    if (body === lastBody && !force) { dirty = false; return; }
    writing = true;
    try {
      DT.S.t = Date.now();
      await NET.db.doc('data/users/' + NET.uid + '/save').set({ json: JSON.stringify(DT.S), t: DT.S.t, v: DT.S.v });
      lastBody = body; dirty = false;
    } catch (e) {
      if (e && (e.code === 'revoked' || e.code === 'not_granted' || e.code === 'invalid_argument')) { NET.cloud = false; DT.E.emit('net'); }
      else if (e && e.code === 'unavailable') setTimeout(() => scheduleSave(5000), U.randInt(500, 2000));
    } finally { writing = false; }
    pushLb();
  }

  function lbEntry() {
    const S = DT.S, me = DT.SCR.social.myEntry();
    return { nick: S.nick, power: me.power, lvl: me.lvl, skills: me.skills, rv: me.rv, skin: S.skin, look: { skin: S.look.skin, hair: S.look.hair, hs: S.look.hs, top: S.look.top } };
  }
  async function pushLb() {
    if (!NET.db || !NET.uid) return;
    const e = lbEntry();
    const key = JSON.stringify(e);
    if (key === lastLb) return;
    lastLb = key;
    try { await NET.db.doc('lb/' + NET.uid).set(Object.assign(e, { t: Date.now() })); } catch (err) { lastLb = ''; }
  }
  NET.pushRaid = async function () {
    if (!NET.db || !NET.uid) return;
    const r = DT.G.raidState();
    try { await NET.db.doc('raid/' + NET.uid).set({ week: r.week, dmg: Math.round(r.dmg), nick: DT.S.nick, t: Date.now() }); } catch (e) { /* lecture seule */ }
  };

  function clean(d) {
    const o = d.data() || {};
    return {
      nick: String(o.nick || 'Athlète').slice(0, 16), power: Number(o.power) || 0, lvl: Number(o.lvl) || 1, skills: Number(o.skills) || 0, rv: Number(o.rv) || 0,
      skin: DT.D.SKIN[o.skin] ? o.skin : 'base', look: o.look && typeof o.look === 'object' ? o.look : {}, t: Number(o.t) || 0, me: d.id === NET.uid,
    };
  }
  function subscribe() {
    try {
      NET.db.collection('lb').orderBy('power', 'desc').limit(50).onSnapshot((snap) => {
        NET.board = snap.docs.map(clean);
        NET.players = NET.board.filter((p) => !p.me && Date.now() - p.t < 7 * 86400000);
        DT.E.emit('net');
      }, () => {});
      NET.db.collection('raid').where('week', '==', U.weekIndex()).onSnapshot((snap) => {
        NET.raid = snap.docs.map((d) => { const o = d.data() || {}; return { nick: String(o.nick || 'Athlète').slice(0, 16), dmg: Number(o.dmg) || 0, me: d.id === NET.uid }; });
        DT.E.emit('net');
      }, () => {});
    } catch (e) { /* abonnements indisponibles */ }
  }

  NET.init = init;
  NET.mark = mark;
  NET.saveCloud = saveCloud;
  NET.flush = () => { if (dirty) saveCloud(false); };
  DT.NET = NET;
})(window.DT);
