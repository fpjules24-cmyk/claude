# Donjons & Tractions

Jeu idle / pseudo-MMO en pixel art, pensé pour le téléphone : ton héros devient plus fort quand **toi** tu t'entraînes en calisthénie.

Deux faces : côté **sport**, ton athlète réaliste montre les exercices et les skills de calisthénie en pixel art ; côté **aventure**, son alter ego fantasy (épées géantes, ailes, auras, armures extravagantes) grimpe les donjons au tour par tour.

**Jouer sur téléphone :** https://claude.ai/artifact/QgSMWNBPEvwGYZxu2Kg4pM (lien privé : ouvre-le avec ton compte claude.ai, partage-le depuis le menu « Partager » de la page).

## Le principe

1. **Fais de vrais exercices** (pompes, tractions, dips, squats, gainage, poirier, burpees… 27 exercices) et enregistre-les : compteur à taper à chaque rep (le nez marche pour les pompes) ou chrono pour les maintiens. Chaque rep rapporte des **pièces**, de l'**XP** et de l'**énergie**, et active le **PUMP** (production x2).
2. **Débloque les 49 skills de calisthénie**, des pompes jusqu'au maltese, au full front lever et à la manna, répartis en 6 familles (Poussée, Tirage, Équilibre, Gainage, Jambes, Explosivité). Comme en vrai : chaque skill demande ses prérequis et un **volume d'entraînement réel** dans sa famille. Une fois appris, il devient un **générateur** de pièces (niveaux, paliers x2 à 10/25/50/100…).
3. **Certifie tes skills IRL** quand tu les réussis pour de vrai : production x3 et éclats bonus.
4. **Les Éclats**, deuxième monnaie, se débloquent avec ton premier nouveau skill : coffres, grimoires, enchantements, apparences, énergie, boosts.
5. **Choisis ta classe** : Guerrier (Poussée), Assassin (Tirage), Mage (Équilibre), Paladin (Gainage), Berserker (Jambes) ou Moine (Explosivité). Chaque classe monte de niveau avec **ses exercices réels**, ses skills et les donjons ; chaque niveau donne un point pour apprendre ou renforcer une capacité (8 par classe, rang 5 max). Change de classe quand tu veux : chacune garde sa progression.
6. **Combats au tour par tour** : ordre des tours selon la vitesse, mana, recharges, 4 capacités équipées, garde, potions, cibles à choisir, effets (brûlure, poison, saignement, étourdissement, boucliers, marques…), ennemis qui chargent des attaques lourdes à interrompre. Mode auto et vitesse x1 à x3.
7. **8 donjons de 30 paliers** (Normal, Héroïque, Légende) : expéditions de 10 paliers, gardiens aux paliers 10 et 20, boss au 30, et **un coffre plus rare tous les 10 paliers**. Points de reprise aux paliers 11 et 21.
8. **Coffres améliorables** : 6 niveaux (Bois, Fer, Doré, Diamant, Mythique, Cosmique), amélioration contre éclats et pièces, fusion de 3 coffres identiques, apparences exclusives cachées dans les meilleurs.
9. **Le Marché** : armurerie (vrai matos pour ta classe, essayage sur ton héros), **échanges** où chaque objet a une **valeur** (cote du jour par emplacement, 5 marchands aux goûts différents), grimoires de capacités pour toutes les classes, **enchantements** (achète une capacité sur une arme ou un accessoire), boutique d'éclats, et échange entre potes par code à usage unique.

## Et aussi

- **Séance guidée** : le coach génère une séance complète (échauffement, travail de ton prochain skill, force, finisher, étirements) selon ta durée, ton focus, ton niveau et ton matériel, avec chrono, temps de repos et bips.
- **Le Parc** : hub vivant qui suit l'heure réelle (jour, coucher de soleil, nuit), autres athlètes qui s'entraînent et discutent, tape pour encourager ton héros.
- **Raid hebdomadaire** contre un boss de la communauté, avec paliers de récompenses.
- **Classement**, **quêtes du jour** (dont des quêtes IRL), **43 succès**, **série d'entraînement** (un jour de repos toléré), **Renaissance** (prestige avec l'Aura), gains hors ligne, 23 apparences fantasy (Phénix, Démon, Roi Liche, Chevalier Dragon, Esprit Cosmique…), 8 familiers, effets sonores et musique 8-bit, vibrations.
- Les sauvegardes de la v1 sont migrées : tes skills et tout ton entraînement passé donnent de l'XP à tes classes, ton record de donjon devient le palier 30.
- **Sauvegarde** locale automatique, export/import par code, et **sauvegarde cloud** synchronisée entre téléphone et ordinateur quand le jeu est ouvert comme artifact claude.ai (le classement et le raid montrent alors aussi les vrais joueurs qui ont accès au lien).

## Structure

```
index.html            version installable (PWA : manifeste + service worker, jouable hors connexion)
css/style.css         interface pixel art
js/util.js            format des nombres, hasard, dates, DOM
js/data.js            contenu : exercices, skills, stuff, donjons, quêtes, succès, séances
js/data2.js           monde fantasy : classes, capacités, coffres, marchands, apparences
js/pixel.js           moteur pixel art : sprites, athlète à squelette animé (56 poses), décors
js/figure.js          héros fantasy (armes, ailes, auras, armures), poses de combat, icônes d'objets, coffres
js/state.js           état, sauvegarde, calculs (production, stats, équilibrage des ennemis)
js/game.js            règles et actions
js/battle.js          combat au tour par tour (moteur + rendu animé)
js/scr_*.js           écrans : Parc, Sport, Skills, Héros, Donjons, Marché, social et réglages
js/net.js             en ligne optionnel (sauvegarde cloud, classement, raid)
js/main.js            démarrage, boucles, sauvegarde automatique
build.py              assemble dist/donjons-et-tractions.html (page unique publiée en artifact)
```

## Lancer en local

Ouvre `index.html` dans un navigateur, ou sers le dossier (`npx serve donjons-et-tractions`) pour profiter de la PWA. Pour l'installer sur l'écran d'accueil, héberge le dossier en HTTPS (GitHub Pages par exemple) puis « Ajouter à l'écran d'accueil ».

Après une modification : `python3 build.py` régénère la page unique.

Écoute ton corps : échauffe-toi, progresse doucement, et consulte un professionnel en cas de douleur.
