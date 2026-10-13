'use strict';
// Donjons & Tractions — utilitaires partagés (format, hasard, dates, DOM)
window.DT = window.DT || {};
(function (DT) {
  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

  function fmt(n) {
    if (n == null || isNaN(n)) return '0';
    if (!isFinite(n)) return '∞';
    const neg = n < 0;
    n = Math.abs(n);
    let s;
    if (n < 1000) {
      s = n < 10 && n % 1 !== 0 ? (Math.floor(n * 10) / 10).toFixed(1).replace(/\.0$/, '') : Math.floor(n).toString();
    } else {
      let e = Math.floor(Math.log10(n) / 3);
      let v = n / Math.pow(1000, e);
      if (v >= 999.95) { e++; v = v / 1000; }
      if (e < SUF.length) {
        const t = v >= 100 ? Math.floor(v).toString() : v >= 10 ? (Math.floor(v * 10) / 10).toFixed(1) : (Math.floor(v * 100) / 100).toFixed(2);
        s = t + SUF[e];
      } else s = n.toExponential(2).replace('+', '');
    }
    return (neg ? '-' : '') + s;
  }
  const fmtInt = (n) => Math.floor(n).toLocaleString('fr-FR');
  const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';

  function timeFmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + 'h' + String(m).padStart(2, '0');
    if (m > 0) return m + 'm' + String(s).padStart(2, '0');
    return s + 's';
  }
  function clockFmt(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function weighted(list, r = Math.random) {
    // list: [[value, weight], ...]
    let tot = 0;
    for (const [, w] of list) tot += w;
    let x = r() * tot;
    for (const [v, w] of list) { if ((x -= w) <= 0) return v; }
    return list[list.length - 1][0];
  }
  function shuffle(arr, r = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Jours « locaux » depuis l'epoch : la journée change à minuit chez le joueur
  function dayIndex(t = Date.now()) {
    const d = new Date(t);
    return Math.floor((t - d.getTimezoneOffset() * 60000) / 86400000);
  }
  // Semaine commençant le lundi (le 1er janvier 1970 était un jeudi)
  const weekIndex = (t = Date.now()) => Math.floor((dayIndex(t) + 3) / 7);
  function dayLabel(di) {
    const d = new Date(di * 86400000);
    return ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][d.getUTCDay()];
  }
  function nextWeekStart() {
    const di = dayIndex();
    const next = (weekIndex() + 1) * 7 - 3; // premier jour (lundi) de la semaine suivante
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    return (next - di - 1) * 86400 + msToMidnight / 1000;
  }
  function secToMidnight() {
    const now = new Date();
    return (new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()) / 1000;
  }

  let uidN = 0;
  const uid = () => Date.now().toString(36) + (uidN++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);

  // Mini-constructeur DOM : h('div', {class:'x', on:{click}}, 'texte', enfant)
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'on') { for (const ev in v) el.addEventListener(ev, v[ev]); }
        else if (k === 'style') { if (typeof v === 'string') el.style.cssText = v; else for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
        else if (k === 'data') { for (const d in v) el.dataset[d] = v[d]; }
        else if (k in el && k !== 'list' && k !== 'type' && k !== 'for') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.appendChild(typeof kid === 'object' ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  // Bus d'événements minimal
  const listeners = {};
  const E = {
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => E.off(ev, fn); },
    off(ev, fn) { const l = listeners[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
    emit(ev, data) { const l = listeners[ev]; if (l) for (const fn of l.slice()) { try { fn(data); } catch (e) { console.error(e); } } },
    reset() { for (const k in listeners) delete listeners[k]; },
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* stockage bloqué */ } },
  };

  function vibrate(p) {
    if (!DT.S || !DT.S.settings || !DT.S.settings.vibe) return;
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* refusé */ }
  }

  DT.U = { fmt, fmtInt, pct, timeFmt, clockFmt, clamp, lerp, rand, randInt, pick, rng, hash, weighted, shuffle, dayIndex, weekIndex, dayLabel, nextWeekStart, secToMidnight, uid, h, $, $$, clear, store, vibrate };
  DT.E = E;
})(window.DT);
