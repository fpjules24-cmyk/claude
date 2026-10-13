'use strict';
// Donjons & Tractions v3 — l'Index : encyclopédie du jeu (équipement, grimoire…), chaque module y inscrit son onglet
(function (DT) {
  const U = DT.U, h = U.h;
  const CODEX = { tabs: [] };
  // t : { id, n, order, render(el), count() -> [trouvés, total] }
  CODEX.register = function (t) {
    CODEX.tabs = CODEX.tabs.filter((x) => x.id !== t.id).concat([t]).sort((a, b) => (a.order || 0) - (b.order || 0));
  };
  CODEX.open = function (id) {
    const UI = DT.UI;
    if (!CODEX.tabs.length) { UI.toast('L\'Index arrive bientôt.', ''); return; }
    let cur = id && CODEX.tabs.find((t) => t.id === id) ? id : CODEX.tabs[0].id;
    UI.sheet({ title: 'Index', cls: 'codex', body: (el) => {
      const seg = h('div', { class: 'seg', role: 'tablist' });
      const body = h('div', { class: 'codex-body' });
      const draw = () => {
        U.clear(seg).append(...CODEX.tabs.map((t) => {
          const c = t.count ? t.count() : null;
          return h('button', { type: 'button', role: 'tab', class: cur === t.id ? 'on' : '', 'aria-selected': cur === t.id ? 'true' : 'false', on: { click: () => { cur = t.id; draw(); } } }, t.n + (c ? ' ' + c[0] + '/' + c[1] : ''));
        }));
        U.clear(body);
        const t = CODEX.tabs.find((x) => x.id === cur);
        if (t) t.render(body);
      };
      el.append(seg, body);
      draw();
    } });
  };
  DT.CODEX = CODEX;
})(window.DT);
