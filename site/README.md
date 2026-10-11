# Site Zéro Oubli

Site statique (HTML, CSS, un peu de JavaScript), sans dépendance à installer.

Score Lighthouse mesuré en octobre 2026, en mode mobile, sur la page d'accueil et les mentions légales : 100 en SEO, accessibilité, bonnes pratiques et performance.

## Fichiers

- `index.html` : page d'accueil (accroche, méthode, packs, réalisations, FAQ, formulaire de diagnostic)
- `mentions-legales.html` : mentions légales et confidentialité (obligatoires en France)
- `robots.txt`, `sitemap.xml` : indexation par les moteurs de recherche
- `favicon.svg`, `apple-touch-icon.png`, `og-image.png` : icônes et image de partage (1200 × 630)

## À remplacer avant la mise en ligne

1. **Le domaine** : `https://www.zero-oubli.fr/` apparaît dans `index.html` (canonical, Open Graph, données structurées), `mentions-legales.html`, `robots.txt` et `sitemap.xml`. Remplace-le par ton vrai domaine.
2. **Le formulaire** : `action="[URL-DU-SERVICE-DE-FORMULAIRE]"` dans `index.html`. Branche-le sur un service de formulaires (Tally, Formspree, Netlify Forms…) pour recevoir les demandes.
3. **Les textes entre crochets** : clients pilotes, résultats, photos (1600 × 900), coordonnées, SIRET, hébergeur.
4. **Les prix** (39 €/mois + 290 € d'installation) s'ils changent : dans la page et dans les données structurées en haut de `index.html`.

## Tester en local

```bash
npx serve site
```

## Mise en ligne

N'importe quel hébergeur de site statique convient (Netlify, Vercel, GitHub Pages, OVH…). Après la mise en ligne, déclare le site et le `sitemap.xml` dans Google Search Console, et crée une fiche Google Business Profile.
