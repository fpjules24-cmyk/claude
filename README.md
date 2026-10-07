# Site vitrine — Marie-Claude SANCHEZ, psychologue clinicienne

Site d'une seule page, interactif et responsive, pour le cabinet de Marie-Claude SANCHEZ
(132 rue François de Sourdis, 33000 Bordeaux — Centre de Santé Sourdis).

L'identité visuelle reprend celle de la carte de visite :

| Rôle | Couleur |
| --- | --- |
| Fond crème (carte) | `#FFE7C2` |
| Pervenche (gouttes « cachemire ») | `#99ACFF` / `#A0B0FA` |
| Bleu nuit (motifs, « Psychologue clinicienne ») | `#031D8C` |

- **Titres :** *Della Respira*, la police Google Fonts la plus proche de celle de la carte
  (empattements fins, « 3 » à tête plate).
- **Texte courant :** *Plus Jakarta Sans*.

## Contenu de la page

1. **Bandeau d'adresse fixe** avec l'adresse (lien vers l'itinéraire Google Maps), le téléphone,
   l'e-mail et l'état du cabinet en direct (« Ouvert · dernier RDV à 18h00 », « Fermé · ouvre samedi
   à 08h00 »…), calculé à l'heure de Paris.
2. **En-tête fixe** en verre dépoli, avec le nom, la navigation, le téléphone et un bouton
   « Prendre RDV ». Sur mobile, une barre en bas d'écran garde l'adresse, l'appel et le RDV
   toujours à portée de pouce.
3. **Hero 3D (Three.js)** : les gouttes cachemire et les vrilles de la carte, modélisées en 3D.
   Elles tournent lentement et réagissent à la souris (inclinaison, légère répulsion, survol).
4. **Le cabinet** : carrousel de photos avec fondu, zoom lent, défilement automatique avec pause,
   vignettes, glisser au doigt, flèches du clavier et visionneuse plein écran.
5. **Accompagnement** : trois cartes 3D (Enfants, Adolescents, Adultes) qui s'inclinent sous le
   curseur, avec un reflet et un effet de profondeur.
6. **Tarifs & horaires** : 60 € / 50 € (étudiants). Consultations **uniquement le samedi** :
   8h–12h et 13h–18h, dernier rendez-vous à 18h (la séance ne se termine pas à 18h). Frise de la
   semaine, jour courant et heure actuelle.
7. **Contact & mentions** : liens directs (`tel:0601685312`, `mailto:`, Google Maps), boutons
   « copier », photo de l'entrée avec repère sur la plaque, numéros ADELI et RPPS, numéros d'urgence.
8. **Pied de page** avec le rappel des informations légales et une fenêtre « Mentions légales ».

## Structure

```
index.html   ← tout le site : HTML, CSS et JavaScript dans un seul fichier
images/      ← photos du cabinet (JPEG optimisés)
```

Le fichier est autonome : il charge seulement Three.js (cdnjs, avec contrôle d'intégrité SRI) et
les deux polices (Google Fonts). Il fonctionne tel quel dans un aperçu Claude Artifacts. Dans ce
cas, si les photos ne sont pas hébergées à côté du fichier, elles sont remplacées par des visuels
d'attente.

## Personnaliser

Les endroits à modifier sont signalés par `✏️` dans `index.html`.

- **Photos du cabinet :** remplacez les fichiers du dossier `images/` en gardant les mêmes noms,
  ou changez les chemins `src`. Dans chaque diapositive, `--pos` règle le cadrage
  (ex. `--pos:50% 40%`), et `data-title` / `data-text` donnent le titre et la légende affichés.
  Une photo manquante est remplacée par un visuel d'attente élégant.
- **Horaires :** modifiez la carte « HORAIRES » dans le HTML **et** la constante `HOURS` en haut du
  script : c'est elle qui calcule l'état « Ouvert / Fermé ». Un 3e élément `true` sur un créneau
  indique que l'heure de fin est celle du dernier rendez-vous (cas du samedi à 18h).
- **Tarifs, textes :** directement dans le HTML (sections `#tarifs`, `#accompagnement`, etc.).
- **Couleurs :** variables CSS au début de la feuille de style (`--cream`, `--peri`, `--royal`…).
- **Mentions légales :** la rubrique « Hébergement » est remplie pour Cloudflare Pages. Si le site est
  publié ailleurs, indiquez le nom, l'adresse et le téléphone du nouvel hébergeur (mention obligatoire).

## Mettre en ligne

C'est un site statique : il suffit de déposer `index.html` et le dossier `images/` chez un hébergeur.

**Méthode conseillée, gratuite : Cloudflare Pages.** Dans le tableau de bord Cloudflare :
*Workers & Pages → Create application → Get started → Drag and drop your files*, puis nommer le
projet et déposer une archive ZIP contenant `index.html` et `images/` à sa racine. Le site est en
ligne à l'adresse `<nom-du-projet>.pages.dev`.

Autres possibilités : Netlify (glisser-déposer) ou GitHub Pages (dépôt public sur le plan gratuit).

## Qualité, accessibilité, performances

- Responsive (mobile, tablette, ordinateur), vérifié de 390 px à 1920 px.
- Animations limitées à `transform` / `opacity`. La scène 3D se met en pause hors écran et quand
  l'onglet est masqué ; la résolution est plafonnée sur les écrans haute densité.
- Préférence « réduire les animations » respectée : 3D figée, pas de défilement automatique.
- Sans WebGL, ou si le CDN est bloqué, des motifs SVG prennent le relais.
- Navigation au clavier, focus visibles, fenêtres modales natives (`<dialog>`), textes alternatifs,
  contrastes conformes, données structurées `schema.org` pour le référencement local.
- Aucun cookie ni outil de mesure d'audience. Pour supprimer tout appel à un serveur tiers (RGPD),
  vous pouvez héberger vous-même les polices et `three.min.js`, puis mettre à jour les liens.
