# Documentation — Carte interactive RGPH 2024 (map-frontend)

Application Nuxt 3 en **SPA statique** qui présente les résultats du RGPH-3
(INSTAD, 2024) sous forme de carte choroplèthe des 6 régions de Djibouti,
trilingue (fr / ar / en), alimentée par l'API `map-backend`.

Pour la mise en production, voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md).
Pour les anomalies relevées lors de l'audit, voir [`AUDIT.md`](AUDIT.md).

---

## 1. Pile technique

| Élément | Version installée | Rôle |
|---|---|---|
| Nuxt | 3.13.2 | framework, routage par fichiers, Vite 6 |
| Vue | 3.5.27 | composants, `<script setup>` |
| @nuxtjs/i18n | 8.3.3 | 3 locales, stratégie `no_prefix`, RTL |
| Pinia | 2.3.1 (`@pinia/nuxt` 0.5.4) | stores `theme` et `map` |
| Leaflet | 1.9.4 | carte, fond satellite Esri, couche GeoJSON |
| Chart.js | 4.5.1 | graphiques en barres |
| Sass | 1.97 | design system `assets/scss/main.scss` |
| TypeScript / vue-tsc | 5.9.3 / 1.8.27 | vérification de types **désactivée** : cette combinaison est cassée, cf. AUDIT F-01 |

Aucun test, aucun linter.

## 2. Mode de rendu et conséquences

`nuxt.config.ts` fixe `ssr: false` et `nitro.preset: 'static'` :
`nuxi generate` produit `.output/public`, servi par le nginx du conteneur.
Il n'y a **aucun processus Node en production**.

Deux conséquences structurantes :

1. `runtimeConfig.public.apiBase` est **figée dans le bundle au build**. Elle est
   passée en build-arg `NUXT_PUBLIC_API_BASE` (`/api` en production, qui vise le
   même domaine). Changer d'URL d'API impose un rebuild d'image.
2. Tout le contenu est produit par JavaScript côté navigateur : pas
   d'indexation, pas d'aperçu au partage, pas d'URL par langue
   (`strategy: 'no_prefix'`) — cf. AUDIT F-20.

## 3. Arborescence

```
app.vue                     NuxtLayout + NuxtPage
layouts/default.vue         en-tête + barre latérale + <slot> ; pilote dir="rtl"
pages/
├── index.vue               carte d'accueil (indicateur "pop_15plus")
├── themes/[slug].vue       carte par thème + panneau régional (844 lignes)
└── regions/[code].vue      fiche d'une région (chiffres clés + graphique)
components/
├── map/DjiboutiMap.vue     carte Leaflet, choroplèthe, légende, barre d'outils
├── charts/BarChart.vue     Chart.js type bar (ou horizontal)
├── charts/PieChart.vue     Chart.js type doughnut (plus utilise, cf. AUDIT F-09)
└── layout/                 AppHeader, AppSidebar, LanguageSwitcher
composables/
├── useApi.ts               client $fetch typé sur les réponses réelles
├── useLocalizedContent.ts  résolution des objets { fr, ar, en }
├── useValueFormat.ts       formatage des valeurs selon l'unité et la langue
├── useMapData.ts           ⚠ code mort (réimplémenté dans index.vue)
└── useChart.ts             ⚠ code mort
stores/
├── theme.ts                thèmes chargés depuis l'API, liste de secours intégrée
└── map.ts                  ⚠ store complet jamais utilisé
types/api.ts                source de vérité des types ; types/map.ts les réexporte
assets/
├── scss/main.scss          design system (couleurs, RTL, responsive)
├── css/leaflet-fix.css     ⚠ jamais importé
└── data/                   GeoJSON de secours (tracé des régions uniquement)
locales/{fr,ar,en}.json     65 clés chacune (parité vérifiée)
nginx.conf, Dockerfile      image de production (nginx + fichiers statiques)
```

## 4. Démarrage

```bash
cp .env.example .env     # NUXT_PUBLIC_API_BASE=http://localhost:5000/api
npm ci
npm run dev              # http://localhost:3000
npm run generate         # build statique dans .output/public
```

L'API doit tourner en parallèle sur le port 5000 : en développement l'URL est
absolue, le serveur Nuxt ne proxyfie pas `/api`.

## 5. Accès aux données

Trois couches coexistent pour le même besoin — une seule est réellement en
service :

| Couche | État | Mécanisme |
|---|---|---|
| `composables/useApi.ts` | **utilisée** | `$fetch.create({ baseURL: apiBase })` |
| `composables/useMapData.ts` | morte | `useApi` + refs locales |
| `stores/map.ts` | morte | `useFetch` appelée dans des actions Pinia (anti-pattern) |

`useApi` expose 16 méthodes. Sont appelées : `getRegion`, `getRegionChildren`,
`getRegionIndicators`, `getThemes` (barre latérale), `getTheme`, `getMapData`,
`getGeoJSON` et `search` (barre latérale). `getThemeKeyFigures`,
`getIndicators`, `getIndicatorsByTheme`, `getChartData`, `compareIndicator` et
`fetchData` restent inutilisées (AUDIT F-11).

### Séquences par page

**`/` (index.vue)** — au montage, `Promise.all` de :

1. `GET /api/geo/region` → repli sur `assets/data/djibouti-regions.json` (tracé
   des régions seulement) en cas d'échec ;
