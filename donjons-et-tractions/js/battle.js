'use strict';
// Donjons & Tractions — moteur de combat (simulation + rendu pixel)
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C;
  const GAUGE = 6.5; // vitesse de remplissage de la jauge d'action

  function abColor(id) { return D.BRANCHES[D.SKILL[id].br].c; }

  // ===================== Simulation =====================
  function Fight(cfg) {
    this.cfg = cfg;
    const st = cfg.hero;
    this.hero = { name: cfg.heroName || 'Toi', max: st.hp, hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, crit: st.crit, cdmg: st.cdmg, gauge: 50, shield: 0, shieldT: 0, buffs: [], stun: 0, dodge: 0 };
    this.abs = (cfg.loadout || []).map((id) => ({ id, def: D.SKILL[id].ab, cd: 0, max: D.SKILL[id].ab.cd }));
    this.foe = null;
    this.time = 0; this.queue = []; this.ev = []; this.over = false; this.result = null;
    this.auto = !!cfg.auto;
    this.petT = 3; this.pet = !!cfg.pet;
    this.dmgDealt = 0;
    this.timeLimit = cfg.timeLimit || 0;
  }
  Fight.prototype.setFoe = function (f) {
    this.foe = Object.assign({ gauge: 20, stun: 0, shield: 0, charge: 0, spT: 4 + Math.random() * 3, enraged: false, healed: 0, dead: false }, f);
    this.foe.max = this.foe.hp;
    this.over = false; this.result = null;
    for (const a of this.abs) a.cd = Math.max(a.cd, a.max * 0.4);
    this.hero.gauge = 50;
  };
  Fight.prototype.buff = function (k) {
    let v = 0;
    for (const b of this.hero.buffs) if (b.k === k) v += b.v;
    return v;
  };
  Fight.prototype.emit = function (e) { if (!this.cfg.headless) this.ev.push(e); };
  Fight.prototype.hitFoe = function (mult, forceCrit, tag) {
    const f = this.foe, H = this.hero;
    if (!f || f.dead) return 0;
    const atk = H.atk * (1 + this.buff('atk'));
    let dmg = atk * atk / (atk + f.def) * mult * U.rand(0.9, 1.1);
    const crit = forceCrit || Math.random() < H.crit + this.buff('crit');
    if (crit) dmg *= H.cdmg;
    if (f.shield > 0) { const a = Math.min(f.shield, dmg); f.shield -= a; dmg -= a; this.emit({ t: 'block', who: 'foe' }); }
    dmg = Math.max(1, dmg);
    if (!f.inv) f.hp -= dmg;
    this.dmgDealt += dmg;
    this.emit({ t: 'dmg', who: 'foe', amt: dmg, crit, tag });
    if (f.hp <= 0 && !f.dead) { f.hp = 0; f.dead = true; this.emit({ t: 'die', who: 'foe' }); this.end(true); }
    return dmg;
  };
  Fight.prototype.hitHero = function (mult, extra) {
    const f = this.foe, H = this.hero;
    if (H.dodge > 0) { H.dodge--; this.emit({ t: 'dodge', who: 'hero' }); return 0; }
    const atk = f.atk * (f.enraged ? 1.5 : 1);
    let dmg = atk * atk / (atk + H.def) * mult * U.rand(0.9, 1.1);
    const crit = Math.random() < (f.crit || 0.05);
    if (crit) dmg *= 1.5;
    if (H.shield > 0) { const a = Math.min(H.shield, dmg); H.shield -= a; dmg -= a; this.emit({ t: 'block', who: 'hero', amt: a }); }
    if (dmg > 0) {
      H.hp -= dmg;
      this.emit({ t: 'dmg', who: 'hero', amt: dmg, crit });
    }
    if (extra === 'stun') { H.stun = Math.max(H.stun, 1); this.emit({ t: 'text', who: 'hero', text: 'ÉTOURDI', c: '#ffcd75' }); }
    if (extra === 'drain' && dmg > 0) { f.hp = Math.min(f.max, f.hp + dmg * 0.5); this.emit({ t: 'heal', who: 'foe', amt: dmg * 0.5 }); }
    if (H.hp <= 0) { H.hp = 0; this.emit({ t: 'die', who: 'hero' }); this.end(false); }
    return dmg;
  };
  Fight.prototype.end = function (win) {
    if (this.over) return;
    this.over = true;
    this.result = { win, time: this.time };
    this.queue = [];
  };
  Fight.prototype.ready = function (i) {
    const a = this.abs[i];
    return a && a.cd <= 0 && !this.over && this.hero.stun <= 0 && this.foe && !this.foe.dead;
  };
  Fight.prototype.use = function (i) {
    if (!this.ready(i)) return false;
    const a = this.abs[i], ab = a.def, H = this.hero;
    a.cd = a.max;
    this.emit({ t: 'ability', id: a.id, name: ab.n, c: abColor(a.id), ty: ab.ty });
    switch (ab.ty) {
      case 'dmg': this.hitFoe(ab.p, false, 'ab'); break;
      case 'crit': this.hitFoe(ab.p, true, 'ab'); break;
      case 'multi': for (let k = 0; k < ab.n2; k++) this.queue.push({ t: this.time + k * 0.14, fn: () => this.hitFoe(ab.p, false, 'ab') }); break;
      case 'stun': this.hitFoe(ab.p, false, 'ab'); if (this.foe && !this.foe.dead) { this.foe.stun = Math.max(this.foe.stun, ab.s); if (this.foe.charge > 0) { this.foe.charge = 0; this.emit({ t: 'text', who: 'foe', text: 'INTERROMPU', c: '#73eff7' }); } this.emit({ t: 'text', who: 'foe', text: 'ÉTOURDI', c: '#ffcd75' }); } break;
      case 'heal': { const v = H.max * ab.h; H.hp = Math.min(H.max, H.hp + v); this.emit({ t: 'heal', who: 'hero', amt: v }); break; }
      case 'shield': H.shield = H.max * ab.h; H.shieldT = ab.d; this.emit({ t: 'shield', who: 'hero' }); break;
      case 'buff': H.buffs.push({ k: 'atk', v: ab.v, t: ab.d }); this.emit({ t: 'text', who: 'hero', text: '+ATK', c: '#ef7d57' }); break;
      case 'bcrit': H.buffs.push({ k: 'crit', v: ab.v, t: ab.d }); this.emit({ t: 'text', who: 'hero', text: '+CRIT', c: '#ffcd75' }); break;
      case 'haste': H.buffs.push({ k: 'spd', v: ab.v, t: ab.d }); this.emit({ t: 'text', who: 'hero', text: '+VIT', c: '#73eff7' }); break;
      case 'drain': { const d = this.hitFoe(ab.p, false, 'ab'); const v = d * ab.h; H.hp = Math.min(H.max, H.hp + v); this.emit({ t: 'heal', who: 'hero', amt: v }); break; }
      case 'dodge': H.dodge += ab.n2; this.emit({ t: 'text', who: 'hero', text: 'ESQUIVE x' + ab.n2, c: '#a7f070' }); break;
      default: break;
    }
    return true;
  };
  // IA du mode auto : soigne, protège, interrompt, puis frappe
  Fight.prototype.autoPlay = function () {
    const H = this.hero, f = this.foe;
    if (!f || f.dead) return;
    const hpf = H.hp / H.max;
    let pick = -1, best = -1;
    this.abs.forEach((a, i) => {
      if (!this.ready(i)) return;
      const ty = a.def.ty;
      let sc = 0;
      if (ty === 'heal') sc = hpf < 0.5 ? 100 : -1;
      else if (ty === 'shield') sc = hpf < 0.75 && H.shield <= 0 ? 80 : -1;
      else if (ty === 'dodge') sc = (f.charge > 0 || hpf < 0.5) && H.dodge === 0 ? 85 : -1;
      else if (ty === 'stun') sc = f.charge > 0 ? 120 : 50 + (a.def.p || 0) * 5;
      else if (ty === 'buff' || ty === 'bcrit' || ty === 'haste') sc = this.buff(ty === 'buff' ? 'atk' : ty === 'bcrit' ? 'crit' : 'spd') > 0 ? -1 : 60;
      else if (ty === 'drain') sc = 40 + (1 - hpf) * 40;
      else sc = 30 + (a.def.p || 1) * (a.def.n2 || 1) * 5;
      if (sc > best) { best = sc; pick = i; }
    });
    if (pick >= 0 && best > 0) this.use(pick);
  };
  Fight.prototype.update = function (dt) {
    if (this.over || !this.foe) return;
    this.time += dt;
    const H = this.hero, f = this.foe;
    // file d'attente (coups multiples)
    for (let i = this.queue.length - 1; i >= 0; i--) if (this.queue[i].t <= this.time) { const q = this.queue.splice(i, 1)[0]; q.fn(); if (this.over) return; }
    for (const a of this.abs) if (a.cd > 0) a.cd = Math.max(0, a.cd - dt);
    H.buffs = H.buffs.filter((b) => (b.t -= dt) > 0);
    if (H.shieldT > 0) { H.shieldT -= dt; if (H.shieldT <= 0) H.shield = 0; }
    if (this.timeLimit && this.time >= this.timeLimit) { this.end(true); this.result.timeout = true; return; }
    // héros
    if (H.stun > 0) H.stun -= dt;
    else {
      H.gauge += H.spd * (1 + this.buff('spd')) * dt * GAUGE;
      if (H.gauge >= 100) {
        H.gauge -= 100;
        this.emit({ t: 'attack', who: 'hero' });
        this.hitFoe(1);
        if (this.over) return;
      }
      if (this.auto) this.autoPlay();
      if (this.over) return;
    }
    // familier
    if (this.pet) { this.petT -= dt; if (this.petT <= 0) { this.petT = 4; this.emit({ t: 'pet' }); this.hitFoe(0.15, false, 'pet'); if (this.over) return; } }
    // ennemi
    if (!f.enraged && (f.boss || f.sp === 'enrage') && f.hp < f.max * 0.35 && !f.inv) { f.enraged = true; f.spd *= 1.3; this.emit({ t: 'text', who: 'foe', text: 'ENRAGÉ !', c: '#e0667a' }); }
    if (f.stun > 0) { f.stun -= dt; return; }
    if (f.charge > 0) {
      f.charge -= dt;
      if (f.charge <= 0) { this.emit({ t: 'attack', who: 'foe', heavy: true }); this.hitHero(2.5); }
      return;
    }
    f.spT -= dt;
    if (f.spT <= 0 && f.sp) {
      f.spT = 7 + Math.random() * 3;
      switch (f.sp) {
        case 'heavy': f.charge = 1.6; this.emit({ t: 'charge', who: 'foe' }); return;
        case 'multi': for (let k = 0; k < 3; k++) this.queue.push({ t: this.time + k * 0.18, fn: () => { this.emit({ t: 'attack', who: 'foe' }); this.hitHero(0.45); } }); return;
        case 'heal': if (f.hp < f.max * 0.6 && f.healed < 2) { f.healed++; const v = f.max * 0.12; f.hp = Math.min(f.max, f.hp + v); this.emit({ t: 'heal', who: 'foe', amt: v }); return; } break;
        case 'shield': f.shield = f.max * 0.1; this.emit({ t: 'shield', who: 'foe' }); return;
        case 'stun': this.emit({ t: 'attack', who: 'foe' }); this.hitHero(1.1, 'stun'); return;
        case 'drain': this.emit({ t: 'attack', who: 'foe' }); this.hitHero(1.3, 'drain'); return;
        default: break;
      }
    }
    f.gauge += f.spd * dt * GAUGE;
    if (f.gauge >= 100) {
      f.gauge -= 100;
      this.emit({ t: 'attack', who: 'foe' });
      this.hitHero(1);
    }
  };

  // Construit un ennemi d'un donjon
  function makeFoe(d, room, mode, def, boss) {
    const st = C.foeStats(d, room, mode, boss);
    const sp = { heavy: 0.95, multi: 0.95, heal: 1, shield: 1.05, stun: 1, drain: 1, enrage: 1 }[def.sp] || 1;
    return Object.assign({}, def, { hp: st.hp * sp, atk: st.atk, def: st.def, spd: st.spd, crit: st.crit, boss: !!boss, s: def.s || (boss ? 2 : 1) });
  }
  function heroCfg(extra) {
    const S = DT.S;
    const eqW = S.eq.weapon && DT.G.findItem(S.eq.weapon);
    return Object.assign({
      hero: C.stats(), loadout: S.loadout.slice(0, C.abilitySlots()), auto: S.settings.auto, pet: !!S.pet, heroName: S.nick,
      look: DT.P.lookFor(S.look, S.skin), weapon: eqW ? { icon: eqW.icon, c: D.RAR[eqW.r].c } : null,
    }, extra || {});
  }

  // ===================== Rendu =====================
  const W = 160, H = 90, GY = 77, HX = 46, FX = 114;
  function View(fight, canvas, theme) {
    this.f = fight; this.theme = theme;
    this.st = new DT.P.Stage(canvas, W, H);
    this.t = 0; this.nums = []; this.parts = []; this.shake = 0;
    this.hAnim = { pose: 'fight', t: 0, until: 0, dx: 0 };
    this.fAnim = { t: 0, until: 0, dx: 0, flash: 0, pose: 'fight', fade: 1 };
    this.banner = null;
  }
  View.prototype.consume = function () {
    const f = this.f;
    for (const e of f.ev) {
      if (this.onEv) this.onEv(e);
      if (e.t === 'dmg') {
        const onFoe = e.who === 'foe';
        this.num(onFoe ? FX : HX, GY - 30, (e.crit ? 'CRIT ' : '') + U.fmt(e.amt), onFoe ? (e.crit ? '#ffcd75' : e.tag === 'pet' ? '#a7f070' : '#f4f4f4') : '#e0667a', e.crit ? 5 : 4);
        if (onFoe) { this.fAnim.flash = 0.09; DT.A.play(e.crit ? 'crit' : 'hit'); this.burst(FX, GY - 12, e.crit ? 10 : 5, e.crit ? '#ffcd75' : '#f4f4f4'); if (e.crit) this.shake = 0.2; }
        else { this.hAnim.pose = 'hit'; this.hAnim.until = this.t + 0.2; DT.A.play('hurt'); this.shake = Math.max(this.shake, 0.1); U.vibrate(15); }
      } else if (e.t === 'attack') {
        if (e.who === 'hero') { this.hAnim.pose = Math.random() < 0.5 ? 'punch' : 'kick'; this.hAnim.until = this.t + 0.22; this.hAnim.dx = 8; }
        else { this.fAnim.until = this.t + 0.22; this.fAnim.dx = e.heavy ? -16 : -8; this.fAnim.pose = 'punch'; if (e.heavy) this.shake = 0.3; }
      } else if (e.t === 'ability') {
        this.banner = { text: e.name, c: e.c, until: this.t + 1.1 };
        this.hAnim.pose = 'cast'; this.hAnim.until = this.t + 0.35;
        this.burst(HX, GY - 16, 14, e.c);
        DT.A.play(e.ty === 'heal' ? 'heal' : e.ty === 'shield' ? 'shield' : 'skill');
      } else if (e.t === 'heal') {
        this.num(e.who === 'foe' ? FX : HX, GY - 34, '+' + U.fmt(e.amt), '#a7f070', 4);
        this.burst(e.who === 'foe' ? FX : HX, GY - 10, 8, '#a7f070');
      } else if (e.t === 'shield') {
        this.num(e.who === 'foe' ? FX : HX, GY - 36, 'BOUCLIER', '#73eff7', 3.5);
      } else if (e.t === 'block') {
        this.burst(e.who === 'foe' ? FX : HX, GY - 14, 4, '#73eff7');
      } else if (e.t === 'dodge') {
        this.num(HX, GY - 34, 'ESQUIVE', '#a7f070', 4);
        this.hAnim.dx = -8; this.hAnim.until = this.t + 0.2; this.hAnim.pose = 'fight';
      } else if (e.t === 'text') {
        this.num(e.who === 'foe' ? FX : HX, GY - 40, e.text, e.c, 3.5);
      } else if (e.t === 'charge') {
        this.num(FX, GY - 42, '! ATTAQUE CHARGÉE !', '#e0667a', 3.2);
      } else if (e.t === 'die') {
        if (e.who === 'foe') { DT.A.play('win'); this.burst(FX, GY - 12, 24, '#ffcd75'); }
        else DT.A.play('lose');
      } else if (e.t === 'pet') {
        this.burst(HX - 18, GY - 10, 4, '#a7f070');
      }
    }
    f.ev.length = 0;
  };
  View.prototype.num = function (x, y, text, c, size) { this.nums.push({ x: x + U.rand(-6, 6), y, text, c, size: size || 4, life: 0.9 }); };
  View.prototype.burst = function (x, y, n, c) { for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: U.rand(-40, 40), vy: U.rand(-50, -10), life: U.rand(0.3, 0.7), c }); };
  View.prototype.draw = function (dt) {
    this.t += dt;
    this.consume();
    const f = this.f, st = this.st, lc = st.lc;
    lc.save();
    if (this.shake > 0) { this.shake -= dt; lc.translate(Math.round(U.rand(-1.5, 1.5)), Math.round(U.rand(-1, 1))); }
    lc.drawImage(DT.P.themeBg(this.theme, W, H), 0, 0);
    // ombres
    lc.fillStyle = 'rgba(26,28,44,0.35)'; lc.fillRect(HX - 8, GY, 16, 2); lc.fillRect(FX - 10, GY, 20, 2);
    // héros
    const cfg = f.cfg, Hh = f.hero;
    let hp = 'fight', hdx = 0;
    if (f.over && f.result && !f.result.win) hp = 'ko';
    else if (f.over && f.result && f.result.win && !f.cfg.raid) hp = 'victory';
    else if (this.t < this.hAnim.until) { hp = this.hAnim.pose; hdx = this.hAnim.dx * Math.sin((this.hAnim.until - this.t) / 0.22 * Math.PI); }
    if (Hh.stun > 0 && !f.over) hp = 'hit';
    if (cfg.petSpr) lc.drawImage(DT.P.spriteCanvas(DT.P.SPR[cfg.petSpr.spr], cfg.petSpr.pal, { flip: true }), HX - 28, GY - 15 + Math.round(Math.sin(this.t * 3)));
    DT.P.drawFigure(lc, hp, cfg.look, HX + Math.round(hdx), GY, { time: this.t, weapon: cfg.weapon });
    if (Hh.shield > 0) { lc.strokeStyle = 'rgba(115,239,247,0.8)'; lc.lineWidth = 1; lc.strokeRect(HX - 10, GY - 28, 20, 29); }
    // ennemi
    const fo = f.foe;
    if (fo) {
      let fdx = 0;
      if (this.t < this.fAnim.until) fdx = this.fAnim.dx * Math.sin((this.fAnim.until - this.t) / 0.22 * Math.PI);
      if (fo.charge > 0) fdx = Math.round(Math.sin(this.t * 50) * 1) + 3;
      let alpha = 1;
      if (fo.dead) { this.fAnim.fade = Math.max(0, this.fAnim.fade - dt * 1.5); alpha = this.fAnim.fade; }
      if (alpha > 0) {
        lc.globalAlpha = alpha;
        const white = this.fAnim.flash > 0;
        this.fAnim.flash -= dt;
        const s = fo.s || 1;
        if (fo.spr === 'human') {
          let fp = 'fight';
          if (fo.dead) fp = 'ko'; else if (this.t < this.fAnim.until) fp = 'punch'; else if (fo.stun > 0) fp = 'hit';
          DT.P.drawFigure(lc, fp, DT.P.lookFor(fo.look, null), FX + Math.round(fdx), GY, { time: this.t + 0.3, flip: true, s, tint: white ? '#ffffff' : null });
        } else {
          const cv = DT.P.spriteCanvas(DT.P.SPR[fo.spr], fo.pal, { white });
          const bob = fo.dead ? 0 : Math.round(Math.sin(this.t * 4) * 1);
          lc.drawImage(cv, Math.round(FX - 8 * s + fdx), GY - 16 * s + 1 + bob, 16 * s, 16 * s);
        }
        lc.globalAlpha = 1;
        if (fo.shield > 0) { lc.strokeStyle = 'rgba(115,239,247,0.8)'; lc.strokeRect(FX - 9 * s, GY - 17 * s, 18 * s, 18 * s); }
        if (fo.stun > 0 && !fo.dead) { for (let k = 0; k < 3; k++) { const a = this.t * 5 + k * 2.1; lc.fillStyle = '#ffcd75'; lc.fillRect(Math.round(FX + Math.cos(a) * 6), Math.round(GY - 16 * s - 3 + Math.sin(a) * 2), 1, 1); } }
      }
    }
    // particules
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.vy += 80 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      lc.fillStyle = p.c; lc.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    lc.restore();
    st.present();
    // textes nets
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.life -= dt; n.y -= dt * 14;
      if (n.life <= 0) { this.nums.splice(i, 1); continue; }
      st.ctx.globalAlpha = Math.min(1, n.life * 3);
      st.text(n.text, n.x, n.y, { color: n.c, size: n.size });
      st.ctx.globalAlpha = 1;
    }
    if (this.banner && this.t < this.banner.until) st.text(this.banner.text, W / 2, 14, { color: this.banner.c, size: 5, bg: 'rgba(26,28,44,0.8)' });
  };

  DT.BT = { Fight, makeFoe, heroCfg, View, abColor };
})(window.DT);
