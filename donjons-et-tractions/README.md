# Donjons & Tractions

Jeu idle / pseudo-MMO en pixel art, pensé pour le téléphone : ton héros devient plus fort quand **toi** tu t'entraînes en calisthénie.

**Jouer sur téléphone :** https://claude.ai/artifact/QgSMWNBPEvwGYZxu2Kg4pM (lien privé : ouvre-le avec ton compte claude.ai, partage-le depuis le menu « Partager » de la page).

## Le principe

1. **Fais de vrais exercices** (pompes, tractions, dips, squats, gainage, poirier, burpees… 27 exercices) et enregistre-les : compteur à taper à chaque rep (le nez marche pour les pompes) ou chrono pour les maintiens. Chaque rep rapporte des **pièces**, de l'**XP** et de l'**énergie**, et active le **PUMP** (production x2).
2. **Débloque les 49 skills de calisthénie**, des pompes jusqu'au maltese, au full front lever et à la manna, répartis en 6 familles (Poussée, Tirage, Équilibre, Gainage, Jambes, Explosivité). Comme en vrai : chaque skill demande ses prérequis et un **volume d'entraînement réel** dans sa famille. Une fois appris, il devient un **générateur** de pièces (niveaux, paliers x2 à 10/25/50/100…).
3. **Certifie tes skills IRL** quand tu les réussis pour de vrai : production x3 et éclats bonus.
4. **Les Éclats**, deuxième monnaie, se débloquent avec ton premier nouveau skill : coffres, apparences, énergie, boosts.
5. **Équipe-toi** (7 emplacements, 6 raretés, améliorations +10) et **explore 8 donjons** en combat temps réel : chaque skill débloqué te donne une technique de combat. Premières victoires = apparences, armes uniques, familiers, objets mythiques.

## Et aussi

- **Séance guidée** : le coach génère une séance complète (échauffement, travail de ton prochain skill, force, finisher, étirements) selon ta durée, ton focus, ton niveau et ton matériel, avec chrono, temps de repos et bips.
- **Le Parc** : hub vivant qui suit l'heure réelle (jour, coucher de soleil, nuit), autres athlètes qui s'entraînent et discutent, tape pour encourager ton héros.
- **Raid hebdomadaire** contre un boss de la communauté, avec paliers de récompenses.
- **Classement**, **quêtes du jour** (dont des quêtes IRL), **35 succès**, **série d'entraînement** (un jour de repos toléré), **Renaissance** (prestige avec l'Aura), gains hors ligne, 14 apparences, 8 familiers, effets sonores et musique 8-bit, vibrations.
- **Sauvegarde** locale automatique, export/import par code, et **sauvegarde cloud** synchronisée entre téléphone et ordinateur quand le jeu est ouvert comme artifact claude.ai (le classement et le raid montrent alors aussi les vrais joueurs qui ont accès au lien).

## Structure

```
index.html            version installable (PWA : manifeste + service worker, jouable hors connexion)
css/style.css         interface pixel art
js/util.js            format des nombres, hasard, dates, DOM
js/data.js            contenu : exercices, skills, stuff, donjons, quêtes, succès, séances
js/pixel.js           moteur pixel art : sprites, personnage à squelette animé (56 poses), décors
js/state.js           état, sauvegarde, calculs (production, stats, équilibrage des ennemis)
js/game.js            règles et actions
js/battle.js          moteur de combat (simulation + rendu)
js/scr_*.js           écrans : Parc, Sport, Skills, Donjons, Stuff, social et réglages
js/net.js             en ligne optionnel (sauvegarde cloud, classement, raid)
js/main.js            démarrage, boucles, sauvegarde automatique
build.py              assemble dist/donjons-et-tractions.html (page unique publiée en artifact)
```

## Lancer en local

Ouvre `index.html` dans un navigateur, ou sers le dossier (`npx serve donjons-et-tractions`) pour profiter de la PWA. Pour l'installer sur l'écran d'accueil, héberge le dossier en HTTPS (GitHub Pages par exemple) puis « Ajouter à l'écran d'accueil ».

Après une modification : `python3 build.py` régénère la page unique.

Écoute ton corps : échauffe-toi, progresse doucement, et consulte un professionnel en cas de douleur.