2. `GET /api/indicators/map-data/pop_15plus` — l'indicateur de la page
   d'accueil, défini par la constante `HOME_INDICATOR`. En cas d'échec, aucune
   donnée de secours n'est inventée : la carte reste affichée avec ses contours
   et un bandeau signale l'absence de valeurs.

La carte s'affiche dès que le GeoJSON est disponible. Le clic sur une région
pousse vers `/regions/<code>`.

**`/themes/:slug`** — au montage :

1. `GET /api/geo/region` ;
2. `GET /api/themes/<slug>` → liste d'indicateurs ; le **premier** est
   sélectionné ;
3. `GET /api/indicators/map-data/<code>` pour l'indicateur courant.

Le sélecteur ne propose que les indicateurs dont l'API signale
`hasRegionalData: true` : les séries nationales, qui laisseraient la carte
vide, en sont exclues.

Au clic sur une région : `GET /api/regions/<code>`,
`GET /api/regions/<code>/children`, `GET /api/regions/<code>/indicators`, qui
alimentent un panneau latéral (valeur, rang, part du total, comparaison des 5
premières régions, graphiques).

**`/regions/:code`** — `GET /api/regions/<code>` puis
`GET /api/regions/<code>/indicators`. Les cartes de chiffres clés affichent la
superficie puis les cinq premiers indicateurs d'effectif (`unit: 'number'`) de
la région, lignes « ensemble » uniquement. Les autres unités alimentent un
graphique par unité : taux et ratios ne partagent pas la même échelle.

## 6. Carte (DjiboutiMap.vue)

* Fond `World_Imagery` d'ArcGIS, centre `[11.55, 42.95]`, zoom 8 (bornes 7–12),
  contrôle de zoom natif désactivé au profit d'une barre d'outils maison.
* Jointure des données : `feature.properties.code` ↔ `mapData[].regionCode`.
* Échelle recalculée depuis les valeurs numériques de `mapData` ; palette de 7
  paliers **interpolée entre les deux bornes de `visualization.colorScale`**
  reçues de l'API (par défaut `#FEE5D9` → `#A50F15`), gris `#E0E0E0` pour une
  valeur absente. Le même dégradé alimente la légende.
* Interactions : infobulle au survol, étiquette permanente par région (marqueur
  `divIcon`), clic (`region-click`). Le contenu HTML est échappé.
* Props : `geojson`, `mapData`, `indicatorName`, `unit`, `colorScale`,
  `levels`. Événements : `region-click`, `level-change`. Le sélecteur de niveau
  n'apparaît que si `levels` en contient plusieurs — aucun GeoJSON de district
  n'existe aujourd'hui.
* « Imprimer » appelle `window.print()` (contrôles masqués à l'impression) ;
  « Télécharger » exporte les données affichées en CSV `;` avec BOM UTF-8.
* La couche est reconstruite au changement de langue, de données ou de palette,
  et la carte est détruite au démontage du composant.

## 7. Internationalisation et RTL

* `i18n.config.ts` charge les trois fichiers de `locales/` ; `legacy: false`,
  repli sur `fr`.
* `strategy: 'no_prefix'` : la langue ne figure pas dans l'URL ;
  `detectBrowserLanguage` avec cookie `rgph_lang`.
* `layouts/default.vue` applique `dir="rtl"` et met à jour
  `document.documentElement.{dir,lang}` au changement de langue.
* `main.scss` fournit un mixin `@include rtl` utilisé pour la barre latérale,
  les contrôles de carte, la légende et les tableaux ; la police arabe
  (`Noto Sans Arabic`) est appliquée via `[dir="rtl"] body`.
* Les objets multilingues renvoyés par l'API (`{ fr, ar, en }`) sont résolus par
  `useLocalizedContent().getLocalizedName`, seule implémentation.
* Les valeurs numériques passent par `useValueFormat` : pourcentages via
  `Intl.NumberFormat` en style `percent`, effectifs en notation compacte
  localisée (`495,4 k` en français, `495.4 ألف` en arabe).
* Les trois locales sont complètes (65 clés, parité vérifiée) et l'interface
  n'affiche plus de texte codé en dur.

## 8. Styles

`assets/scss/main.scss` (669 lignes) tient le rôle de design system :
couleurs (`$primary: #1A9553` vert du drapeau, `$secondary: #6AB2E7`,
`$accent: #D32F2F`), typographies, `$sidebar-width: 280px`,
`$header-height: 60px`, mixin RTL, points de rupture 1024 / 768 px.

Plusieurs classes (`.map-container`, `.app-sidebar`, `.chart-card`,
`.key-figures`) restent définies à la fois dans `main.scss` et en
`<style scoped>` (AUDIT F-15) ; les composants concernés portent désormais
leurs propres règles RTL pour ne pas dépendre de l'ordre d'insertion. Trois
feuilles de style externes sont chargées par CDN (Leaflet, Google Fonts,
Material Design Icons) alors que Leaflet est déjà une dépendance npm
(AUDIT F-21).

## 9. Build et déploiement

`Dockerfile` en deux étapes : `node:20-alpine` (`npm ci` + `npx nuxi generate`,
avec garde-fou sur `NUXT_PUBLIC_API_BASE` vide) puis `nginx:1.25-alpine` qui
sert `.output/public` avec repli SPA `try_files $uri $uri/ /index.html` et un
point `/health`. Le workflow `.github/workflows/deploy.yml` (push sur `main`)
construit, pousse sur Docker Hub et déclenche
`/opt/instad/scripts/deploy.sh map-frontend` sur l'EC2.
