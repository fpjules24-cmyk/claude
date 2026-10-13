'use strict';
// Donjons & Tractions — quêtes, succès, classement, renaissance, guide, réglages
(function (DT) {
  const U = DT.U, D = DT.D, C = DT.C, h = U.h, UI = DT.UI;
  const SOC = {};

  // ---------- Quêtes ----------
  SOC.quests = function () {
    const S = DT.S;
    UI.sheet({ title: 'Quêtes du jour', body: (el) => {
      const draw = () => {
        U.clear(el).append(h('p', { class: 'muted', text: 'Nouvelles quêtes dans ' + U.timeFmt(U.secToMidnight()) + '. Les quêtes « IRL » se valident en enregistrant tes vrais exercices.' }));
        S.daily.q.forEach((id) => {
          const q = D.QUESTS.find((x) => x.id === id);
          if (!q) return;
          const pr = DT.G.questProgress(q), done = pr >= q.n, got = S.daily.got.includes(id);
          el.append(h('div', { class: 'quest' + (got ? ' got' : done ? ' done' : '') },
            h('div', { class: 'grow' }, h('b', {}, q.irl ? h('i', { class: 'irl', text: 'IRL' }) : null, ' ' + q.txt),
              UI.bar(pr / q.n), h('small', { text: (Math.floor(pr * 10) / 10) + ' / ' + q.n + ' · ' + q.gems + ' éclats + pièces + 3 énergie' })),
            got ? h('i', { class: 'tag', text: 'FAIT' }) : done ? UI.btn('Prendre', () => {
              const r = DT.G.claimQuest(id);
              if (r) { DT.A.play('coin'); UI.toast('+' + U.fmt(r.coins) + ' pièces · +' + r.gems + ' éclats', 'good'); draw(); }
            }, { cls: 'gold sm' }) : (q.irl ? UI.btn('Go', () => { UI.closeSheet(); UI.go('sport'); }, { cls: 'ghost sm' }) : null)));
        });
        const all = S.daily.q.every((id) => S.daily.got.includes(id));
        el.append(h('div', { class: 'card center' }, h('b', { text: 'Bonus : les 3 quêtes = Coffre en Fer' }),
          S.daily.all ? h('p', { class: 'muted', text: 'Coffre récupéré. À demain !' }) : UI.btn('Prendre le coffre', () => { const ch = DT.G.claimAllBonus(); if (ch) { UI.rewards('Quêtes terminées !', { chests: [ch] }); draw(); } }, { cls: 'gold', disabled: !all })));
      };
      draw();
    } });
  };

  // ---------- Succès ----------
  SOC.achievements = function () {
    const S = DT.S;
    UI.sheet({ title: 'Succès ' + Object.keys(S.ach).length + '/' + D.ACHS.length, body: (el) => {
      const list = h('div', { class: 'achlist' });
      D.ACHS.slice().sort((a, b) => (!!S.ach[b.id] - !!S.ach[a.id])).forEach((a) => {
        let v = 0; try { v = a.v(S); } catch (e) { v = 0; }
        const got = !!S.ach[a.id];
        list.append(h('div', { class: 'ach' + (got ? ' got' : '') }, UI.icon(got ? 'trophy' : 'lock', 'big'),
          h('div', { class: 'grow' }, h('b', { text: a.n }), h('small', { text: a.d }), got ? null : UI.bar(v / a.n2)),
          h('small', { class: 'gem-t', text: '+' + a.gems })));
      });
      el.append(list);
    } });
  };

  // ---------- Classement ----------
  const CATS = [['power', 'Puissance'], ['lvl', 'Niveau'], ['skills', 'Skills'], ['rv', 'Effort']];
  function botBoard() {
    const days = Math.max(0, (Date.now() - Date.UTC(2026, 0, 1)) / 86400000);
    const g = Math.min(1.6, 0.6 + days / 300);
    const r = U.rng(424242);
    return D.BOTS.map((n, i) => {
      const f = Math.pow((i + r()) / D.BOTS.length, 0.9);
      const jit = 0.85 + r() * 0.3;
      return {
        nick: n,
        power: Math.round(60 * Math.exp(f * 7.5) * g * jit),
        lvl: 1 + Math.floor(Math.pow(f, 1.5) * 45 * g * jit),
        skills: Math.min(49, 1 + Math.floor(Math.pow(f, 1.2) * 47 * Math.min(1, g) * jit)),
        rv: Math.round(50 * Math.exp(f * 7) * g * jit),
      };
    });
  }
  SOC.myEntry = function () {
    const S = DT.S;
    return { nick: S.nick, power: C.power(), lvl: S.lvl, skills: Object.keys(S.skills).length, rv: Math.round(S.life.rv), me: true };
  };
  SOC.leaderboard = function () {
    let cat = 'power';
    UI.sheet({ title: 'Classement', body: (el) => {
      const draw = () => {
        const me = SOC.myEntry();
        const real = (DT.NET && DT.NET.board) ? DT.NET.board.filter((x) => !x.me).map((x) => Object.assign({ real: true }, x)) : [];
        const all = botBoard().concat(real, [me]).sort((a, b) => (b[cat] || 0) - (a[cat] || 0));
        const rank = all.findIndex((x) => x.me) + 1;
        U.clear(el).append(h('div', { class: 'seg small' }, CATS.map(([id, n]) => h('button', { type: 'button', class: cat === id ? 'on' : '', on: { click: () => { cat = id; draw(); } } }, n))),
          h('p', { class: 'center' }, 'Ton rang : ', h('b', { class: 'gold-t', text: '#' + rank }), ' sur ' + all.length),
          real.length ? h('p', { class: 'muted center', text: real.length + ' vrai(s) joueur(s) sur ce jeu, en bleu.' }) : h('p', { class: 'muted center', text: 'Partage le jeu à tes potes pour les voir apparaître ici.' }));
        const ol = h('ol', { class: 'board' });
        let last = -1;
        all.forEach((x, i) => {
          if (i >= 10 && Math.abs(i + 1 - rank) > 3 && !x.real) return;
          if (last >= 0 && i > last + 1) ol.append(h('li', { class: 'gap', 'aria-hidden': 'true', text: '…' }));
          last = i;
          ol.append(h('li', { class: (x.me ? 'me' : x.real ? 'real' : '') }, h('i', { class: 'rk', text: '#' + (i + 1) }), h('span', { text: x.nick + (x.me ? ' (toi)' : '') }), h('b', { text: U.fmtInt(x[cat] || 0) })));
        });
        el.append(ol);
      };
      draw();
    } });
  };

  // ---------- Renaissance ----------
  SOC.prestige = function () {
    const S = DT.S, g = C.auraGain();
    UI.sheet({ title: 'Renaissance', body: (el, close) => {
      el.append(h('p', { text: 'Repars de zéro côté pièces pour gagner de l\'Aura, un bonus permanent.' }),
        h('ul', { class: 'list' },
          h('li', { text: 'Chaque point d\'Aura : +2 % de production et +1 % de stats de combat, pour toujours.' }),
          h('li', { text: 'Tu perds : tes pièces et les niveaux de tes skills (ils repartent au niveau 1).' }),
          h('li', { text: 'Tu gardes : skills débloqués et certifiés, stuff, éclats, apparences, familiers, donjons, niveau d\'athlète et tout ton historique d\'entraînement.' })),
        h('div', { class: 'card' }, h('ul', { class: 'stats' },
          h('li', {}, h('span', { text: 'Aura actuelle' }), h('b', { text: S.prestige.aura })),
          h('li', {}, h('span', { text: 'Aura gagnée maintenant' }), h('b', { class: 'gold-t', text: '+' + g })),
          h('li', {}, h('span', { text: 'Pièces gagnées depuis la dernière' }), h('b', { text: U.fmt(S.prestige.run) })),
          h('li', {}, h('span', { text: 'Prochain point d\'Aura à' }), h('b', { text: U.fmt(Math.pow(g + 1, 2) * 1e7) })))),
        h('h4', { text: 'Paliers d\'Aura' }),
        h('ul', { class: 'list perks' }, [[5, 'Gains hors ligne jusqu\'à 12 h'], [15, 'Achat automatique des niveaux (dans les réglages)'], [30, '+10 énergie max'], [60, '+25 % d\'efficacité hors ligne'], [100, 'Démarre chaque Renaissance avec 1M pièces'], [200, '5e emplacement de technique']].map(([n, t]) =>
          h('li', { class: S.prestige.aura >= n ? 'ok' : '' }, h('b', { text: n + ' Aura : ' }), t))),
        UI.btn(g >= 1 ? 'Renaître (+' + g + ' Aura)' : 'Pas encore assez de pièces', async () => {
          const ok = await UI.confirm({ title: 'Confirmer la Renaissance', text: 'Tes pièces et niveaux de skills repartent à zéro. +' + g + ' Aura.', ok: 'Renaître', danger: true });
          if (ok) { const gain = DT.G.prestige(); if (gain) { close(); DT.A.play('lvl'); UI.rewards('Renaissance !', { text: '+' + gain + ' Aura. Ta production est boostée de ' + (S.prestige.aura * 2) + ' % au total.', sound: 'skill' }); } }
        }, { cls: 'gold wide', disabled: g < 1 }));
    } });
  };

  // ---------- Guide ----------
  SOC.howto = function () {
    UI.sheet({ title: 'Comment jouer', body: (el) => {
      const sec = (t, ...p) => h('div', { class: 'howto' }, h('h4', { text: t }), ...p.map((x) => h('p', { text: x })));
      el.append(
        sec('Le principe', 'Ton héros progresse quand TOI tu t\'entraînes. Fais de vraies pompes, tractions, squats ou gainage, puis enregistre-les dans l\'onglet Sport.'),
        sec('Les pièces', 'Chaque rep réelle rapporte des pièces (bien plus que l\'idle), de l\'XP et de l\'énergie. Elle active aussi le PUMP : production x2 pendant quelques minutes.', 'Tes skills produisent des pièces en continu, même quand le jeu est fermé (jusqu\'à 8 h).'),
        sec('Les skills', 'Comme en vraie calisthénie : chaque skill a des prérequis et demande un volume d\'entraînement réel dans sa famille (Poussée, Tirage, Équilibre, Gainage, Jambes, Explosivité). Une fois appris, il produit des pièces : monte-le en niveau, chaque palier (10, 25, 50, 100…) double sa production.', 'Si tu réussis le skill pour de vrai, certifie-le : x3 de production et un bonus d\'éclats.'),
        sec('Les éclats', 'La deuxième monnaie, débloquée avec ton premier nouveau skill. Elle sert aux coffres, aux grimoires, aux enchantements, aux apparences, à recharger l\'énergie et à revenir d\'un K.O.'),
        sec('Ton héros et sa classe', 'De l\'autre côté du miroir, ton athlète devient un héros fantasy : Guerrier (Poussée), Assassin (Tirage), Mage (Équilibre), Paladin (Gainage), Berserker (Jambes) ou Moine (Explosivité).', 'Ta classe gagne de l\'XP quand tu fais pour de vrai les exercices de sa famille, quand tu montes les skills correspondants et en donjon. Chaque niveau donne un point pour apprendre ou renforcer une capacité (rang 5 max). Tu peux changer de classe quand tu veux : chacune garde sa progression.'),
        sec('Combats au tour par tour', 'L\'ordre des tours dépend de la vitesse. À ton tour : Attaque (+mana), une de tes 4 capacités (mana + recharge), Garde (-50 % de dégâts) ou Potion. Tape un ennemi pour le cibler.', 'Quand un ennemi CHARGE, étourdis-le (ça l\'interrompt) ou mets-toi en garde. Le mode Auto joue à ta place.'),
        sec('Donjons à 30 paliers', 'Une expédition = jusqu\'à 10 paliers (énergie). Gardien aux paliers 10 et 20, boss au 30. Tous les 10 paliers : un coffre plus rare que la normale. Tu peux repartir des paliers 11 et 21 une fois atteints.', 'Palier 30 en Normal : apparence + arme unique. Héroïque : un familier. Légende : objet Mythique et le Chevalier Dragon.'),
        sec('Coffres', '6 niveaux : Bois, Fer, Doré, Diamant, Mythique, Cosmique. Améliore un coffre avec des éclats et des pièces, ou fusionne 3 coffres identiques en un meilleur. Les plus beaux cachent des apparences exclusives.'),
        sec('Marché et échanges', 'Chaque objet a une valeur. À l\'Armurerie, essaie et achète du vrai matos pour ta classe. Chez les marchands, paie avec tes objets : la cote change chaque jour et chacun a ses goûts. Grimoires : de nouvelles capacités pour toutes les classes. Enchantement : grave une capacité sur une arme ou un accessoire (Rare ou mieux).', 'Potes : envoie un objet à un ami sous forme de code à usage unique.'),
        sec('Séances guidées', 'Le coach génère une séance complète adaptée à ton niveau, avec chrono et temps de repos. À la fin : gros bonus, coffre en Fer (Doré pour 45 min), +10 énergie et PUMP 1 h.'),
        sec('Série', 'Chaque jour avec 20 points d\'effort prolonge ta série : +5 % par jour sur tes gains d\'exos (max +50 %). Un jour de repos est toléré : ta série ne casse qu\'après 2 jours sans sport.'),
        sec('Sauvegarde', 'Ta partie est enregistrée sur cet appareil' + (DT.NET && DT.NET.cloud ? ' et dans le cloud (synchronisée entre ton téléphone et ton ordinateur).' : '.') + ' Tu peux aussi exporter un code de sauvegarde dans les réglages.'),
        h('p', { class: 'muted', text: 'Écoute ton corps : échauffe-toi, progresse doucement, et consulte un professionnel en cas de douleur.' }));
    } });
  };

  // ---------- Réglages ----------
  const SET = { tabbed: false };
  SET.open = function () {
    const S = DT.S;
    UI.sheet({ title: 'Réglages', body: (el) => {
      const draw = () => {
        const tog = (label, key, after) => h('label', { class: 'toggle' }, h('span', { text: label }),
          h('input', { type: 'checkbox', id: 'set_' + key, checked: !!S.settings[key], on: { change: (e) => { S.settings[key] = e.target.checked; after && after(); } } }));
        U.clear(el).append(
          h('div', { class: 'card' },
            tog('Effets sonores', 'sound', () => { if (!S.settings.sound) DT.A.musicOn(false); }),
            tog('Musique 8-bit', 'music', () => DT.A.musicOn(S.settings.music)),
            tog('Vibrations', 'vibe'),
            S.prestige.aura >= 15 ? tog('Achat automatique des niveaux', 'autobuy') : null),
          h('div', { class: 'card' }, h('b', { text: 'Profil' }), h('p', { text: 'Pseudo : ' + S.nick }), UI.btn('Changer de pseudo', () => SET.nick(), { cls: 'ghost sm' })),
          h('div', { class: 'card' }, h('b', { text: 'Sauvegarde' }),
            h('p', { class: 'muted', text: DT.NET && DT.NET.cloud ? 'Sauvegarde cloud active : ta partie suit ton compte entre téléphone et ordinateur.' : 'Ta partie est enregistrée sur cet appareil. Exporte un code pour la transférer ou la mettre à l\'abri.' }),
            h('div', { class: 'row gap' }, UI.btn('Exporter', () => exportSave(), { cls: 'ghost sm' }), UI.btn('Importer', () => importSave(), { cls: 'ghost sm' }), UI.btn('Sauver maintenant', () => { DT.SAVE.save(); DT.NET && DT.NET.saveCloud && DT.NET.saveCloud(true); UI.toast('Sauvegardé', 'good'); }, { cls: 'ghost sm' }))),
          h('div', { class: 'card' }, h('b', { text: 'Zone dangereuse' }), UI.btn('Recommencer à zéro', async () => {
            const ok = await UI.confirm({ title: 'Tout effacer ?', text: 'Ta partie sera remplacée par une nouvelle. Exporte d\'abord ta sauvegarde si tu veux pouvoir revenir en arrière.', ok: 'Tout effacer', danger: true });
            if (ok) { DT.SAVE.reset(); location.reload(); }
          }, { cls: 'danger sm' })),
          h('p', { class: 'muted center', text: 'Donjons & Tractions · v2.0 · fait avec des pompes et du code' }));
      };
      draw();
    } });
  };
  function exportSave() {
    const code = DT.SAVE.exportCode();
    UI.sheet({ title: 'Code de sauvegarde', body: (el) => {
      const ta = h('textarea', { id: 'exportCode', readonly: true, rows: 6, class: 'code' });
      ta.value = code;
      el.append(h('p', { class: 'muted', text: 'Garde ce code en lieu sûr (notes, message à toi-même). Il contient toute ta partie.' }), ta,
        UI.btn('Copier', () => {
          try { navigator.clipboard.writeText(code).then(() => UI.toast('Copié !', 'good'), () => { ta.select(); UI.toast('Sélectionné : copie-le à la main.', ''); }); }
          catch (e) { ta.select(); UI.toast('Sélectionné : copie-le à la main.', ''); }
        }, { cls: 'go wide' }));
    } });
  }
  function importSave() {
    UI.sheet({ title: 'Importer une sauvegarde', body: (el, close) => {
      const ta = h('textarea', { id: 'importCode', rows: 6, class: 'code', placeholder: 'Colle ton code ici' });
      el.append(h('p', { class: 'muted', text: 'Attention : la partie actuelle sera remplacée.' }), ta,
        UI.btn('Importer', () => {
          if (DT.SAVE.importCode(ta.value)) { close(); UI.toast('Sauvegarde importée !', 'good'); setTimeout(() => location.reload(), 600); }
          else UI.toast('Code invalide. Vérifie qu\'il est complet.', 'bad');
        }, { cls: 'go wide' }));
    } });
  }
  SET.nick = function () {
    const S = DT.S;
    UI.sheet({ title: 'Ton pseudo', body: (el, close) => {
      const inp = h('input', { id: 'nickInput', type: 'text', maxlength: 16, value: S.nick, autocomplete: 'off' });
      el.append(inp, UI.btn('Valider', () => {
        const v = inp.value.replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16);
        if (v.length < 2) { UI.toast('2 caractères minimum.', 'bad'); return; }
        S.nick = v; DT.E.emit('look'); close(); UI.toast('Salut ' + v + ' !', 'good');
      }, { cls: 'go wide' }));
      setTimeout(() => inp.focus(), 50);
    } });
  };
  SET.profile = function () {
    const S = DT.S, cats = C.cats();
    UI.sheet({ title: S.nick, body: (el) => {
      el.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('b', { text: 'Niveau d\'athlète ' + S.lvl }), h('small', { text: U.fmt(S.xp) + ' / ' + U.fmt(C.xpNeed(S.lvl)) + ' XP' })), UI.bar(S.xp / C.xpNeed(S.lvl), 'xp'),
        h('p', { class: 'muted', text: 'L\'XP ne vient que de tes vrais exercices : ton niveau d\'athlète, c\'est ton vrai niveau.' })),
        h('ul', { class: 'stats' },
          h('li', {}, h('span', { text: 'Force' }), h('b', { text: cats.FOR })), h('li', {}, h('span', { text: 'Endurance' }), h('b', { text: cats.END })),
          h('li', {}, h('span', { text: 'Gainage' }), h('b', { text: cats.GAI })), h('li', {}, h('span', { text: 'Agilité' }), h('b', { text: cats.AGI })),
          h('li', {}, h('span', { text: 'Points d\'effort au total' }), h('b', { text: U.fmtInt(S.life.rv) })),
          h('li', {}, h('span', { text: 'Pièces gagnées au total' }), h('b', { text: U.fmt(S.life.earned) })),
          h('li', {}, h('span', { text: 'Boss vaincus' }), h('b', { text: S.life.bosses })),
          h('li', {}, h('span', { text: 'Aura' }), h('b', { text: S.prestige.aura })),
          h('li', {}, h('span', { text: 'Temps de jeu' }), h('b', { text: U.timeFmt(S.life.playSec) }))));
    } });
  };

  // ---------- Bienvenue ----------
  SET.onboard = function (done) {
    const S = DT.S;
    UI.sheet({ title: 'Donjons & Tractions', cls: 'onboard', modal: true, body: (el, close) => {
      const anim = DT.PoseAnim('muscleup', { w: 72, h: 56, wcls: 'big' });
      const inp = h('input', { id: 'obNick', type: 'text', maxlength: 16, placeholder: 'Ton pseudo', autocomplete: 'off' });
      const sw = (list, key) => h('div', { class: 'swatches' }, list.map((c) => h('button', { type: 'button', class: 'sw' + (S.look[key] === c ? ' on' : ''), style: { background: c }, 'aria-label': c, on: { click: (e) => { S.look[key] = c; e.currentTarget.parentElement.querySelectorAll('.sw').forEach((x) => x.classList.remove('on')); e.currentTarget.classList.add('on'); } } })));
      el.append(anim.el,
        h('p', { class: 'lead center', text: 'Le jeu idle où ton héros devient plus fort quand TOI tu t\'entraînes.' }),
        h('ol', { class: 'steps' },
          h('li', { text: 'Fais de vrais exercices et enregistre-les : pièces, XP, énergie.' }),
          h('li', { text: 'Débloque les skills de calisthénie : ils produisent des pièces en continu.' }),
          h('li', { text: 'Choisis ta classe de héros, équipe-toi et grimpe les donjons au tour par tour.' })),
        h('label', { class: 'lbl', for: 'obNick', text: 'TON PSEUDO' }), inp,
        h('span', { class: 'lbl', text: 'PEAU' }), sw(D.SKIN_TONES, 'skin'),
        h('span', { class: 'lbl', text: 'CHEVEUX' }), sw(D.HAIR_COLORS, 'hair'),
        UI.btn('C\'est parti !', () => {
          const v = inp.value.replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16);
          S.nick = v.length >= 2 ? v : 'Athlète';
          S.started = true;
          anim.stop();
          close();
          DT.A.init();
          DT.A.play('skill');
          done && done();
        }, { cls: 'gold wide big' }));
    } });
  };
  SET.firstMission = function () {
    UI.sheet({ title: 'Première mission', body: (el, close) => {
      el.append(h('p', { class: 'lead', text: 'Fais 10 pompes pour de vrai (sur les genoux si besoin), puis enregistre-les.' }),
        h('p', { class: 'muted', text: 'Tu vas voir tes pièces décoller. Ensuite, achète des niveaux de Pompes dans l\'onglet Skills.' }),
        UI.btn('J\'enregistre mes pompes', () => { close(); UI.go('sport'); DT.logger('pushup'); }, { cls: 'gold wide big' }),
        UI.btn('Plus tard', close, { cls: 'ghost wide' }));
    } });
  };

  DT.SCR.social = SOC;
  DT.SCR.settings = SET;
})(window.DT);
