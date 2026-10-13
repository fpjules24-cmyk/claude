'use strict';
// Donjons & Tractions v2 — monde fantasy : classes, capacités, coffres, marchands, apparences extravagantes
(function (DT) {
  const D = DT.D;

  // ---------- Classes (chacune nourrie par une famille de skills de calisthénie) ----------
  const CLASSES = {
    guerrier: { n: "Guerrier", br: "push", c: "#ef7d57", weapon: "great", desc: "Épée géante, armure lourde. Frappe fort, encaisse tout.", bonus: { atk: 0.10, hp: 0.10 }, perLvl: { atk: 0.012 },
      look: { top: "#b13e53", top2: "#94b0c2", armor: "plate", pauldron: "#c2d3de", sleeves: "short", bottom: "#333c57", pants: "long", boots: "#566c86", gloves: "#94b0c2", cape: "#b13e53", hat: "band", hatC: "#c2d3de" } },
    assassin: { n: "Assassin", br: "pull", c: "#41a6f6", weapon: "dagger", desc: "Dagues jumelles, ombres et poison. Critiques en rafale.", bonus: { crit: 0.10, spd: 2 }, perLvl: { crit: 0.002 },
      look: { top: "#29366f", top2: "#41a6f6", armor: "leather", sleeves: "long", bottom: "#1a1c2c", pants: "long", boots: "#333c57", gloves: "#1a1c2c", hat: "hood", hatC: "#29366f", scarf: "#41a6f6" } },
    mage: { n: "Mage", br: "skill", c: "#b65cd6", weapon: "staff", desc: "Bâton runique et sorts dévastateurs qui percent les défenses.", bonus: { mp: 40, atk: 0.05 }, perLvl: { atk: 0.01 },
      look: { top: "#5d275d", top2: "#ffcd75", armor: "robe", robe: "#5d275d", sleeves: "long", bottom: "#5d275d", pants: "long", boots: "#3a1a3a", hat: "wizard", hatC: "#5d275d" } },
    paladin: { n: "Paladin", br: "core", c: "#ffcd75", weapon: "hammer", desc: "Marteau sacré et boucliers divins. Se soigne et protège.", bonus: { def: 0.20, hp: 0.10 }, perLvl: { def: 0.012 },
      look: { top: "#f4f4f4", top2: "#ffcd75", armor: "plate", pauldron: "#ffcd75", sleeves: "short", bottom: "#94b0c2", pants: "long", boots: "#ffcd75", gloves: "#c2d3de", cape: "#3b5dc9", hat: "helm", hatC: "#f4f4f4" } },
    berserker: { n: "Berserker", br: "legs", c: "#e0667a", weapon: "axe", desc: "Hache colossale et rage sans limite. Plus il saigne, plus il frappe.", bonus: { hp: 0.25 }, perLvl: { hp: 0.012 },
      look: { top: "#8a5a3c", top2: "#5b3a29", armor: "fur", sleeves: "none", bottom: "#5b3a29", pants: "long", boots: "#5b3a29", hat: "horned", hatC: "#94b0c2", beard: "#a8432a" } },
    moine: { n: "Moine", br: "cardio", c: "#73eff7", weapon: "fist", desc: "Poings de feu et vitesse fulgurante. Combos et esquives.", bonus: { spd: 3, crit: 0.05 }, perLvl: { spd: 0.06 },
      look: { top: "#ef7d57", top2: "#ffcd75", armor: "gi", sleeves: "none", bottom: "#ef7d57", pants: "long", boots: "#5b3a29", gloves: "#ffcd75", hat: "band", hatC: "#ffcd75" } },
  };
  const CLASS_ORDER = ["guerrier", "assassin", "mage", "paladin", "berserker", "moine"];

  // ---------- Capacités (tour par tour) ----------
  // tg : one (cible), all (tous les ennemis), self, rand (cibles au hasard). p : puissance x ATK. cd : tours de recharge. mp : coût en mana.
  // fx : animation. eff : effets (stun, burn, poison, bleed, def, atk, crit, spd, slow, shield, heal, mp, dodge, lifesteal, pierce, mark, exec, selfdmg, regen, cleanse, splash, defup)
  const AB = [
    // Guerrier
    { id: "g_frappe", cls: "guerrier", lvl: 1, n: "Frappe Titanesque", mp: 10, cd: 0, tg: "one", p: 1.8, fx: "bigslash" },
    { id: "g_tourb", cls: "guerrier", lvl: 1, n: "Tourbillon d'Acier", mp: 22, cd: 2, tg: "all", p: 1.1, fx: "spin" },
    { id: "g_brise", cls: "guerrier", lvl: 3, n: "Brise-Armure", mp: 15, cd: 3, tg: "one", p: 1.4, fx: "slash", eff: { def: [-0.3, 3] } },
    { id: "g_cri", cls: "guerrier", lvl: 6, n: "Cri de Guerre", mp: 20, cd: 4, tg: "self", p: 0, fx: "roar", eff: { atk: [0.4, 3] } },
    { id: "g_rugis", cls: "guerrier", lvl: 10, n: "Lame Rugissante", mp: 30, cd: 3, tg: "one", p: 2.6, fx: "bigslash", eff: { bleed: [0.3, 3] } },
    { id: "g_rempart", cls: "guerrier", lvl: 15, n: "Rempart de Fer", mp: 20, cd: 5, tg: "self", p: 0, fx: "shield", eff: { shield: 0.3 } },
    { id: "g_exec", cls: "guerrier", lvl: 22, n: "Exécution", mp: 35, cd: 4, tg: "one", p: 2.2, fx: "bigslash", eff: { exec: 0.3 } },
    { id: "g_titan", cls: "guerrier", lvl: 30, n: "Colère du Titan", mp: 60, cd: 6, tg: "all", p: 4, fx: "quake", eff: { stun: 1 } },
    // Assassin
    { id: "a_double", cls: "assassin", lvl: 1, n: "Double Dague", mp: 8, cd: 0, tg: "one", p: 0.85, hits: 2, fx: "combo" },
    { id: "a_couteaux", cls: "assassin", lvl: 1, n: "Pluie de Couteaux", mp: 18, cd: 2, tg: "all", p: 0.9, fx: "knives" },
    { id: "a_poison", cls: "assassin", lvl: 3, n: "Poison Mortel", mp: 15, cd: 3, tg: "one", p: 1, fx: "slash", eff: { poison: [0.4, 4] } },
    { id: "a_voile", cls: "assassin", lvl: 6, n: "Voile d'Ombre", mp: 15, cd: 4, tg: "self", p: 0, fx: "smoke", eff: { dodge: 2 } },
    { id: "a_marque", cls: "assassin", lvl: 10, n: "Marque du Traqueur", mp: 20, cd: 4, tg: "one", p: 0.6, fx: "slash", eff: { mark: [0.4, 3] } },
    { id: "a_danse", cls: "assassin", lvl: 15, n: "Danse des Lames", mp: 35, cd: 3, tg: "rand", p: 0.65, hits: 5, fx: "combo" },
    { id: "a_assass", cls: "assassin", lvl: 22, n: "Assassinat", mp: 40, cd: 5, tg: "one", p: 3.5, fx: "dash", eff: { crit: 1 } },
    { id: "a_mille", cls: "assassin", lvl: 30, n: "Mille Coupures", mp: 60, cd: 6, tg: "rand", p: 0.75, hits: 8, fx: "combo", eff: { bleed: [0.2, 3] } },
    // Mage
    { id: "m_feu", cls: "mage", lvl: 1, n: "Boule de Feu", mp: 12, cd: 0, tg: "one", p: 1.7, fx: "fire", eff: { burn: [0.2, 2], pierce: 0.5 } },
    { id: "m_eclair", cls: "mage", lvl: 1, n: "Éclair en Chaîne", mp: 22, cd: 2, tg: "all", p: 1.2, fx: "bolt", eff: { pierce: 0.5 } },
    { id: "m_givre", cls: "mage", lvl: 3, n: "Nova de Givre", mp: 25, cd: 4, tg: "all", p: 0.9, fx: "frost", eff: { slow: [0.3, 2], pierce: 0.5 } },
    { id: "m_bouclier", cls: "mage", lvl: 6, n: "Bouclier Arcanique", mp: 20, cd: 4, tg: "self", p: 0, fx: "shield", eff: { shield: 0.25 } },
    { id: "m_meteore", cls: "mage", lvl: 10, n: "Météore", mp: 40, cd: 4, tg: "one", p: 3, fx: "meteor", eff: { stun: 1, pierce: 0.5 } },
    { id: "m_volmana", cls: "mage", lvl: 15, n: "Vol de Mana", mp: 0, cd: 3, tg: "one", p: 1.2, fx: "arcane", eff: { mp: 25, pierce: 0.5 } },
    { id: "m_tempete", cls: "mage", lvl: 22, n: "Tempête Arcanique", mp: 50, cd: 5, tg: "all", p: 2.2, fx: "arcane", eff: { pierce: 0.5 } },
    { id: "m_apoca", cls: "mage", lvl: 30, n: "Apocalypse", mp: 80, cd: 7, tg: "all", p: 4.5, fx: "meteor", eff: { burn: [0.4, 3], pierce: 0.5 } },
    // Paladin
    { id: "p_marteau", cls: "paladin", lvl: 1, n: "Marteau Sacré", mp: 10, cd: 0, tg: "one", p: 1.5, fx: "smash", eff: { heal: 0.08 } },
    { id: "p_bouclier", cls: "paladin", lvl: 1, n: "Bouclier Divin", mp: 15, cd: 3, tg: "self", p: 0, fx: "shield", eff: { shield: 0.35 } },
    { id: "p_jugement", cls: "paladin", lvl: 3, n: "Jugement", mp: 18, cd: 3, tg: "one", p: 1.6, fx: "holy", eff: { stun: 1 } },
    { id: "p_priere", cls: "paladin", lvl: 6, n: "Prière", mp: 25, cd: 4, tg: "self", p: 0, fx: "heal", eff: { heal: 0.35, cleanse: true } },
    { id: "p_consecr", cls: "paladin", lvl: 10, n: "Consécration", mp: 30, cd: 4, tg: "all", p: 1.4, fx: "holy", eff: { regen: [0.08, 3] } },
    { id: "p_armure", cls: "paladin", lvl: 15, n: "Armure Bénie", mp: 20, cd: 5, tg: "self", p: 0, fx: "shield", eff: { defup: [0.6, 3] } },
    { id: "p_lumiere", cls: "paladin", lvl: 22, n: "Lumière Vengeresse", mp: 40, cd: 5, tg: "one", p: 2.8, fx: "holy" },
    { id: "p_resur", cls: "paladin", lvl: 30, n: "Grâce Céleste", mp: 60, cd: 8, tg: "self", p: 0, fx: "heal", eff: { heal: 1, shield: 0.3 } },
    // Berserker
    { id: "b_fendoir", cls: "berserker", lvl: 1, n: "Fendoir", mp: 10, cd: 0, tg: "one", p: 1.75, fx: "bigslash" },
    { id: "b_ruee", cls: "berserker", lvl: 1, n: "Ruée Sanglante", mp: 0, cd: 2, tg: "one", p: 2.3, fx: "dash", eff: { selfdmg: 0.08 } },
    { id: "b_rage", cls: "berserker", lvl: 3, n: "Rage", mp: 0, cd: 4, tg: "self", p: 0, fx: "roar", eff: { atk: [0.6, 3], defup: [-0.2, 3] } },
    { id: "b_seisme", cls: "berserker", lvl: 6, n: "Séisme", mp: 25, cd: 3, tg: "all", p: 1.3, fx: "quake", eff: { stun: 1, chance: 0.3 } },
    { id: "b_soif", cls: "berserker", lvl: 10, n: "Soif de Sang", mp: 25, cd: 3, tg: "one", p: 2, fx: "bigslash", eff: { lifesteal: 0.5 } },
    { id: "b_pierre", cls: "berserker", lvl: 15, n: "Peau de Pierre", mp: 20, cd: 5, tg: "self", p: 0, fx: "shield", eff: { defup: [1, 2] } },
    { id: "b_carnage", cls: "berserker", lvl: 22, n: "Hache du Carnage", mp: 40, cd: 4, tg: "one", p: 3, fx: "bigslash", eff: { bleed: [0.35, 3] } },
    { id: "b_ragnarok", cls: "berserker", lvl: 30, n: "Ragnarök", mp: 60, cd: 7, tg: "one", p: 5, fx: "quake", eff: { splash: 1.5 } },
    // Moine
    { id: "o_rafale", cls: "moine", lvl: 1, n: "Rafale de Poings", mp: 10, cd: 0, tg: "one", p: 0.72, hits: 3, fx: "combo" },
    { id: "o_tornade", cls: "moine", lvl: 1, n: "Coup de Pied Tornade", mp: 18, cd: 2, tg: "all", p: 1, fx: "spin" },
    { id: "o_concen", cls: "moine", lvl: 3, n: "Concentration", mp: 0, cd: 3, tg: "self", p: 0, fx: "roar", eff: { mp: 30, crit: [0.2, 2] } },
    { id: "o_paume", cls: "moine", lvl: 6, n: "Paume Céleste", mp: 20, cd: 3, tg: "one", p: 1.8, fx: "holy", eff: { stun: 1 } },
    { id: "o_ombre", cls: "moine", lvl: 10, n: "Pas de l'Ombre", mp: 15, cd: 4, tg: "self", p: 0, fx: "smoke", eff: { dodge: 2, spd: [0.4, 3] } },
    { id: "o_cent", cls: "moine", lvl: 15, n: "Cent Mains", mp: 35, cd: 4, tg: "one", p: 0.65, hits: 6, fx: "combo" },
    { id: "o_medit", cls: "moine", lvl: 22, n: "Méditation", mp: 0, cd: 5, tg: "self", p: 0, fx: "heal", eff: { heal: 0.3, mp: 40 } },
    { id: "o_dragon", cls: "moine", lvl: 30, n: "Poing du Dragon", mp: 60, cd: 6, tg: "one", p: 4.5, fx: "fire", eff: { burn: [0.4, 3] } },
    // Grimoires (achetables, toutes classes)
    { id: "s_soin", cls: null, scroll: { gems: 40 }, n: "Soin Mineur", mp: 15, cd: 3, tg: "self", p: 0, fx: "heal", eff: { heal: 0.25 } },
    { id: "s_eclair", cls: null, scroll: { coins: 2400 }, n: "Éclair", mp: 15, cd: 1, tg: "one", p: 1.5, fx: "bolt", eff: { pierce: 0.4 } },
    { id: "s_bombe", cls: null, scroll: { coins: 4800 }, n: "Bombe de Craie", mp: 20, cd: 2, tg: "all", p: 1, fx: "fire" },
    { id: "s_hate", cls: null, scroll: { gems: 60 }, n: "Hâte", mp: 15, cd: 4, tg: "self", p: 0, fx: "smoke", eff: { spd: [0.5, 3] } },
    { id: "s_vampire", cls: null, scroll: { gems: 90 }, n: "Morsure Vampirique", mp: 20, cd: 2, tg: "one", p: 1.6, fx: "arcane", eff: { lifesteal: 0.6 } },
    { id: "s_barriere", cls: null, scroll: { coins: 9000 }, n: "Barrière", mp: 18, cd: 4, tg: "self", p: 0, fx: "shield", eff: { shield: 0.2 } },
    { id: "s_venin", cls: null, scroll: { gems: 120 }, n: "Nuage Toxique", mp: 25, cd: 3, tg: "all", p: 0.5, fx: "frost", eff: { poison: [0.25, 3] } },
    { id: "s_meteor", cls: null, scroll: { gems: 250 }, n: "Étoile Filante", mp: 45, cd: 5, tg: "all", p: 2.4, fx: "meteor" },
    // Enchantements portés par les armes légendaires et mythiques
    { id: "e_feu", cls: null, ench: true, n: "Lame de Feu", mp: 15, cd: 2, tg: "one", p: 1.6, fx: "fire", eff: { burn: [0.3, 3] } },
    { id: "e_givre", cls: null, ench: true, n: "Lame de Givre", mp: 15, cd: 2, tg: "one", p: 1.5, fx: "frost", eff: { slow: [0.3, 2] } },
    { id: "e_foudre", cls: null, ench: true, n: "Foudre Céleste", mp: 25, cd: 3, tg: "all", p: 1.3, fx: "bolt" },
    { id: "e_sang", cls: null, ench: true, n: "Lame Vampirique", mp: 18, cd: 2, tg: "one", p: 1.7, fx: "arcane", eff: { lifesteal: 0.5 } },
    { id: "e_sacre", cls: null, ench: true, n: "Lame Sacrée", mp: 30, cd: 4, tg: "one", p: 3, fx: "holy", eff: { heal: 0.15 } },
    { id: "e_neant", cls: null, ench: true, n: "Fente du Néant", mp: 40, cd: 4, tg: "all", p: 2.2, fx: "arcane", eff: { pierce: 0.6 } },
  ];
  const ABI = {};
  AB.forEach((a) => (ABI[a.id] = a));
  const ENCHANTS = AB.filter((a) => a.ench).map((a) => a.id);

  // ---------- Coffres (6 niveaux, améliorables) ----------
  // items : nombre d'objets · min : rareté minimum · f : facteur de rareté · sec : pièces (secondes de production)
  // up : coût pour passer au niveau suivant (éclats + secondes de production) · skin : chance d'apparence exclusive
  const CHEST_T = [
    { n: "Coffre en Bois", c: "#a0663f", c2: "#5b3a29", items: 1, min: 0, f: 1.3, gems: 0, sec: 120, up: { gems: 3, sec: 600 }, val: 40, skin: 0 },
    { n: "Coffre en Fer", c: "#94b0c2", c2: "#566c86", items: 2, min: 1, f: 1.8, gems: 2, sec: 300, up: { gems: 10, sec: 2400 }, val: 150, skin: 0 },
    { n: "Coffre Doré", c: "#ffcd75", c2: "#ef7d57", items: 2, min: 2, f: 2.6, gems: 5, sec: 900, up: { gems: 30, sec: 9000 }, val: 500, skin: 0.01 },
    { n: "Coffre de Diamant", c: "#73eff7", c2: "#41a6f6", items: 3, min: 2, f: 3.6, gems: 12, sec: 2700, up: { gems: 80, sec: 30000 }, val: 1600, skin: 0.04 },
    { n: "Coffre Mythique", c: "#ff5f6d", c2: "#b13e53", items: 3, min: 3, f: 5, gems: 30, sec: 7200, up: { gems: 200, sec: 100000 }, val: 5000, skin: 0.08 },
    { n: "Coffre Cosmique", c: "#b65cd6", c2: "#5d275d", items: 4, min: 4, f: 7, gems: 80, sec: 21600, up: null, val: 16000, skin: 0.15 },
  ];

  // ---------- Marchands troqueurs ----------
  const TRADERS = [
    { id: "gerard", n: "Gérard le Brocanteur", c: "#c8b48a", pref: null, mk: 1.15, look: { skin: "#c98c5e", hair: "#94b0c2", hs: "short", beard: "#94b0c2", top: "#8a5a3c", bottom: "#5b3a29", hat: "cap", hatC: "#5b3a29" }, line: "Tout m'intéresse, tant que ça brille un peu." },
    { id: "brokk", n: "Brokk le Forgeron", c: "#ef7d57", pref: "weapon", mk: 1.25, look: { skin: "#a0663f", hair: "#a8432a", hs: "bald", beard: "#a8432a", top: "#5b3a29", armor: "fur", bottom: "#333c57", hat: "horned", hatC: "#94b0c2" }, line: "Une lame mal forgée ? Je la refonds. Je paie bien les armes." },
    { id: "lilith", n: "Lilith la Collectionneuse", c: "#b65cd6", pref: "rare", mk: 1.3, look: { skin: "#f6d1b0", hair: "#1a1c2c", hs: "long", top: "#5d275d", armor: "robe", robe: "#5d275d", bottom: "#5d275d", hat: "crown", hatC: "#b65cd6", wings: "bat", aura: "shadow" }, line: "Je ne collectionne que l'exceptionnel. Épique ou rien." },
    { id: "sylve", n: "Sylve la Tisseuse", c: "#a7f070", pref: "armor", mk: 1.2, look: { skin: "#e8b48a", hair: "#e8c170", hs: "ponytail", ears: true, top: "#38b764", bottom: "#257179", hat: "hood", hatC: "#257179" }, line: "Tes vieilles armures valent de l'or chez moi." },
    { id: "zed", n: "Zed le Contrebandier", c: "#73eff7", pref: "acc", mk: 1.1, look: { skin: "#6e4630", hair: "#73eff7", hs: "mohawk", top: "#1a1c2c", bottom: "#29366f", scarf: "#73eff7", eye: "#73eff7" }, line: "Bijoux, talismans, orbes… pas de questions." },
  ];

  // ---------- Objets v2 (noms fantasy, aspect visible sur le héros) ----------
  // [nom, icône, aspect]
  const ITEM_NAMES = {
    weapon: [["Épée", "sword", "sword"], ["Espadon", "great", "great"], ["Hache", "axe", "axe"], ["Marteau de guerre", "hammer", "hammer"], ["Bâton runique", "staff", "staff"], ["Lance", "spear", "spear"], ["Faux", "scythe", "scythe"], ["Dagues jumelles", "dagger", "dagger"], ["Kettlebell-fléau", "kettlebell", "flail"], ["Haltère-massue", "dumbbell", "mace"], ["Poings du Dragon", "fist", "fist"], ["Fouet runique", "whip", "whip"]],
    head: [["Bandeau", "band", "band"], ["Heaume", "helm", "helm"], ["Couronne", "crown", "crown"], ["Capuche", "hood", "hood"], ["Chapeau de mage", "wizard", "wizard"], ["Casque à cornes", "horned", "horned"]],
    top: [["Débardeur enchanté", "top", "tank"], ["Plastron", "armor", "plate"], ["Cotte de mailles", "armor", "mail"], ["Robe de mage", "robe", "robe"], ["Kimono de combat", "top", "gi"], ["Pelisse de fourrure", "top", "fur"]],
    hands: [["Gantelets", "hands", "gaunt"], ["Bracelets runiques", "hands", "bracer"], ["Poignes de dragon", "hands", "claw"]],
    legs: [["Jambières", "legs", "greaves"], ["Sarouel", "legs", "pants"], ["Cuissardes", "legs", "greaves"]],
    feet: [["Bottes", "feet", "boots"], ["Grèves", "feet", "boots"], ["Sandales ailées", "feet", "sandals"]],
    acc: [["Amulette", "acc", "amulet"], ["Anneau", "ring", "ring"], ["Orbe", "orb", "orb"], ["Talisman", "acc", "talisman"], ["Ceinture de champion", "belt", "belt"]],
  };
  const ITEM_SUFFIX = [
    ["du Débutant", "de Récup", "du Quartier", "d'Entraînement"],
    ["du Parc", "du Gardien", "de la Forge", "du Soldat"],
    ["du Gymnaste", "des Barres", "du Rôdeur", "de l'Arcane"],
    ["du Champion", "des Ombres", "du Berserker", "des Runes"],
    ["du Dragon", "du Titan", "des Anciens", "du Phénix"],
    ["des Dieux", "de l'Abysse", "du Cosmos", "de l'Éternité"],
  ];
  // Couleur de matière selon la rareté (armures, casques…)
  const MAT = ["#8a5a3c", "#94b0c2", "#41a6f6", "#b65cd6", "#ffcd75", "#ff5f6d"];
  // Aspect des anciens objets (v1) → aspect v2
  const ICON_VIS = { dumbbell: "mace", kettlebell: "flail", whip: "whip", bar: "spear", staff: "staff", plate: "mace", sword: "great", head: "band", top: "tank", hands: "gaunt", legs: "pants", feet: "boots", acc: "amulet" };

  // Armes uniques v2 : aspect et capacité
  const UQ_V2 = {
    u_whip: { vis: "whip", ab: "e_foudre" }, u_flail: { vis: "flail", ab: "e_sang" }, u_wind: { vis: "band" }, u_bo: { vis: "staff", ab: "e_givre" },
    u_remote: { vis: "orb" }, u_titan: { vis: "claw" }, u_laser: { vis: "great", ab: "e_neant" }, u_excal: { vis: "great", ab: "e_sacre" },
  };

  // ---------- Apparences fantasy extravagantes ----------
  // hat, wings (angel, bat, dragon, fairy, fire, mech), aura (gold, fire, frost, shadow, cosmic, holy, nature, blood), halo, horns, ears, tail, eye (couleur d'yeux lumineux)
  const SKINS = [
    { id: "base", n: "Aventurier", src: "Ton apparence de départ (et ta classe)", look: {}, bonus: null },
    { id: "rocky", n: "Chevalier du Parc", src: "Terminer le Parc du Quartier", look: { top: "#3b5dc9", top2: "#c2d3de", armor: "plate", pauldron: "#c2d3de", bottom: "#29366f", pants: "long", boots: "#566c86", gloves: "#94b0c2", hat: "helm", hatC: "#c2d3de", plume: "#b13e53", cape: "#3b5dc9" }, bonus: ["rep", 0.05] },
    { id: "spectre", n: "Spectre Hanté", src: "Terminer la Salle Abandonnée", look: { skin: "#cfe3ee", hair: "#f4f4f4", hs: "long", top: "#94b0c2", armor: "robe", robe: "#94b0c2", bottom: "#566c86", pants: "long", boots: "#94b0c2", eye: "#73eff7", aura: "frost", ghost: true }, bonus: ["crit", 0.03] },
    { id: "ninja", n: "Ninja des Ombres", src: "Terminer Les Toits de la Ville", look: { top: "#1a1c2c", top2: "#b13e53", armor: "leather", sleeves: "long", bottom: "#1a1c2c", pants: "long", boots: "#1a1c2c", gloves: "#1a1c2c", hat: "ninja", hatC: "#1a1c2c", scarf: "#b13e53", eye: "#ff5f6d", aura: "shadow" }, bonus: ["spd", 1] },
    { id: "moine", n: "Moine du Lotus", src: "Terminer le Temple Shaolin", look: { hs: "bald", top: "#ef7d57", top2: "#ffcd75", armor: "gi", sleeves: "none", bottom: "#ef7d57", pants: "long", boots: "#5b3a29", aura: "gold", halo: true }, bonus: ["defp", 0.05] },
    { id: "squelette", n: "Roi Liche", src: "Terminer la Crypte des Sédentaires", look: { skin: "#f4f4f4", hs: "bald", top: "#5d275d", armor: "robe", robe: "#3a1a3a", bottom: "#3a1a3a", pants: "long", boots: "#1a1c2c", bones: true, eye: "#a7f070", hat: "crown", hatC: "#a7f070", cape: "#3a1a3a", aura: "shadow" }, bonus: ["atkp", 0.05] },
    { id: "viking", n: "Berserker des Forges", src: "Terminer le Volcan des Forges", look: { top: "#8a5a3c", armor: "fur", sleeves: "none", bottom: "#5b3a29", pants: "long", hat: "horned", hatC: "#94b0c2", hair: "#e8c170", hs: "long", beard: "#e8c170", boots: "#5b3a29", aura: "fire" }, bonus: ["hpp", 0.08] },
    { id: "cyber", n: "Cyber-Paladin", src: "Terminer l'Arène Néon", look: { top: "#29366f", top2: "#73eff7", armor: "plate", pauldron: "#73eff7", bottom: "#1a1c2c", pants: "long", boots: "#73eff7", gloves: "#29366f", hat: "visor", hatC: "#73eff7", wings: "mech", eye: "#73eff7" }, bonus: ["prod", 0.08] },
    { id: "goat", n: "Dieu de l'Olympe", src: "Terminer L'Olympe", look: { skin: "#ffcd75", hair: "#f4f4f4", hs: "long", top: "#f4f4f4", top2: "#ffcd75", armor: "robe", robe: "#f4f4f4", bottom: "#ffcd75", hat: "laurel", boots: "#ffcd75", wings: "angel", aura: "holy", eye: "#ffcd75" }, bonus: ["prod", 0.15] },
    { id: "spartan", n: "Spartiate Immortel", src: "Atteindre le palier 4 d'un raid", look: { top: "#b13e53", top2: "#ffcd75", armor: "plate", pauldron: "#c08a40", sleeves: "none", bottom: "#b13e53", pants: "short", hat: "spartan", boots: "#5b3a29", cape: "#b13e53", aura: "gold" }, bonus: ["atkp", 0.08] },
    { id: "flamme", n: "Phénix Éternel", src: "Série de 30 jours", look: { hs: "fire", top: "#b13e53", top2: "#ffcd75", armor: "gi", sleeves: "none", bottom: "#1a1c2c", boots: "#ef7d57", wings: "fire", aura: "fire", eye: "#ffcd75" }, bonus: ["rep", 0.1] },
    { id: "aerobic", n: "Idole Néon 80's", src: "Boutique : 150 éclats", price: 150, look: { top: "#e05fa8", sleeves: "none", bottom: "#73eff7", pants: "long", hat: "band", hatC: "#ffcd75", boots: "#f4f4f4", hair: "#e8c170", hs: "ponytail", aura: "cosmic" }, bonus: ["xp", 0.05] },
    { id: "pirate", n: "Capitaine des Abysses", src: "Boutique : 200 éclats", price: 200, look: { top: "#257179", top2: "#ffcd75", armor: "leather", sleeves: "long", bottom: "#1a1c2c", pants: "long", hat: "pirate", hatC: "#1a1c2c", boots: "#1a1c2c", patch: true, cape: "#257179", aura: "frost", beard: "#2a1d1a" }, bonus: ["loot", 0.1] },
    { id: "elfe", n: "Rôdeur Elfe", src: "Boutique : 250 éclats", price: 250, look: { skin: "#f6d1b0", hair: "#e8c170", hs: "long", ears: true, top: "#38b764", top2: "#a7f070", armor: "leather", bottom: "#257179", pants: "long", hat: "hood", hatC: "#257179", boots: "#5b3a29", aura: "nature", wings: "fairy" }, bonus: ["crit", 0.04] },
    { id: "pharaon", n: "Pharaon Solaire", src: "Boutique : 300 éclats", price: 300, look: { top: "#f4f4f4", top2: "#ffcd75", armor: "robe", robe: "#f4f4f4", bottom: "#f4f4f4", pants: "short", hat: "pharaoh", boots: "#ffcd75", wings: "fairy", wingC: "#ffcd75", aura: "gold" }, bonus: ["prod", 0.06] },
    { id: "ange", n: "Ange Céleste", src: "Boutique : 450 éclats", price: 450, look: { hair: "#fff3c0", hs: "long", top: "#f4f4f4", top2: "#ffcd75", armor: "robe", robe: "#f4f4f4", bottom: "#f4f4f4", boots: "#ffcd75", wings: "angel", halo: true, aura: "holy", eye: "#41a6f6" }, bonus: ["hpp", 0.1] },
    { id: "demon", n: "Démon Infernal", src: "Boutique : 600 éclats", price: 600, look: { skin: "#c0384a", hair: "#1a1c2c", hs: "spiky", top: "#1a1c2c", top2: "#ff5f6d", armor: "plate", pauldron: "#1a1c2c", bottom: "#1a1c2c", pants: "long", boots: "#1a1c2c", horns: "#f4f4f4", wings: "bat", tail: "#c0384a", aura: "fire", eye: "#ffcd75" }, bonus: ["atkp", 0.1] },
    { id: "dragon", n: "Chevalier Dragon", src: "Terminer un donjon en Légende", look: { top: "#38b764", top2: "#ffcd75", armor: "plate", pauldron: "#257179", bottom: "#257179", pants: "long", boots: "#257179", gloves: "#38b764", hat: "dragonhelm", hatC: "#38b764", wings: "dragon", tail: "#38b764", aura: "nature", eye: "#ffcd75" }, bonus: ["atkp", 0.12] },
    { id: "givre", n: "Roi du Givre", src: "Atteindre 100 paliers de donjon", look: { skin: "#cfe3ee", hair: "#f4f4f4", hs: "spiky", top: "#41a6f6", top2: "#f4f4f4", armor: "plate", pauldron: "#73eff7", bottom: "#29366f", pants: "long", boots: "#73eff7", hat: "icecrown", hatC: "#73eff7", wings: "fairy", wingC: "#a0e8ff", aura: "frost", eye: "#73eff7", cape: "#29366f" }, bonus: ["defp", 0.1] },
    { id: "cosmique", n: "Esprit Cosmique", src: "Effectuer une Renaissance", look: { skin: "#5d275d", hair: "#b65cd6", hs: "fire", top: "#29366f", top2: "#73eff7", armor: "robe", robe: "#29366f", bottom: "#29366f", boots: "#b65cd6", eye: "#73eff7", aura: "cosmic", halo: true, cosmic: true }, bonus: ["prod", 0.12] },
    { id: "archimage", n: "Archimage Étoilé", src: "Coffre de Diamant ou mieux (rare)", chest: 3, look: { hair: "#f4f4f4", hs: "long", beard: "#f4f4f4", top: "#3b5dc9", top2: "#ffcd75", armor: "robe", robe: "#3b5dc9", bottom: "#3b5dc9", hat: "wizard", hatC: "#3b5dc9", boots: "#29366f", aura: "cosmic", eye: "#73eff7" }, bonus: ["xp", 0.1] },
    { id: "vampire", n: "Comte Vampire", src: "Coffre Mythique ou mieux (rare)", chest: 4, look: { skin: "#e8e0f0", hair: "#1a1c2c", hs: "spiky", top: "#1a1c2c", top2: "#b13e53", armor: "leather", sleeves: "long", bottom: "#1a1c2c", pants: "long", boots: "#1a1c2c", cape: "#b13e53", collar: true, wings: "bat", eye: "#ff5f6d", aura: "blood" }, bonus: ["loot", 0.15] },
    { id: "samourai", n: "Samouraï Lunaire", src: "Coffre Mythique ou mieux (rare)", chest: 4, look: { top: "#b13e53", top2: "#1a1c2c", armor: "plate", pauldron: "#b13e53", bottom: "#1a1c2c", pants: "long", boots: "#1a1c2c", hat: "kabuto", hatC: "#1a1c2c", hair: "#1a1c2c", hs: "ponytail", aura: "blood", eye: "#ffcd75" }, bonus: ["crit", 0.06] },
  ];
  const SKIN = {};
  SKINS.forEach((s) => (SKIN[s.id] = s));

  // ---------- Donjons à paliers ----------
  const FLOORS = 30;

  // Succès v2 (ajoutés à la liste)
  const ACHS2 = [
    { id: "a_fl30", n: "Grimpeur", d: "Franchis 30 paliers de donjon", v: (S) => S.life.floors || 0, n2: 30, gems: 30 },
    { id: "a_fl100", n: "Conquérant des Abysses", d: "Franchis 100 paliers de donjon", v: (S) => S.life.floors || 0, n2: 100, gems: 80 },
    { id: "a_fl300", n: "Seigneur des Profondeurs", d: "Franchis 300 paliers de donjon", v: (S) => S.life.floors || 0, n2: 300, gems: 200 },
    { id: "a_cls10", n: "Vétéran", d: "Monte une classe au niveau 10", v: (S) => Math.max(0, ...Object.values(S.classes || {}).map((c) => c.lvl || 1)), n2: 10, gems: 40 },
    { id: "a_cls30", n: "Légende de Classe", d: "Monte une classe au niveau 30", v: (S) => Math.max(0, ...Object.values(S.classes || {}).map((c) => c.lvl || 1)), n2: 30, gems: 150 },
    { id: "a_trade5", n: "Négociant", d: "Réalise 5 échanges", v: (S) => S.life.trades || 0, n2: 5, gems: 30 },
    { id: "a_chest25", n: "Chasseur de Trésors", d: "Ouvre 25 coffres", v: (S) => S.life.chests || 0, n2: 25, gems: 50 },
    { id: "a_cosmic", n: "Poussière d'Étoiles", d: "Ouvre un Coffre Cosmique", v: (S) => S.life.bestChest || 0, n2: 5, gems: 100 },
  ];

  Object.assign(D, { CLASSES, CLASS_ORDER, AB, ABI, ENCHANTS, CHEST_T, TRADERS, ITEM_NAMES, ITEM_SUFFIX, MAT, ICON_VIS, UQ_V2, SKINS, SKIN, FLOORS });
  D.ACHS = D.ACHS.concat(ACHS2);
  D.HAIR_STYLES = [["short", "Court"], ["spiky", "Pointu"], ["long", "Long"], ["ponytail", "Queue"], ["mohawk", "Crête"], ["bun", "Chignon"], ["bald", "Rasé"]];
  D.SKIN_TONES = D.SKIN_TONES.concat(["#cfe3ee", "#8fd18a"]);
  D.HAIR_COLORS = D.HAIR_COLORS.concat(["#f4f4f4", "#73eff7", "#b65cd6", "#a7f070"]);
  for (const k in UQ_V2) if (D.UNIQUES[k]) Object.assign(D.UNIQUES[k], UQ_V2[k]);
  D.UNIQUES.u_laser.icon = "great"; D.UNIQUES.u_excal.icon = "great"; D.UNIQUES.u_bo.icon = "staff";
})(window.DT);
