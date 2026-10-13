'use strict';
// Donjons & Tractions — contenu du jeu : exercices, skills, stuff, donjons, quêtes, succès
(function (DT) {
  // ---------- Branches de l'arbre de skills ----------
  const BRANCHES = {
    push: { n: "Poussée", c: "#ef7d57", stat: "atk", sn: "ATK" },
    pull: { n: "Tirage", c: "#41a6f6", stat: "atk", sn: "ATK" },
    skill: { n: "Équilibre", c: "#ffcd75", stat: "crit", sn: "CRIT" },
    core: { n: "Gainage", c: "#a7f070", stat: "def", sn: "DEF" },
    legs: { n: "Jambes", c: "#e0667a", stat: "hp", sn: "PV" },
    cardio: { n: "Explosivité", c: "#73eff7", stat: "spd", sn: "VIT" },
  };
  const BR_ORDER = ["push", "pull", "skill", "core", "legs", "cardio"];

  // ---------- Exercices réels (points d'effort = PE par rep ou par seconde) ----------
  // cat : branche alimentée ; unit : reps | sec ; rv : points d'effort par unité
  const EXOS = [
    { id: "pushup", n: "Pompes", unit: "reps", rv: 1, cat: "push", pose: "pushup", max: 300, tip: "Mains largeur d'épaules, corps gainé de la tête aux talons. La poitrine frôle le sol." },
    { id: "diamond", n: "Pompes diamant", unit: "reps", rv: 1.3, cat: "push", pose: "pushup", max: 200, tip: "Pouces et index forment un losange sous la poitrine : les triceps travaillent fort." },
    { id: "archer", n: "Pompes archer", unit: "reps", rv: 2.5, cat: "push", pose: "pushup", max: 100, tip: "Un bras plie, l'autre reste tendu sur le côté. Compte chaque côté." },
    { id: "dips", n: "Dips", unit: "reps", rv: 2, cat: "push", pose: "dips", max: 150, tip: "Aux barres parallèles ou entre deux chaises solides. Descends épaules sous les coudes." },
    { id: "hspu", n: "Pompes en équilibre", unit: "reps", rv: 6, cat: "skill", pose: "hspu", max: 60, tip: "En poirier (contre un mur au début), la tête descend jusqu'au sol puis tu pousses." },
    { id: "pike", n: "Pompes pike", unit: "reps", rv: 1.5, cat: "skill", pose: "pike", max: 150, tip: "Fesses en l'air, corps en V inversé. La tête descend entre les mains." },
    { id: "austrow", n: "Tractions australiennes", unit: "reps", rv: 1.2, cat: "pull", pose: "austrow", max: 200, tip: "Sous une barre basse ou une table solide. Corps droit, poitrine vers la barre." },
    { id: "pullup", n: "Tractions", unit: "reps", rv: 3, cat: "pull", pose: "pullup", max: 100, tip: "Départ bras tendus, menton au-dessus de la barre. Pas d'élan." },
    { id: "muscleup", n: "Muscle-ups", unit: "reps", rv: 6, cat: "pull", pose: "muscleup", max: 50, tip: "Traction explosive, transition des poignets, puis dip au-dessus de la barre." },
    { id: "deadhang", n: "Suspension", unit: "sec", rv: 0.2, cat: "pull", pose: "hang", max: 300, tip: "Suspendu à la barre, épaules engagées. Excellent pour la poigne." },
    { id: "flhold", n: "Front lever (maintien)", unit: "sec", rv: 1.2, cat: "pull", pose: "tuckfl", max: 120, tip: "Version groupée, une jambe tendue ou complète : compte le temps tenu." },
    { id: "squat", n: "Squats", unit: "reps", rv: 0.6, cat: "legs", pose: "squat", max: 500, tip: "Pieds largeur de hanches, dos droit, cuisses au moins parallèles au sol." },
    { id: "lunge", n: "Fentes", unit: "reps", rv: 0.7, cat: "legs", pose: "lunge", max: 300, tip: "Grand pas, genou arrière frôle le sol. Compte chaque jambe." },
    { id: "jumpsquat", n: "Squats sautés", unit: "reps", rv: 1, cat: "legs", pose: "squat", max: 300, tip: "Squat puis saut explosif. Réception souple." },
    { id: "pistol", n: "Pistol squats", unit: "reps", rv: 3, cat: "legs", pose: "pistol", max: 100, tip: "Sur une jambe, l'autre tendue devant. Tiens un support au début." },
    { id: "nordic", n: "Nordic curls", unit: "reps", rv: 2, cat: "legs", pose: "nordic", max: 80, tip: "À genoux, chevilles bloquées, descends le buste droit le plus lentement possible." },
    { id: "plank", n: "Gainage", unit: "sec", rv: 0.2, cat: "core", pose: "plank", max: 900, tip: "Sur les avant-bras, bassin aligné. Serre fessiers et abdos." },
    { id: "hollow", n: "Hollow body", unit: "sec", rv: 0.3, cat: "core", pose: "hollow", max: 600, tip: "Sur le dos, bas du dos plaqué au sol, bras et jambes décollés en banane." },
    { id: "legraise", n: "Relevés de jambes", unit: "reps", rv: 1, cat: "core", pose: "legraise", max: 200, tip: "Au sol ou suspendu, jambes tendues, sans balancer." },
    { id: "lsit", n: "L-sit", unit: "sec", rv: 1, cat: "core", pose: "lsit", max: 180, tip: "Mains au sol ou sur parallettes, jambes tendues à l'horizontale." },
    { id: "hshold", n: "Poirier (maintien)", unit: "sec", rv: 0.5, cat: "skill", pose: "handstand", max: 300, tip: "Contre un mur ou libre. Corps gainé, poussée active dans les épaules." },
    { id: "lean", n: "Planche lean", unit: "sec", rv: 0.6, cat: "skill", pose: "lean", max: 180, tip: "Position de pompe, bascule les épaules loin devant les mains, bras tendus." },
    { id: "burpee", n: "Burpees", unit: "reps", rv: 1.5, cat: "cardio", pose: "burpee", max: 200, tip: "Squat, planche, pompe, retour, saut. Le roi du cardio." },
    { id: "mclimb", n: "Mountain climbers", unit: "reps", rv: 0.3, cat: "cardio", pose: "mclimb", max: 500, tip: "En planche haute, ramène les genoux vers la poitrine en alternance. Compte chaque genou." },
    { id: "jjack", n: "Jumping jacks", unit: "reps", rv: 0.2, cat: "cardio", pose: "jjack", max: 500, tip: "Écarte bras et jambes en sautant. Parfait pour s'échauffer." },
    { id: "rope", n: "Corde à sauter", unit: "sec", rv: 0.15, cat: "cardio", pose: "jump", max: 1200, tip: "Petits sauts sur l'avant du pied, poignets qui tournent." },
    { id: "stretch", n: "Étirements", unit: "sec", rv: 0.05, cat: "mobility", pose: "stretch", max: 1800, tip: "Respire lentement. Ta mobilité, c'est ton assurance anti-blessure." },
  ];
  const EXO = {};
  EXOS.forEach((e) => (EXO[e.id] = e));

  // ---------- Paliers des skills (générateurs) ----------
  const TIERS = [null,
    { prod: 1, cost: 15, gems: 5, stat: 2, req: 5 },
    { prod: 8, cost: 150, gems: 10, stat: 5, req: 60 },
    { prod: 50, cost: 1.6e3, gems: 15, stat: 10, req: 300 },
    { prod: 300, cost: 2e4, gems: 25, stat: 18, req: 850 },
    { prod: 2e3, cost: 2.8e5, gems: 40, stat: 30, req: 2000 },
    { prod: 1.4e4, cost: 4e6, gems: 60, stat: 50, req: 4500 },
    { prod: 1e5, cost: 6e7, gems: 90, stat: 80, req: 8500 },
    { prod: 8e5, cost: 1e9, gems: 150, stat: 130, req: 14000 },
  ];
  const MILESTONES = [10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000];

  // ab : technique de combat débloquée. Types : dmg, multi, crit, stun, heal, shield, buff, bcrit, haste, drain, dodge
  const SKILLS = [
    // ===== POUSSÉE =====
    { id: "pushup", n: "Pompes", br: "push", t: 1, pre: [], free: true, pose: "pushup",
      ab: { n: "Pompe Explosive", ty: "dmg", p: 1.6, cd: 5 }, drill: ["pushup", 1, 10],
      irl: "10 pompes propres d'affilée", tip: "La base de tout. Gaine les fessiers, garde les coudes à 45° du corps." },
    { id: "diamond", n: "Pompes diamant", br: "push", t: 2, pre: ["pushup"], pose: "pushup",
      ab: { n: "Poing de Diamant", ty: "crit", p: 1.8, cd: 7 }, drill: ["diamond", 1, 8],
      irl: "10 pompes diamant", tip: "Mains rapprochées sous le sternum. Si c'est trop dur, fais-les sur les genoux." },
    { id: "dips", n: "Dips", br: "push", t: 2, pre: ["pushup"], req: 100, pose: "dips",
      ab: { n: "Marteau des Barres", ty: "dmg", p: 2.2, cd: 7 }, drill: ["dips", 1, 8],
      irl: "10 dips complets", tip: "Épaules basses, buste légèrement penché. Descends jusqu'à 90° aux coudes." },
    { id: "archer", n: "Pompes archer", br: "push", t: 3, pre: ["diamond"], pose: "pushup",
      ab: { n: "Flèche de l'Archer", ty: "multi", n2: 3, p: 0.85, cd: 8 }, drill: ["archer", 1, 6],
      irl: "5 pompes archer de chaque côté", tip: "Transfère ton poids sur un bras, l'autre glisse tendu. Étape vers la pompe à un bras." },
    { id: "pppu", n: "Pompes pseudo-planche", br: "push", t: 3, pre: ["dips"], req: 400, pose: "lean",
      ab: { n: "Pression Pseudo", ty: "buff", v: 0.3, d: 8, cd: 14 }, drill: ["lean", 1, 15],
      irl: "8 pompes avec les mains au niveau des hanches", tip: "Doigts vers l'extérieur, épaules projetées devant les mains. Brûle les épaules !" },
    { id: "tuckpl", n: "Tuck planche", br: "push", t: 4, pre: ["pppu"], req: 900, pose: "tuckplanche",
      ab: { n: "Boule de Canon", ty: "stun", p: 1.5, s: 2, cd: 12 }, drill: ["lean", 1.5, 10],
      irl: "Tenir 10 s en tuck planche", tip: "Genoux contre la poitrine, dos rond, bras verrouillés. Commence sur parallettes." },
    { id: "oapu", n: "Pompe à un bras", br: "push", t: 5, pre: ["archer"], req: 2000, pose: "oapushup",
      ab: { n: "Main du Destin", ty: "crit", p: 3, cd: 12 }, drill: ["archer", 1.5, 5],
      irl: "3 pompes à un bras par côté", tip: "Pieds écartés, hanches carrées face au sol. Progresse en inclinant les mains sur un banc." },
    { id: "straddlepl", n: "Straddle planche", br: "push", t: 6, pre: ["tuckpl"], req: 4500, pose: "planche",
      ab: { n: "Lévitation", ty: "dmg", p: 3.5, cd: 12 }, drill: ["lean", 3, 8],
      irl: "Tenir 5 s en straddle planche", tip: "Jambes écartées pour raccourcir le levier. Protraction des omoplates à fond." },
    { id: "fullpl", n: "Full planche", br: "push", t: 7, pre: ["straddlepl", "oapu"], req: 8500, pose: "planche",
      ab: { n: "Planche Céleste", ty: "dmg", p: 5, cd: 14 }, drill: ["lean", 4, 6],
      irl: "Tenir 3 s en full planche", tip: "Le Graal de la poussée : corps parallèle au sol, uniquement sur les mains. Des années de patience." },
    { id: "maltese", n: "Maltese", br: "push", t: 8, pre: ["fullpl"], req: 14000, pose: "maltese",
      ab: { n: "Croix de Malte", ty: "multi", n2: 5, p: 1.4, cd: 18 }, drill: ["lean", 5, 5],
      irl: "Tenir 2 s en maltese", tip: "Mains au niveau des hanches, bras écartés, corps à ras du sol. Niveau légende." },

    // ===== TIRAGE =====
    { id: "austrow", n: "Traction australienne", br: "pull", t: 1, pre: [], pose: "austrow",
      ab: { n: "Rame Sauvage", ty: "dmg", p: 1.5, cd: 5 }, drill: ["austrow", 1, 10],
      irl: "12 tractions australiennes", tip: "La porte d'entrée du tirage. Plus tes pieds avancent, plus c'est dur." },
    { id: "pullup", n: "Traction", br: "pull", t: 2, pre: ["austrow"], pose: "pullup",
      ab: { n: "Uppercut Traction", ty: "dmg", p: 2, cd: 6 }, drill: ["pullup", 1, 5],
      irl: "5 tractions strictes", tip: "Pas encore ? Fais des négatives : saute en haut et descends en 5 secondes." },
    { id: "ctb", n: "Traction poitrine-barre", br: "pull", t: 3, pre: ["pullup"], pose: "ctbpullup",
      ab: { n: "Charge Thoracique", ty: "dmg", p: 2.6, cd: 8 }, drill: ["pullup", 1.3, 5],
      irl: "5 tractions où la poitrine touche la barre", tip: "Tire les coudes vers les hanches et cambre légèrement. Prépare le muscle-up." },
    { id: "tuckfl", n: "Front lever groupé", br: "pull", t: 3, pre: ["pullup"], req: 350, pose: "tuckfl",
      ab: { n: "Levier Compact", ty: "shield", h: 0.25, d: 6, cd: 12 }, drill: ["flhold", 1, 10],
      irl: "Tenir 10 s en tuck front lever", tip: "Bras tendus, genoux contre la poitrine, dos parallèle au sol. Pousse la barre vers les hanches." },
    { id: "muscleup", n: "Muscle-up", br: "pull", t: 4, pre: ["ctb"], req: 900, pose: "muscleup",
      ab: { n: "Muscle-up Météore", ty: "stun", p: 2.2, s: 1.5, cd: 12 }, drill: ["pullup", 1.5, 4],
      irl: "1 muscle-up propre sans kipping", tip: "Tire haut et vers l'arrière, puis bascule vite les poignets au-dessus de la barre." },
    { id: "archerpu", n: "Traction archer", br: "pull", t: 4, pre: ["ctb"], req: 1000, pose: "pullup",
      ab: { n: "Tir Double", ty: "multi", n2: 2, p: 1.4, cd: 8 }, drill: ["pullup", 2, 3],
      irl: "3 tractions archer de chaque côté", tip: "Un bras tire, l'autre reste tendu sur la barre. Étape vers la traction à un bras." },
    { id: "backlever", n: "Back lever", br: "pull", t: 5, pre: ["tuckfl"], req: 2000, pose: "backlever",
      ab: { n: "Retournement", ty: "drain", p: 2.5, h: 0.4, cd: 12 }, drill: ["flhold", 1.3, 8],
      irl: "Tenir 5 s en back lever", tip: "Face au sol, sous la barre. Attention aux biceps : progresse doucement." },
    { id: "straddlefl", n: "Front lever écarté", br: "pull", t: 6, pre: ["backlever"], req: 4500, pose: "frontlever",
      ab: { n: "Levier Écarté", ty: "dmg", p: 3.5, cd: 12 }, drill: ["flhold", 2, 6],
      irl: "Tenir 5 s en straddle front lever", tip: "Jambes écartées, bassin à hauteur des épaules, abdos à bloc." },
    { id: "oap", n: "Traction à un bras", br: "pull", t: 7, pre: ["archerpu", "muscleup"], req: 8500, pose: "oapullup",
      ab: { n: "Bras de Titan", ty: "crit", p: 5, cd: 15 }, drill: ["pullup", 3, 2],
      irl: "1 traction à un bras par côté", tip: "Force brute et tendons d'acier. Commence par des négatives à un bras." },
    { id: "fullfl", n: "Full front lever", br: "pull", t: 8, pre: ["straddlefl"], req: 14000, pose: "frontlever",
      ab: { n: "Lévitation Horizontale", ty: "multi", n2: 4, p: 1.6, cd: 16 }, drill: ["flhold", 3, 5],
      irl: "Tenir 5 s en full front lever", tip: "Corps tendu à l'horizontale sous la barre. Un des plus beaux skills." },

    // ===== ÉQUILIBRE =====
    { id: "crow", n: "Corbeau", br: "skill", t: 1, pre: [], pose: "crow",
      ab: { n: "Envol du Corbeau", ty: "dodge", n2: 2, cd: 10 }, drill: ["hshold", 0.8, 20],
      irl: "Tenir 10 s en corbeau", tip: "Genoux posés sur les triceps, regard devant, bascule doucement en avant." },
    { id: "wallhs", n: "Poirier au mur", br: "skill", t: 2, pre: ["crow"], pose: "wallhs",
      ab: { n: "Monde à l'Envers", ty: "crit", p: 1.6, cd: 6 }, drill: ["hshold", 1, 30],
      irl: "Tenir 30 s en poirier dos au mur", tip: "Monte en marchant les pieds au mur, ventre face au mur pour un alignement parfait." },
    { id: "pike", n: "Pompes pike", br: "skill", t: 2, pre: ["crow"], req: 80, pose: "pike",
      ab: { n: "Pique Plongeante", ty: "dmg", p: 2, cd: 6 }, drill: ["pike", 1, 8],
      irl: "10 pompes pike", tip: "Monte les pieds sur une chaise pour augmenter la difficulté. Prépare les HSPU." },
    { id: "freehs", n: "Équilibre libre", br: "skill", t: 3, pre: ["wallhs"], pose: "handstand",
      ab: { n: "Équilibre Parfait", ty: "bcrit", v: 0.3, d: 8, cd: 14 }, drill: ["hshold", 1.2, 20],
      irl: "Tenir 10 s en poirier sans mur", tip: "Corrige avec les doigts, pas avec les bras. Apprends aussi à sortir en roulade." },
    { id: "hspu", n: "Pompe en équilibre", br: "skill", t: 5, pre: ["freehs", "pike"], req: 1500, pose: "hspu",
      ab: { n: "Presse Céleste", ty: "dmg", p: 3, cd: 10 }, drill: ["hspu", 1, 3],
      irl: "3 HSPU contre le mur", tip: "Tête en triangle avec les mains. Commence avec des négatives contrôlées." },
    { id: "press", n: "Press au poirier", br: "skill", t: 6, pre: ["hspu"], req: 3500, pose: "press",
      ab: { n: "Ascension", ty: "heal", h: 0.35, cd: 16 }, drill: ["hshold", 2, 15],
      irl: "1 press to handstand", tip: "Des pieds au poirier sans élan, jambes écartées. Compression et souplesse." },
    { id: "ninety", n: "Pompe à 90°", br: "skill", t: 7, pre: ["press"], req: 7000, pose: "ninety",
      ab: { n: "Angle Droit", ty: "crit", p: 5.5, cd: 15 }, drill: ["hspu", 2, 2],
      irl: "1 pompe 90° (du poirier à la planche à 90°)", tip: "Du poirier, descends jusqu'à une planche coudes pliés, puis remonte." },
    { id: "oah", n: "Équilibre à un bras", br: "skill", t: 8, pre: ["ninety"], req: 12000, pose: "oahs",
      ab: { n: "Main Unique", ty: "multi", n2: 6, p: 1.2, cd: 18 }, drill: ["hshold", 3, 10],
      irl: "Tenir 3 s en équilibre sur un bras", tip: "Des milliers d'heures. Shift du poids progressif, jambes en straddle." },

    // ===== GAINAGE =====
    { id: "plank", n: "Gainage", br: "core", t: 1, pre: [], pose: "plank",
      ab: { n: "Mur de Gainage", ty: "shield", h: 0.2, d: 6, cd: 10 }, drill: ["plank", 1, 45],
      irl: "Tenir 60 s de gainage", tip: "Avant-bras au sol, corps aligné. Qualité avant durée." },
    { id: "hollow", n: "Hollow body", br: "core", t: 2, pre: ["plank"], pose: "hollow",
      ab: { n: "Banane d'Acier", ty: "shield", h: 0.3, d: 6, cd: 12 }, drill: ["hollow", 1, 30],
      irl: "Tenir 30 s en hollow body", tip: "LA position de la gym. Lombaires collées au sol, sinon plie les genoux." },
    { id: "legraise", n: "Relevés suspendus", br: "core", t: 2, pre: ["plank"], req: 80, pose: "legraise",
      ab: { n: "Coup de Genou", ty: "dmg", p: 1.9, cd: 6 }, drill: ["legraise", 1, 10],
      irl: "10 relevés de jambes tendues suspendu", tip: "Suspendu à la barre, monte les jambes sans balancer. Les genoux pliés au début." },
    { id: "lsit", n: "L-sit", br: "core", t: 3, pre: ["hollow"], pose: "lsit",
      ab: { n: "Siège de Fer", ty: "heal", h: 0.25, cd: 14 }, drill: ["lsit", 1, 10],
      irl: "Tenir 10 s en L-sit", tip: "Pousse fort dans le sol, épaules basses. Commence une jambe pliée." },
    { id: "dragonflag", n: "Dragon flag", br: "core", t: 4, pre: ["lsit", "legraise"], req: 800, pose: "dragonflag",
      ab: { n: "Souffle du Dragon", ty: "drain", p: 2.5, h: 0.35, cd: 12 }, drill: ["legraise", 3, 5],
      irl: "5 dragon flags contrôlés", tip: "Allongé sur un banc, corps rigide de l'épaule aux pieds. Le skill de Bruce Lee." },
    { id: "vsit", n: "V-sit", br: "core", t: 5, pre: ["lsit"], req: 1800, pose: "vsit",
      ab: { n: "Forteresse en V", ty: "shield", h: 0.5, d: 6, cd: 16 }, drill: ["lsit", 1.6, 8],
      irl: "Tenir 5 s en V-sit", tip: "Comme un L-sit, mais les jambes montent vers le ciel. Compression extrême." },
    { id: "humanflag", n: "Drapeau humain", br: "core", t: 6, pre: ["dragonflag"], req: 4000, pose: "flag",
      ab: { n: "Étendard", ty: "buff", v: 0.5, d: 8, cd: 16 }, drill: ["plank", 3, 30],
      irl: "Tenir 5 s en drapeau humain", tip: "Main du haut tire, main du bas pousse. Le skill le plus photographié." },
    { id: "manna", n: "Manna", br: "core", t: 8, pre: ["vsit", "humanflag"], req: 11000, pose: "manna",
      ab: { n: "Manne Divine", ty: "heal", h: 0.6, cd: 22 }, drill: ["lsit", 3, 6],
      irl: "Tenir 2 s en manna", tip: "Le V-sit ultime : hanches passées devant les mains. Épaules et souplesse hors normes." },

    // ===== JAMBES =====
    { id: "squat", n: "Squat", br: "legs", t: 1, pre: [], pose: "squat",
      ab: { n: "Ressort", ty: "dmg", p: 1.4, cd: 4 }, drill: ["squat", 1, 20],
      irl: "30 squats complets", tip: "Ne néglige pas les jambes ! Talons au sol, genoux dans l'axe des pieds." },
    { id: "lunge", n: "Fentes sautées", br: "legs", t: 2, pre: ["squat"], pose: "lunge",
      ab: { n: "Coup de Pied Sauté", ty: "dmg", p: 2, cd: 6 }, drill: ["lunge", 1, 12],
      irl: "20 fentes sautées", tip: "Changement de jambe en l'air, réception amortie." },
    { id: "pistol", n: "Pistol squat", br: "legs", t: 3, pre: ["lunge"], pose: "pistol",
      ab: { n: "Écrasement Pistol", ty: "stun", p: 1.8, s: 1.5, cd: 11 }, drill: ["pistol", 0.6, 5],
      irl: "5 pistol squats par jambe", tip: "Commence assis sur une boîte. La mobilité de cheville fait tout." },
    { id: "shrimp", n: "Shrimp squat", br: "legs", t: 4, pre: ["pistol"], req: 900, pose: "shrimp",
      ab: { n: "Crevette Furieuse", ty: "multi", n2: 3, p: 1, cd: 9 }, drill: ["pistol", 1.2, 5],
      irl: "5 shrimp squats par jambe", tip: "Tiens ton pied derrière toi, le genou arrière touche le sol." },
    { id: "nordic", n: "Nordic curl", br: "legs", t: 5, pre: ["shrimp"], req: 2000, pose: "nordic",
      ab: { n: "Chute Contrôlée", ty: "heal", h: 0.3, cd: 14 }, drill: ["nordic", 1, 5],
      irl: "3 nordic curls complets", tip: "Le meilleur exercice anti-blessure des ischios. Freine le plus longtemps possible." },
    { id: "dragonpistol", n: "Dragon pistol", br: "legs", t: 6, pre: ["nordic"], req: 4500, pose: "pistol",
      ab: { n: "Pistolet du Dragon", ty: "crit", p: 4, cd: 13 }, drill: ["pistol", 2, 4],
      irl: "3 dragon pistols par jambe", tip: "La jambe libre passe derrière la jambe d'appui. Équilibre et mobilité de hanche." },

    // ===== EXPLOSIVITÉ =====
    { id: "burpee", n: "Burpee", br: "cardio", t: 1, pre: [], pose: "burpee",
      ab: { n: "Burpee Blitz", ty: "multi", n2: 2, p: 0.9, cd: 5 }, drill: ["burpee", 1, 10],
      irl: "20 burpees d'affilée", tip: "Sans pause entre les reps. Tu vas transpirer." },
    { id: "jumprope", n: "Double unders", br: "cardio", t: 2, pre: ["burpee"], pose: "jump",
      ab: { n: "Fouet de Corde", ty: "multi", n2: 4, p: 0.55, cd: 7 }, drill: ["rope", 1, 60],
      irl: "10 double unders d'affilée", tip: "La corde passe deux fois sous tes pieds par saut. Poignets rapides." },
    { id: "clap", n: "Pompes claquées", br: "cardio", t: 3, pre: ["jumprope"], pose: "clap",
      ab: { n: "Clap Tonnerre", ty: "stun", p: 1.5, s: 1, cd: 10 }, drill: ["pushup", 1.8, 6],
      irl: "5 pompes claquées", tip: "Pousse si fort que tes mains décollent. Réception bras souples." },
    { id: "kip", n: "Kip-up", br: "cardio", t: 4, pre: ["clap"], req: 700, pose: "kipup",
      ab: { n: "Relevé Éclair", ty: "haste", v: 0.5, d: 8, cd: 14 }, drill: ["burpee", 1.5, 6],
      irl: "1 kip-up sans les mains", tip: "Du dos aux pieds d'un coup de reins. Entraîne-toi sur un tapis." },
    { id: "superman", n: "Pompes superman", br: "cardio", t: 5, pre: ["kip"], req: 1600, pose: "superman",
      ab: { n: "Vol Plané", ty: "crit", p: 3.5, cd: 12 }, drill: ["pushup", 3, 4],
      irl: "1 pompe superman", tip: "Mains ET pieds décollent du sol. Explosivité totale." },
    { id: "backflip", n: "Salto arrière", br: "cardio", t: 6, pre: ["superman"], req: 3500, pose: "backflip",
      ab: { n: "Salto Fatal", ty: "dodge", n2: 3, cd: 14 }, drill: ["jumpsquat", 1.5, 8],
      irl: "1 salto arrière réussi (sur tapis !)", tip: "Saute vers le HAUT d'abord, puis groupe. Toujours avec une parade au début." },
    { id: "mu360", n: "Muscle-up 360", br: "cardio", t: 7, pre: ["backflip"], req: 7000, pose: "muscleup",
      ab: { n: "Tornade 360", ty: "multi", n2: 5, p: 1.3, cd: 16 }, drill: ["muscleup", 1.5, 3],
      irl: "1 muscle-up 360", tip: "Lâche la barre en haut, fais un tour complet et rattrape-la. Freestyle pur." },
  ];
  const SKILL = {};
  SKILLS.forEach((s) => { SKILL[s.id] = s; if (s.req == null) s.req = s.free ? 0 : TIERS[s.t].req; });

  // ---------- Stuff ----------
  const SLOTS = [
    { id: "weapon", n: "Arme" }, { id: "head", n: "Tête" }, { id: "top", n: "Haut" }, { id: "hands", n: "Mains" },
    { id: "legs", n: "Bas" }, { id: "feet", n: "Pieds" }, { id: "acc", n: "Accessoire" },
  ];
  const RAR = [
    { n: "Commun", c: "#94b0c2", m: 1, aff: 0, sec: 60 },
    { n: "Peu commun", c: "#38b764", m: 1.35, aff: 0, sec: 180 },
    { n: "Rare", c: "#41a6f6", m: 1.8, aff: 1, sec: 600 },
    { n: "Épique", c: "#b65cd6", m: 2.5, aff: 2, sec: 1800 },
    { n: "Légendaire", c: "#ffcd75", m: 3.5, aff: 3, sec: 5400 },
    { n: "Mythique", c: "#ff5f6d", m: 5, aff: 3, sec: 14400 },
  ];
  // Statistiques de base par emplacement, multipliées par 1.9^(ilvl/10) et la rareté
  const SLOT_STATS = {
    weapon: { atk: 6 },
    head: { hp: 22, def: 1.2 },
    top: { hp: 34, def: 2 },
    hands: { atk: 3, crit: 0.01 },
    legs: { hp: 24, def: 1.6 },
    feet: { def: 1, spd: 0.6 },
    acc: { hp: 12, atk: 1.5 },
  };
  const ITEM_NAMES = {
    weapon: [["Haltère", "dumbbell"], ["Kettlebell", "kettlebell"], ["Élastique", "whip"], ["Corde à sauter", "whip"], ["Barre de traction", "bar"], ["Bâton", "staff"], ["Disque de fonte", "plate"], ["Rouleau d'abdos", "plate"]],
    head: [["Bandeau", "head"], ["Casquette", "head"], ["Bonnet", "head"], ["Casque", "head"]],
    top: [["Débardeur", "top"], ["T-shirt", "top"], ["Sweat", "top"], ["Gilet lesté", "top"]],
    hands: [["Gants", "hands"], ["Grips", "hands"], ["Bracelets", "hands"], ["Mitaines", "hands"]],
    legs: [["Short", "legs"], ["Jogging", "legs"], ["Legging", "legs"], ["Sarouel", "legs"]],
    feet: [["Baskets", "feet"], ["Chaussures minimalistes", "feet"], ["Chaussons", "feet"], ["Bottes", "feet"]],
    acc: [["Montre cardio", "acc"], ["Gourde", "acc"], ["Médaille", "acc"], ["Chaîne", "acc"], ["Shaker", "acc"], ["Sac de magnésie", "acc"]],
  };
  const ITEM_SUFFIX = [
    ["du Débutant", "du Quartier", "de Récup", "Basique"],
    ["Solide", "du Parc", "Renforcé", "d'Entraînement"],
    ["du Gymnaste", "Affûté", "des Barres", "de Compétition"],
    ["du Champion", "Héroïque", "du Street Lord", "Runique"],
    ["du Titan", "Légendaire", "des Anciens", "du Grand Maître"],
    ["Divin", "de l'Olympe", "Cosmique", "Mythique"],
  ];
  // Affixes bonus (valeur par point de rareté)
  const AFFIXES = [
    { k: "prod", n: "pièces/s", v: 0.04, pct: true },
    { k: "rep", n: "pièces par rep", v: 0.05, pct: true },
    { k: "atkp", n: "ATK", v: 0.03, pct: true },
    { k: "hpp", n: "PV", v: 0.04, pct: true },
    { k: "defp", n: "DEF", v: 0.03, pct: true },
    { k: "crit", n: "chance de critique", v: 0.012, pct: true },
    { k: "cdmg", n: "dégâts critiques", v: 0.06, pct: true },
    { k: "xp", n: "XP", v: 0.04, pct: true },
    { k: "loot", n: "pièces en donjon", v: 0.06, pct: true },
  ];
  const STAT_NAMES = { atk: "ATK", hp: "PV", def: "DEF", spd: "VIT", crit: "CRIT", cdmg: "DÉG. CRIT", prod: "Pièces/s", rep: "Pièces/rep", atkp: "ATK", hpp: "PV", defp: "DEF", xp: "XP", loot: "Butin", energy: "Énergie max", off: "Gains hors ligne" };

  // Objets uniques gagnés en terminant un donjon pour la première fois
  const UNIQUES = {
    u_whip: { slot: "weapon", n: "Élastique Fouet", icon: "whip", r: 3, ilvl: 6, aff: [["rep", 0.15], ["crit", 0.05]], lore: "Arraché au Gardien du Parc. Claque comme un coup de sifflet." },
    u_flail: { slot: "weapon", n: "Kettlebell Fléau", icon: "kettlebell", r: 3, ilvl: 16, aff: [["cdmg", 0.3], ["atkp", 0.1]], lore: "Elle hante encore la Salle Abandonnée." },
    u_wind: { slot: "head", n: "Bandeau du Vent", icon: "head", r: 3, ilvl: 26, aff: [["crit", 0.08], ["prod", 0.1]], lore: "Le Roi des Toits ne courait pas : il volait." },
    u_bo: { slot: "weapon", n: "Bâton de Bô", icon: "staff", r: 4, ilvl: 36, aff: [["defp", 0.15], ["atkp", 0.12], ["xp", 0.1]], lore: "Mille ans d'immobilité dans un seul bâton." },
    u_remote: { slot: "acc", n: "Télécommande Maudite", icon: "acc", r: 4, ilvl: 46, aff: [["prod", 0.2], ["loot", 0.2], ["hpp", 0.1]], lore: "Celui qui la tient ne quitte jamais le canapé… sauf toi." },
    u_titan: { slot: "hands", n: "Gantelets du Titan", icon: "hands", r: 4, ilvl: 56, aff: [["atkp", 0.25], ["cdmg", 0.3], ["crit", 0.05]], lore: "Forgés dans la fonte du volcan." },
    u_laser: { slot: "weapon", n: "Haltère Laser", icon: "dumbbell", r: 4, ilvl: 66, aff: [["atkp", 0.2], ["crit", 0.08], ["rep", 0.2]], lore: "Prototype du Méga-Coach 3000. 0 % de rouille." },
    u_excal: { slot: "weapon", n: "Excalibarre", icon: "sword", r: 5, ilvl: 76, aff: [["atkp", 0.35], ["prod", 0.25], ["crit", 0.1]], lore: "Seul un athlète digne peut la sortir du rack." },
  };

  // ---------- Apparences (skins) ----------
  // look : surcharges de l'apparence du héros ; bonus : petit avantage passif
  const SKINS = [
    { id: "base", n: "Débutant", src: "Ton apparence de départ", look: {}, bonus: null },
    { id: "rocky", n: "Boxeur du Parc", src: "Terminer le Parc du Quartier", look: { top: "#94b0c2", sleeves: "long", bottom: "#333c57", pants: "long", hat: "headband", acc: "#b13e53", shoes: "#f4f4f4" }, bonus: ["rep", 0.05] },
    { id: "spectre", n: "Spectre", src: "Terminer la Salle Abandonnée", look: { skin: "#cfe3ee", hair: "#f4f4f4", top: "#94b0c2", bottom: "#566c86", pants: "long", shoes: "#94b0c2", eye: "#41a6f6" }, bonus: ["crit", 0.03] },
    { id: "ninja", n: "Ninja des Toits", src: "Terminer Les Toits de la Ville", look: { top: "#333c57", sleeves: "long", bottom: "#1a1c2c", pants: "long", hat: "ninja", acc: "#b13e53", shoes: "#1a1c2c", hair: "#1a1c2c" }, bonus: ["spd", 1] },
    { id: "moine", n: "Moine Shaolin", src: "Terminer le Temple Shaolin", look: { top: "#ef7d57", sleeves: "none", bottom: "#ef7d57", pants: "long", hair: "bald", shoes: "#5b3a29", cape: null }, bonus: ["defp", 0.05] },
    { id: "squelette", n: "Squelette Sportif", src: "Terminer la Crypte des Sédentaires", look: { skin: "#f4f4f4", hair: "bald", top: "#f4f4f4", sleeves: "none", bottom: "#f4f4f4", pants: "short", shoes: "#f4f4f4", bones: true, eye: "#b13e53" }, bonus: ["atkp", 0.05] },
    { id: "viking", n: "Viking des Forges", src: "Terminer le Volcan des Forges", look: { top: "#8a5a3c", sleeves: "none", bottom: "#5b3a29", pants: "long", hat: "viking", hair: "#e8c170", beard: "#e8c170", shoes: "#5b3a29" }, bonus: ["hpp", 0.08] },
    { id: "cyber", n: "Cyber-Athlète", src: "Terminer l'Arène Néon", look: { top: "#29366f", sleeves: "long", bottom: "#1a1c2c", pants: "long", hat: "visor", acc: "#73eff7", shoes: "#73eff7" }, bonus: ["prod", 0.08] },
    { id: "goat", n: "G.O.A.T. Doré", src: "Terminer L'Olympe", look: { skin: "#ffcd75", hair: "#ef7d57", top: "#ffcd75", sleeves: "none", bottom: "#ef7d57", pants: "short", hat: "laurel", shoes: "#ffcd75", cape: "#f4f4f4" }, bonus: ["prod", 0.15] },
    { id: "spartan", n: "Spartiate", src: "Atteindre le palier 4 du raid", look: { top: "#b13e53", sleeves: "none", bottom: "#b13e53", pants: "short", hat: "spartan", shoes: "#5b3a29", cape: "#b13e53" }, bonus: ["atkp", 0.08] },
    { id: "flamme", n: "Flamme Éternelle", src: "Série de 30 jours", look: { hair: "fire", top: "#b13e53", sleeves: "none", bottom: "#1a1c2c", shoes: "#ef7d57" }, bonus: ["rep", 0.1] },
    { id: "aerobic", n: "Aérobic 80's", src: "Boutique : 150 éclats", price: 150, look: { top: "#e05fa8", sleeves: "none", bottom: "#73eff7", pants: "long", hat: "headband", acc: "#ffcd75", shoes: "#f4f4f4", hair: "#e8c170" }, bonus: ["xp", 0.05] },
    { id: "pirate", n: "Pirate des Barres", src: "Boutique : 200 éclats", price: 200, look: { top: "#f4f4f4", sleeves: "long", bottom: "#5b3a29", pants: "long", hat: "pirate", acc: "#b13e53", shoes: "#1a1c2c", patch: true }, bonus: ["loot", 0.1] },
    { id: "pharaon", n: "Pharaon", src: "Boutique : 300 éclats", price: 300, look: { top: "#f4f4f4", sleeves: "none", bottom: "#f4f4f4", pants: "short", hat: "pharaoh", shoes: "#ffcd75", acc: "#ffcd75" }, bonus: ["prod", 0.06] },
  ];
  const SKIN = {};
  SKINS.forEach((s) => (SKIN[s.id] = s));

  const SKIN_TONES = ["#f6d1b0", "#e8b48a", "#c98c5e", "#a0663f", "#6e4630", "#4a2e20"];
  const HAIR_COLORS = ["#2a1d1a", "#5b3a29", "#a8432a", "#e8c170", "#94b0c2", "#3b5dc9", "#b13e53"];
  const HAIR_STYLES = [["short", "Court"], ["long", "Long"], ["mohawk", "Crête"], ["bun", "Chignon"], ["bald", "Rasé"]];
  const TOP_COLORS = ["#b13e53", "#ef7d57", "#38b764", "#3b5dc9", "#333c57", "#f4f4f4", "#5d275d", "#257179"];

  // ---------- Familiers ----------
  const PETS = [
    { id: "pigeon", n: "Pigeon Musclé", spr: "bird", pal: { a: "#94b0c2", b: "#566c86", c: "#c2d3de", d: "#ef7d57", f: "#ef7d57" }, bonus: ["rep", 0.1], src: "Parc du Quartier (Héroïque)" },
    { id: "kettle", n: "Kettlebell Vivante", spr: "kettle", pal: { a: "#ef7d57", b: "#b13e53", c: "#ffcd75", d: "#1a1c2c" }, bonus: ["hpp", 0.1], src: "Salle Abandonnée (Héroïque)" },
    { id: "chat", n: "Chat de Gouttière", spr: "rodent", pal: { a: "#333c57", b: "#1a1c2c", c: "#566c86", d: "#ffcd75", f: "#566c86" }, bonus: ["crit", 0.04], src: "Toits de la Ville (Héroïque)" },
    { id: "panda", n: "Panda Roux", spr: "rodent", pal: { a: "#b8502e", b: "#7a2e1c", c: "#f4f4f4", d: "#1a1c2c", f: "#5b3a29" }, bonus: ["xp", 0.1], src: "Temple Shaolin (Héroïque)" },
    { id: "chauve", n: "Chauve-souris", spr: "bird", pal: { a: "#5d275d", b: "#3a1a3a", c: "#8a4a8a", d: "#ffcd75", f: "#5d275d" }, bonus: ["off", 0.15], src: "Crypte des Sédentaires (Héroïque)" },
    { id: "dragon", n: "Bébé Dragon", spr: "bird", pal: { a: "#38b764", b: "#257179", c: "#a7f070", d: "#ef7d57", f: "#ef7d57" }, bonus: ["atkp", 0.1], src: "Volcan des Forges (Héroïque)" },
    { id: "drone", n: "Drone Coach", spr: "robot", pal: { a: "#73eff7", b: "#41a6f6", c: "#f4f4f4", d: "#e05fa8" }, bonus: ["prod", 0.12], src: "Arène Néon (Héroïque)" },
    { id: "pegase", n: "Pégase", spr: "bird", pal: { a: "#f4f4f4", b: "#c2d3de", c: "#ffffff", d: "#ffcd75", f: "#ffcd75" }, bonus: ["loot", 0.25], src: "L'Olympe (Héroïque)" },
  ];
  const PET = {};
  PETS.forEach((p) => (PET[p.id] = p));

  // ---------- Donjons ----------
  // spr : forme du sprite (ou "human" = rendu squelettique). sp : capacité spéciale
  const DUNGEONS = [
    { id: "parc", n: "Le Parc du Quartier", theme: "park", desc: "Pigeons enragés et joggeurs fous. Le terrain de jeu du débutant.",
      foes: [
        { n: "Pigeon Agressif", spr: "bird", pal: { a: "#94b0c2", b: "#566c86", c: "#c2d3de", d: "#ef7d57", f: "#ef7d57" } },
        { n: "Écureuil Pumpé", spr: "rodent", pal: { a: "#ef7d57", b: "#b13e53", c: "#ffcd75", d: "#1a1c2c", f: "#5d275d" }, sp: "multi" },
        { n: "Joggeur Fou", spr: "human", look: { skin: "#c98c5e", hair: "#2a1d1a", top: "#3b5dc9", bottom: "#333c57", shoes: "#f4f4f4", hat: "headband", acc: "#b13e53" }, sp: "heavy" },
        { n: "Shaker Gluant", spr: "blob", pal: { a: "#e8a0b4", b: "#b06080", c: "#fbe0e8", d: "#5d275d" }, sp: "heal" },
      ],
      boss: { n: "Le Gardien du Parc", spr: "human", s: 2, look: { skin: "#a0663f", hair: "#5b3a29", top: "#38b764", bottom: "#257179", pants: "long", hat: "cap", acc: "#257179", shoes: "#1a1c2c", beard: "#5b3a29" }, sp: "heavy" },
      first: { skin: "rocky", item: "u_whip" }, pet: "pigeon" },
    { id: "salle", n: "La Salle Abandonnée", theme: "gym", desc: "Une salle de muscu fermée depuis 10 ans. Les haltères ont pris vie.",
      foes: [
        { n: "Rat de Salle", spr: "rodent", pal: { a: "#94b0c2", b: "#566c86", c: "#c2d3de", d: "#e0667a", f: "#e0667a" }, sp: "multi" },
        { n: "Haltère Hantée", spr: "dumbbell", pal: { a: "#566c86", b: "#333c57", c: "#94b0c2", d: "#73eff7" } },
        { n: "Kettlebell Rageuse", spr: "kettle", pal: { a: "#333c57", b: "#1a1c2c", c: "#566c86", d: "#b13e53" }, sp: "heavy" },
        { n: "Machine Possédée", spr: "robot", pal: { a: "#8a8a7a", b: "#5a5a4a", c: "#c0c0b0", d: "#b13e53" }, sp: "shield" },
      ],
      boss: { n: "Le Spectre du Squat", spr: "ghost", s: 2, pal: { a: "#c9b6f0", b: "#8a6fc0", c: "#f0e8ff", d: "#5d275d" }, sp: "drain" },
      first: { skin: "spectre", item: "u_flail" }, pet: "kettle" },
    { id: "toits", n: "Les Toits de la Ville", theme: "roof", desc: "Parkour au-dessus du vide, corbeaux ninjas et antennes électriques.",
      foes: [
        { n: "Corbeau Ninja", spr: "bird", pal: { a: "#333c57", b: "#1a1c2c", c: "#566c86", d: "#ffcd75", f: "#ffcd75" }, sp: "multi" },
        { n: "Antenne Électrique", spr: "robot", pal: { a: "#94b0c2", b: "#566c86", c: "#f4f4f4", d: "#ffcd75" }, sp: "stun" },
        { n: "Parkourien Rival", spr: "human", look: { skin: "#e8b48a", hair: "#a8432a", top: "#ef7d57", sleeves: "long", bottom: "#333c57", pants: "long", shoes: "#38b764" }, sp: "multi" },
        { n: "Gargouille", spr: "golem", pal: { a: "#94b0c2", b: "#566c86", c: "#c2d3de", d: "#b13e53" }, sp: "shield" },
      ],
      boss: { n: "Le Roi des Toits", spr: "human", s: 2, look: { skin: "#c98c5e", hair: "#2a1d1a", top: "#5d275d", sleeves: "long", bottom: "#1a1c2c", pants: "long", hat: "crown", cape: "#b13e53", shoes: "#1a1c2c" }, sp: "multi" },
      first: { skin: "ninja", item: "u_wind" }, pet: "chat" },
    { id: "temple", n: "Le Temple Shaolin", theme: "temple", desc: "Au sommet de la montagne, des maîtres qui tiennent la planche depuis des siècles.",
      foes: [
        { n: "Moine de Bois", spr: "human", look: { skin: "#a0663f", hair: "bald", top: "#8a5a3c", sleeves: "none", bottom: "#8a5a3c", pants: "long", shoes: "#5b3a29" }, sp: "shield" },
        { n: "Statue de Pierre", spr: "golem", pal: { a: "#b0a890", b: "#7a7260", c: "#d8d0b8", d: "#38b764" }, sp: "heavy" },
        { n: "Singe Acrobate", spr: "rodent", pal: { a: "#8a5a3c", b: "#5b3a29", c: "#e8b48a", d: "#1a1c2c", f: "#5b3a29" }, sp: "multi" },
        { n: "Esprit du Thé", spr: "ghost", pal: { a: "#a7f070", b: "#38b764", c: "#e0ffd0", d: "#257179" }, sp: "heal" },
      ],
      boss: { n: "Le Grand Maître Immobile", spr: "human", s: 2, look: { skin: "#e8b48a", hair: "bald", top: "#ef7d57", sleeves: "none", bottom: "#ef7d57", pants: "long", shoes: "#5b3a29", beard: "#f4f4f4" }, sp: "shield" },
      first: { skin: "moine", item: "u_bo" }, pet: "panda" },
    { id: "crypte", n: "La Crypte des Sédentaires", theme: "crypt", desc: "Ici reposent ceux qui ont dit « je commence lundi ».",
      foes: [
        { n: "Zombie Canapé", spr: "couch", pal: { a: "#6a8a5a", b: "#4a6040", c: "#8aaa7a", d: "#b13e53", f: "#3a2a1a" }, sp: "heal" },
        { n: "Momie Télécommande", spr: "human", look: { skin: "#d8d0b0", hair: "bald", top: "#d8d0b0", sleeves: "long", bottom: "#d8d0b0", pants: "long", shoes: "#a8a080", eye: "#ffcd75" }, sp: "stun" },
        { n: "Squelette Chips", spr: "human", look: { skin: "#f4f4f4", hair: "bald", top: "#f4f4f4", sleeves: "none", bottom: "#f4f4f4", shoes: "#f4f4f4", bones: true, eye: "#b13e53" }, sp: "multi" },
        { n: "Fantôme du Binge", spr: "ghost", pal: { a: "#41a6f6", b: "#29366f", c: "#a0d8ff", d: "#1a1c2c" }, sp: "drain" },
      ],
      boss: { n: "La Liche du Canapé", spr: "couch", s: 2, pal: { a: "#5d275d", b: "#3a1a3a", c: "#8a4a8a", d: "#a7f070", f: "#1a1c2c" }, sp: "drain" },
      first: { skin: "squelette", item: "u_remote" }, pet: "chauve" },
    { id: "volcan", n: "Le Volcan des Forges", theme: "volcano", desc: "Là où naît la fonte. Chaleur extrême, golems de 300 kilos.",
      foes: [
        { n: "Salamandre", spr: "rodent", pal: { a: "#e04030", b: "#902020", c: "#ffcd75", d: "#1a1c2c", f: "#902020" }, sp: "multi" },
        { n: "Slime de Lave", spr: "blob", pal: { a: "#ef7d57", b: "#b13e53", c: "#ffcd75", d: "#1a1c2c" }, sp: "heal" },
        { n: "Golem de Fonte", spr: "golem", pal: { a: "#4a4a5a", b: "#2a2a3a", c: "#6a6a7a", d: "#ef7d57" }, sp: "heavy" },
        { n: "Forgeron Fou", spr: "human", look: { skin: "#a0663f", hair: "#2a1d1a", top: "#5b3a29", sleeves: "none", bottom: "#333c57", pants: "long", shoes: "#1a1c2c", beard: "#2a1d1a" }, sp: "heavy" },
      ],
      boss: { n: "Le Titan de Fonte", spr: "golem", s: 2, pal: { a: "#3a3a4a", b: "#1a1a2a", c: "#5a5a6a", d: "#ffcd75" }, sp: "heavy" },
      first: { skin: "viking", item: "u_titan" }, pet: "dragon" },
    { id: "arene", n: "L'Arène Néon", theme: "neon", desc: "Une salle futuriste où des robots coachs ne connaissent pas la pitié.",
      foes: [
        { n: "Drone Sparring", spr: "robot", pal: { a: "#73eff7", b: "#41a6f6", c: "#f4f4f4", d: "#e05fa8" }, sp: "multi" },
        { n: "Hologramme", spr: "ghost", pal: { a: "#73eff7", b: "#3b5dc9", c: "#e0ffff", d: "#e05fa8" }, sp: "drain" },
        { n: "Cyber-Runner", spr: "human", look: { skin: "#c98c5e", hair: "#e05fa8", top: "#1a1c2c", sleeves: "long", bottom: "#29366f", pants: "long", hat: "visor", acc: "#e05fa8", shoes: "#e05fa8" }, sp: "stun" },
        { n: "Haltère Laser", spr: "dumbbell", pal: { a: "#e05fa8", b: "#902070", c: "#ffb0e0", d: "#73eff7" }, sp: "heavy" },
      ],
      boss: { n: "Méga-Coach 3000", spr: "robot", s: 2, pal: { a: "#e05fa8", b: "#902070", c: "#ffb0e0", d: "#73eff7" }, sp: "stun" },
      first: { skin: "cyber", item: "u_laser" }, pet: "drone" },
    { id: "olympe", n: "L'Olympe", theme: "olympus", desc: "Le panthéon des athlètes. Seuls les dieux y font des tractions.",
      foes: [
        { n: "Harpie", spr: "bird", pal: { a: "#b65cd6", b: "#5d275d", c: "#e0b0f0", d: "#ffcd75", f: "#ffcd75" }, sp: "multi" },
        { n: "Minotaure", spr: "golem", pal: { a: "#8a5a3c", b: "#5b3a29", c: "#c08a60", d: "#b13e53" }, sp: "heavy" },
        { n: "Hoplite", spr: "human", look: { skin: "#c98c5e", hair: "#2a1d1a", top: "#b13e53", sleeves: "none", bottom: "#b13e53", pants: "short", hat: "spartan", shoes: "#8a5a3c" }, sp: "shield" },
        { n: "Nuée Divine", spr: "blob", pal: { a: "#f4f4f4", b: "#c2d3de", c: "#ffffff", d: "#ffcd75" }, sp: "heal" },
      ],
      boss: { n: "Héraclès", spr: "human", s: 2, look: { skin: "#c98c5e", hair: "#5b3a29", top: "#ffcd75", sleeves: "none", bottom: "#ffcd75", pants: "short", hat: "lion", shoes: "#8a5a3c", beard: "#5b3a29" }, sp: "enrage" },
      first: { skin: "goat", item: "u_excal" }, pet: "pegase" },
  ];
  const MODES = [
    { id: 0, n: "Normal", m: 1, ilvl: 0, rar: 1, c: "#94b0c2" },
    { id: 1, n: "Héroïque", m: 3.2, ilvl: 5, rar: 2.2, c: "#b65cd6" },
    { id: 2, n: "Légende", m: 9, ilvl: 10, rar: 4, c: "#ffcd75" },
  ];

  // Boss de raid hebdomadaire (dégâts cumulés par toute la communauté)
  const RAID_BOSSES = [
    { n: "Le Léviathan de la Flemme", spr: "blob", pal: { a: "#5d275d", b: "#3a1a3a", c: "#8a4a8a", d: "#a7f070" } },
    { n: "Le Colosse du Canapé", spr: "couch", pal: { a: "#b13e53", b: "#701a2a", c: "#e06070", d: "#ffcd75", f: "#1a1c2c" } },
    { n: "L'Hydre du Snooze", spr: "ghost", pal: { a: "#3b5dc9", b: "#29366f", c: "#a0c0ff", d: "#ffcd75" } },
    { n: "Le Golem des Excuses", spr: "golem", pal: { a: "#566c86", b: "#333c57", c: "#94b0c2", d: "#e05fa8" } },
  ];

  // ---------- Quêtes du jour ----------
  // key : compteur journalier ; irl : quête d'exercice réel
  const QUESTS = [
    { id: "q_push", txt: "Fais 30 pompes", key: "pushup", n: 30, irl: true, gems: 5, sec: 300 },
    { id: "q_pull", txt: "Tirage : 10 tractions (ou 25 australiennes)", key: "pull", n: 30, irl: true, gems: 6, sec: 300 },
    { id: "q_squat", txt: "Fais 50 squats", key: "squat", n: 50, irl: true, gems: 5, sec: 300 },
    { id: "q_plank", txt: "Cumule 2 minutes de gainage", key: "plank", n: 120, irl: true, gems: 5, sec: 300 },
    { id: "q_core", txt: "Gainage : 25 points d'effort", key: "core", n: 25, irl: true, gems: 5, sec: 300 },
    { id: "q_rv", txt: "Atteins 100 points d'effort", key: "rv", n: 100, irl: true, gems: 8, sec: 600 },
    { id: "q_skill", txt: "Équilibre : 15 points d'effort", key: "skill", n: 15, irl: true, gems: 6, sec: 300 },
    { id: "q_burpee", txt: "Fais 20 burpees", key: "burpee", n: 20, irl: true, gems: 6, sec: 300 },
    { id: "q_seance", txt: "Termine une séance guidée", key: "seance", n: 1, irl: true, gems: 12, sec: 900 },
    { id: "q_win", txt: "Gagne 6 combats en donjon", key: "win", n: 6, gems: 5, sec: 300 },
    { id: "q_boss", txt: "Bats un boss de donjon", key: "boss", n: 1, gems: 6, sec: 300 },
    { id: "q_levels", txt: "Achète 25 niveaux de skills", key: "levels", n: 25, gems: 4, sec: 200 },
    { id: "q_chest", txt: "Ouvre un coffre", key: "chest", n: 1, gems: 4, sec: 200 },
    { id: "q_upgrade", txt: "Améliore un équipement", key: "upgrade", n: 1, gems: 4, sec: 200 },
    { id: "q_raid", txt: "Attaque le boss de raid", key: "raid", n: 1, gems: 5, sec: 300 },
  ];

  // ---------- Succès ----------
  // v(S) renvoie la valeur actuelle comparée à n
  const ACHS = [
    { id: "a_first", n: "Premier pas", d: "Enregistre ton premier exercice", v: (S) => S.life.rv, n2: 1, gems: 10 },
    { id: "a_rv1k", n: "Centurion", d: "Cumule 1 000 points d'effort", v: (S) => S.life.rv, n2: 1000, gems: 25 },
    { id: "a_rv10k", n: "Machine", d: "Cumule 10 000 points d'effort", v: (S) => S.life.rv, n2: 1e4, gems: 60 },
    { id: "a_rv50k", n: "Légende vivante", d: "Cumule 50 000 points d'effort", v: (S) => S.life.rv, n2: 5e4, gems: 150 },
    { id: "a_push1k", n: "Mille Pompes", d: "Fais 1 000 pompes", v: (S) => (S.exo.pushup || 0), n2: 1000, gems: 40 },
    { id: "a_pull500", n: "Roi de la Barre", d: "Fais 500 tractions", v: (S) => (S.exo.pullup || 0), n2: 500, gems: 50 },
    { id: "a_squat2k", n: "Cuisses d'Acier", d: "Fais 2 000 squats", v: (S) => (S.exo.squat || 0), n2: 2000, gems: 40 },
    { id: "a_plank1h", n: "Statue", d: "Cumule 1 heure de gainage", v: (S) => (S.exo.plank || 0), n2: 3600, gems: 50 },
    { id: "a_hs10m", n: "La Tête à l'Envers", d: "Cumule 10 minutes de poirier", v: (S) => (S.exo.hshold || 0), n2: 600, gems: 40 },
    { id: "a_sk5", n: "Apprenti", d: "Débloque 5 skills", v: (S) => S.life.skills, n2: 5, gems: 20 },
    { id: "a_sk15", n: "Athlète", d: "Débloque 15 skills", v: (S) => S.life.skills, n2: 15, gems: 50 },
    { id: "a_sk30", n: "Maître", d: "Débloque 30 skills", v: (S) => S.life.skills, n2: 30, gems: 120 },
    { id: "a_sk49", n: "Grand Maître", d: "Débloque les 49 skills", v: (S) => S.life.skills, n2: 49, gems: 400 },
    { id: "a_cert1", n: "Certifié", d: "Valide un skill dans la vraie vie", v: (S) => S.life.cert, n2: 1, gems: 20 },
    { id: "a_cert5", n: "Preuve Vivante", d: "Valide 5 skills dans la vraie vie", v: (S) => S.life.cert, n2: 5, gems: 60 },
    { id: "a_cert15", n: "Incontestable", d: "Valide 15 skills dans la vraie vie", v: (S) => S.life.cert, n2: 15, gems: 200 },
    { id: "a_sea1", n: "Première Séance", d: "Termine une séance guidée", v: (S) => S.life.seances, n2: 1, gems: 15 },
    { id: "a_sea10", n: "Assidu", d: "Termine 10 séances guidées", v: (S) => S.life.seances, n2: 10, gems: 50 },
    { id: "a_sea50", n: "Inarrêtable", d: "Termine 50 séances guidées", v: (S) => S.life.seances, n2: 50, gems: 150 },
    { id: "a_str7", n: "Semaine de Feu", d: "Série de 7 jours d'entraînement", v: (S) => S.life.bestStreak, n2: 7, gems: 40 },
    { id: "a_str30", n: "Mois de Fer", d: "Série de 30 jours d'entraînement", v: (S) => S.life.bestStreak, n2: 30, gems: 150 },
    { id: "a_dj1", n: "Explorateur", d: "Termine ton premier donjon", v: (S) => S.dungeon.cleared, n2: 1, gems: 25 },
    { id: "a_dj4", n: "Conquérant", d: "Termine 4 donjons", v: (S) => S.dungeon.cleared, n2: 4, gems: 80 },
    { id: "a_dj8", n: "Dieu de l'Olympe", d: "Termine les 8 donjons", v: (S) => S.dungeon.cleared, n2: 8, gems: 250 },
    { id: "a_boss25", n: "Chasseur de Boss", d: "Bats 25 boss", v: (S) => S.life.bosses, n2: 25, gems: 60 },
    { id: "a_leg", n: "Légendaire !", d: "Obtiens un objet légendaire", v: (S) => S.life.bestRar, n2: 4, gems: 40 },
    { id: "a_myth", n: "Mythe", d: "Obtiens un objet mythique", v: (S) => S.life.bestRar, n2: 5, gems: 100 },
    { id: "a_c1m", n: "Millionnaire", d: "Gagne 1 million de pièces au total", v: (S) => S.life.earned, n2: 1e6, gems: 20 },
    { id: "a_c1b", n: "Milliardaire", d: "Gagne 1 milliard de pièces au total", v: (S) => S.life.earned, n2: 1e9, gems: 50 },
    { id: "a_c1t", n: "Empire de Fonte", d: "Gagne 1 billion de pièces au total", v: (S) => S.life.earned, n2: 1e12, gems: 120 },
    { id: "a_pre1", n: "Renaissance", d: "Effectue ta première Renaissance", v: (S) => S.prestige.count, n2: 1, gems: 50 },
    { id: "a_pre5", n: "Éternel Retour", d: "Effectue 5 Renaissances", v: (S) => S.prestige.count, n2: 5, gems: 150 },
    { id: "a_pet3", n: "Ménagerie", d: "Collectionne 3 familiers", v: (S) => S.pets.length, n2: 3, gems: 40 },
    { id: "a_skin5", n: "Fashion Week", d: "Possède 5 apparences", v: (S) => S.skins.length, n2: 5, gems: 40 },
    { id: "a_raid", n: "Tueur de Flemme", d: "Atteins le palier 4 d'un raid", v: (S) => S.life.raidBest, n2: 4, gems: 60 },
  ];

  // ---------- Bibliothèque pour le générateur de séances ----------
  // [nom affiché, exo de référence, multiplicateur de PE, unité, quantité min, quantité max, note]
  const WARMUP = [
    ["Jumping jacks", "jjack", 1, "sec", 40, 45],
    ["Rotations des poignets", "stretch", 1, "sec", 30, 30],
    ["Cercles de bras", "stretch", 1, "sec", 30, 30],
    ["Rotations de hanches", "stretch", 1, "sec", 30, 30],
    ["Scap push-ups (omoplates)", "pushup", 0.3, "reps", 10, 12],
    ["Squats lents", "squat", 1, "reps", 12, 15],
    ["Mountain climbers", "mclimb", 1, "reps", 20, 30],
    ["Corde à sauter", "rope", 1, "sec", 45, 60],
  ];
  const COOLDOWN = [
    ["Étirement des pectoraux au mur", "stretch", 1, "sec", 30, 40],
    ["Pigeon (hanches)", "stretch", 1, "sec", 40, 45],
    ["Flexion avant jambes tendues", "stretch", 1, "sec", 30, 40],
    ["Étirement des épaules", "stretch", 1, "sec", 30, 30],
    ["Posture de l'enfant", "stretch", 1, "sec", 40, 45],
    ["Étirement des avant-bras", "stretch", 1, "sec", 30, 30],
  ];
  // Par catégorie et niveau (0 débutant, 1 intermédiaire, 2 avancé). bar: nécessite une barre
  const LIB = {
    push: [
      [["Pompes inclinées (mains surélevées)", "pushup", 0.6, "reps", 8, 12], ["Pompes sur les genoux", "pushup", 0.5, "reps", 10, 15], ["Dips sur chaise", "dips", 0.6, "reps", 8, 12]],
      [["Pompes", "pushup", 1, "reps", 12, 20], ["Pompes diamant", "diamond", 1, "reps", 8, 12], ["Dips", "dips", 1, "reps", 8, 12], ["Pompes pieds surélevés", "pushup", 1.3, "reps", 10, 15]],
      [["Pompes archer", "archer", 1, "reps", 6, 10], ["Pompes pseudo-planche", "pushup", 2, "reps", 8, 12], ["Dips lents (3 s en descente)", "dips", 1.4, "reps", 10, 15], ["Pompes claquées", "pushup", 1.8, "reps", 8, 12]],
    ],
    pull: [
      [["Tractions australiennes", "austrow", 1, "reps", 8, 12, false, true], ["Suspension à la barre", "deadhang", 1, "sec", 20, 30, true], ["Tractions négatives (5 s)", "pullup", 0.5, "reps", 4, 6, true], ["Rowing serviette (porte)", "austrow", 0.7, "reps", 10, 15]],
      [["Tractions", "pullup", 1, "reps", 5, 8, true], ["Chin-ups (supination)", "pullup", 0.9, "reps", 6, 10, true], ["Australiennes pieds surélevés", "austrow", 1.4, "reps", 10, 15], ["Front lever groupé", "flhold", 1, "sec", 8, 12, true]],
      [["Tractions lestées / lentes", "pullup", 1.4, "reps", 6, 10, true], ["Tractions archer", "pullup", 2, "reps", 4, 6, true], ["Muscle-ups", "muscleup", 1, "reps", 3, 5, true], ["Front lever avancé", "flhold", 1.6, "sec", 8, 12, true]],
    ],
    legs: [
      [["Squats", "squat", 1, "reps", 15, 20], ["Fentes alternées", "lunge", 1, "reps", 10, 14], ["Pont fessier", "squat", 0.6, "reps", 15, 20]],
      [["Squats sautés", "jumpsquat", 1, "reps", 12, 15], ["Fentes bulgares", "lunge", 1.5, "reps", 8, 10], ["Pistol assisté", "pistol", 0.5, "reps", 5, 8], ["Chaise contre le mur", "plank", 1, "sec", 40, 60]],
      [["Pistol squats", "pistol", 1, "reps", 5, 8], ["Shrimp squats", "pistol", 1.2, "reps", 4, 6], ["Nordic curls", "nordic", 1, "reps", 4, 6], ["Squats sautés", "jumpsquat", 1, "reps", 15, 20]],
    ],
    core: [
      [["Gainage", "plank", 1, "sec", 30, 45], ["Relevés de jambes au sol", "legraise", 0.7, "reps", 10, 12], ["Gainage latéral", "plank", 1, "sec", 20, 30]],
      [["Hollow body", "hollow", 1, "sec", 25, 35], ["Relevés de jambes suspendus", "legraise", 1.5, "reps", 8, 12, true], ["L-sit genoux pliés", "lsit", 0.6, "sec", 10, 15], ["Gainage latéral", "plank", 1, "sec", 30, 45]],
      [["L-sit", "lsit", 1, "sec", 10, 20], ["Dragon flags négatifs", "legraise", 3, "reps", 4, 6], ["Toes-to-bar", "legraise", 2, "reps", 8, 10, true], ["Hollow rocks", "hollow", 1.4, "sec", 25, 35]],
    ],
    skill: [
      [["Corbeau", "hshold", 0.8, "sec", 10, 20], ["Poirier contre le mur", "hshold", 1, "sec", 15, 30], ["Planche lean", "lean", 1, "sec", 10, 15], ["Pompes pike", "pike", 1, "reps", 6, 10]],
      [["Poirier : tentatives libres", "hshold", 1, "sec", 30, 45], ["Tuck planche", "lean", 1.5, "sec", 6, 10], ["Pompes pike pieds surélevés", "pike", 1.3, "reps", 6, 10], ["Marche en poirier au mur", "hshold", 1.2, "sec", 20, 30]],
      [["HSPU contre le mur", "hspu", 1, "reps", 3, 6], ["Straddle planche", "lean", 3, "sec", 5, 8], ["Poirier libre", "hshold", 1.5, "sec", 20, 40], ["Press au poirier (tentatives)", "hshold", 2, "sec", 15, 20]],
    ],
    cardio: [
      [["Burpees", "burpee", 1, "reps", 8, 10], ["Mountain climbers", "mclimb", 1, "reps", 20, 30], ["Jumping jacks", "jjack", 1, "reps", 30, 40]],
      [["Burpees", "burpee", 1, "reps", 12, 15], ["Corde à sauter", "rope", 1, "sec", 60, 90], ["Squats sautés", "jumpsquat", 1, "reps", 15, 20]],
      [["Burpees avec traction", "burpee", 1.8, "reps", 10, 12, true], ["Double unders", "rope", 1.5, "sec", 60, 90], ["Pompes claquées", "pushup", 1.8, "reps", 10, 12]],
    ],
  };
  const FOCUS = [
    { id: "full", n: "Full body", cats: ["push", "pull", "legs", "core"] },
    { id: "push", n: "Poussée", cats: ["push", "push", "skill", "core"] },
    { id: "pull", n: "Tirage", cats: ["pull", "pull", "core", "push"] },
    { id: "legs", n: "Jambes", cats: ["legs", "legs", "core", "cardio"] },
    { id: "core", n: "Abdos", cats: ["core", "core", "legs", "push"] },
    { id: "skills", n: "Skills", cats: ["skill", "skill", "pull", "core"] },
    { id: "cardio", n: "Cardio", cats: ["cardio", "cardio", "legs", "push"] },
  ];

  // ---------- Joueurs simulés du parc et du classement ----------
  const BOTS = ["MuscleMax", "LaPlancheDeJu", "TractionTony", "Gaby_Gainage", "PistolPete", "SkillSarah", "DipsDiego", "Mounir_MU", "LéaLever", "KévinKettle", "BabarDeBarre", "FlagFanny", "YannHSPU", "NinaNordic", "Zoé360", "CroissantPompe", "Barbarossa", "MamieMuscleUp", "Le_Corbeau", "TheoHollow", "SamiStreet", "InèsInverse", "Jojo_LSit", "Mehdi_Front", "ChloéCrow", "RayanRings", "Lulu_Burpee", "AxelArcher", "Manon_Manna", "Bilal_Back"];
  const BOT_LINES = [
    "Quelqu'un a eu le front lever ?", "100 pompes ce matin !", "Le Titan de Fonte m'a détruit...", "GG pour le raid !",
    "Séance jambes aujourd'hui... RIP", "Astuce : certifie tes skills IRL, x3 !", "Ma série est à 12 jours", "Qui fait des tractions au parc ce soir ?",
    "J'ai drop un légendaire !!", "Le poirier libre, c'est 10 % force 90 % patience", "Pompes > excuses", "Mon familier m'a sauvé la vie",
    "Je commence lundi. Non, maintenant.", "Les nordic curls, c'est de la torture", "Muscle-up débloqué !!!", "Hydratez-vous les amis",
    "La Liche du Canapé est cheatée", "Planche lean tous les jours = planche un jour", "Respect à ceux qui font leurs étirements",
  ];

  DT.D = { BRANCHES, BR_ORDER, EXOS, EXO, TIERS, MILESTONES, SKILLS, SKILL, SLOTS, RAR, SLOT_STATS, ITEM_NAMES, ITEM_SUFFIX, AFFIXES, STAT_NAMES, UNIQUES, SKINS, SKIN, SKIN_TONES, HAIR_COLORS, HAIR_STYLES, TOP_COLORS, PETS, PET, DUNGEONS, MODES, RAID_BOSSES, QUESTS, ACHS, WARMUP, COOLDOWN, LIB, FOCUS, BOTS, BOT_LINES };
})(window.DT);
