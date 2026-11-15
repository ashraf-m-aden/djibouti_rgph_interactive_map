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
| Chart.js | 4.5.1 | barres et anneau |
| Sass | 1.97 | design system `assets/scss/main.scss` |
| TypeScript / vue-tsc | 5.9.3 / 1.8.27 | **combinaison cassée**, cf. AUDIT F-01 |

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
├── index.vue               carte d'accueil (indicateur "population_totale")
├── themes/[slug].vue       carte par thème + panneau régional (844 lignes)
└── regions/[code].vue      fiche d'une région (chiffres clés + graphique)
components/
├── map/DjiboutiMap.vue     carte Leaflet, choroplèthe, légende, barre d'outils
├── charts/BarChart.vue     Chart.js type bar (ou horizontal)
├── charts/PieChart.vue     Chart.js type doughnut
└── layout/                 AppHeader, AppSidebar, LanguageSwitcher
composables/
├── useApi.ts               client $fetch — 16 méthodes, 6 réellement utilisées
├── useMapData.ts           ⚠ code mort (réimplémenté dans index.vue)
├── useChart.ts             ⚠ code mort
└── useLocalizedContent.ts  ⚠ code mort (dupliqué dans chaque page)
stores/
├── theme.ts                7 thèmes codés en dur ; fetchThemes() jamais appelée
└── map.ts                  ⚠ store complet jamais utilisé
types/api.ts, types/map.ts  types partiellement redondants et divergents
assets/
├── scss/main.scss          design system (couleurs, RTL, responsive)
├── css/leaflet-fix.css     ⚠ jamais importé
└── data/                   GeoJSON de secours + valeurs de carte de secours
locales/{fr,ar,en}.json     39 clés chacune (parité vérifiée)
nginx.conf, Dockerfile      image de production (nginx + fichiers statiques)
```

## 4. Démarrage

```bash
cp .env.example .env     # NUXT_PUBLIC_API_BASE=http://localhost:5000/api
npm ci
npm run dev              # http://localhost:3000  ⚠ échoue en l'état (AUDIT F-01)
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

`useApi` expose 16 méthodes ; seules `getRegion`, `getRegionChildren`,
`getRegionIndicators`, `getTheme`, `getMapData` et `getGeoJSON` sont appelées.
`getThemes`, `getThemeKeyFigures`, `getIndicators`, `getIndicatorsByTheme`,
`getChartData`, `compareIndicator`, `search`, `fetchData` ne le sont jamais
(AUDIT F-11).

### Séquences par page

**`/` (index.vue)** — au montage, `Promise.all` de :

1. `GET /api/geo/region` → repli sur `assets/data/djibouti-regions.json` en cas
   d'échec ;
2. `GET /api/indicators/map-data/population_totale` → repli sur
   `assets/data/fallBackMap.ts` (valeurs inventées) en cas d'échec.

La carte ne s'affiche que si `geojson` **et** `mapData.length > 0`. Le clic sur
une région pousse vers `/regions/<code>`. ⚠ `population_totale` n'existe qu'au
niveau national côté API : la réponse contient 6 régions à `value: null`, donc
la carte s'affiche entièrement grise (AUDIT D-01).

**`/themes/:slug`** — au montage :

1. `GET /api/geo/region` ;
2. `GET /api/themes/<slug>` → liste d'indicateurs ; le **premier** est
   sélectionné ;
3. `GET /api/indicators/map-data/<code>` pour l'indicateur courant.

Au clic sur une région : `GET /api/regions/<code>`,
`GET /api/regions/<code>/children`, `GET /api/regions/<code>/indicators`, qui
alimentent un panneau latéral (valeur, rang, part du total, comparaison des 5
premières régions, graphiques).

**`/regions/:code`** — `GET /api/regions/<code>` puis
`GET /api/regions/<code>/indicators`. Les « chiffres clés » sont **recalculés
côté client** depuis `region.population` et `region.area` ; `population`
n'existant pas dans le modèle backend, seule la superficie s'affiche
(AUDIT F-08).

## 6. Carte (DjiboutiMap.vue)

* Fond `World_Imagery` d'ArcGIS, centre `[11.55, 42.95]`, zoom 8 (bornes 7–12),
  contrôle de zoom natif désactivé au profit d'une barre d'outils maison.
* Jointure des données : `feature.properties.code` ↔ `mapData[].regionCode`.
* Échelle recalculée à chaque rendu depuis les valeurs non nulles de `mapData`
  (`0–100` par défaut si tout est nul) ; palette **rouge codée en dur** en 7
  paliers (`#FEE5D9` → `#A50F15`), gris `#E0E0E0` pour une valeur absente. Le
  `visualization.colorScale` fourni par l'API est ignoré (AUDIT F-17).
* Interactions : survol (épaississement du trait), clic (`region-click`),
  étiquette permanente centrée sur chaque région.
* Props : `geojson`, `mapData`, `indicatorName`, `unit` (cette dernière n'est
  jamais lue). Événements : `region-click`, `level-change`.
* Boutons « Imprimer » et « Télécharger » présents mais sans action
  (AUDIT F-06).

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
  une fonction `getLocalizedName` — **dupliquée dans cinq fichiers**
  (AUDIT F-14).
* Les trois locales sont complètes (39 clés), mais une partie de l'interface est
  écrite en français directement dans les templates (AUDIT F-05).

## 8. Styles

`assets/scss/main.scss` (669 lignes) tient le rôle de design system :
couleurs (`$primary: #1A9553` vert du drapeau, `$secondary: #6AB2E7`,
`$accent: #D32F2F`), typographies, `$sidebar-width: 280px`,
`$header-height: 60px`, mixin RTL, points de rupture 1024 / 768 px.

Les mêmes classes (`.map-container`, `.map-controls`, `.map-toolbar`,
`.map-legend`, `.app-sidebar`, `.chart-card`, `.key-figures`) sont **redéfinies
en `<style scoped>`** dans les composants, ce qui neutralise les variantes RTL
globales (AUDIT F-15). Trois feuilles de style externes sont chargées par CDN
(Leaflet, Google Fonts, Material Design Icons) alors que Leaflet est déjà une
dépendance npm (AUDIT F-21).

## 9. Build et déploiement

`Dockerfile` en deux étapes : `node:20-alpine` (`npm ci` + `npx nuxi generate`,
avec garde-fou sur `NUXT_PUBLIC_API_BASE` vide) puis `nginx:1.25-alpine` qui
sert `.output/public` avec repli SPA `try_files $uri $uri/ /index.html` et un
point `/health`. Le workflow `.github/workflows/deploy.yml` (push sur `main`)
construit, pousse sur Docker Hub et déclenche
`/opt/instad/scripts/deploy.sh map-frontend` sur l'EC2.
