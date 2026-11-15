# Audit — Carte interactive RGPH 2024 (map-frontend)

Revue de code complète du frontend, menée le 15 novembre 2026 sur la branche
`docs/audit-architecture` (base : `feat/deploy-ec2`).

Les anomalies du backend et du jeu de données sont dans
`map-backend/AUDIT.md` (`C-xx`, `B-xx`, `D-xx`) ; celles qui se voient d'abord
ici y sont référencées.

## État des corrections

Branche `fix/audit-bloquants-majeurs` (depuis `docs/audit-architecture`) :
**corrigés et vérifiés dans un navigateur, contre l'API réelle** — F-01, F-02,
F-03, F-04, F-05, F-06, F-07, F-08, F-09, F-10, F-13, F-14, F-16, F-17, F-18,
F-23, F-24.

**Restent ouverts** : F-11 et F-12 (code mort : `stores/map.ts`,
`useMapData.ts`, `useChart.ts`, `leaflet-fix.css`), F-15 (duplication CSS
résiduelle entre `main.scss` et les styles scopés), F-19 (mobile), F-20 (SEO
et URL par langue), F-21 (CDN externes), F-22 (script `start` et lien `dist`).

F-01 est corrigé par la **désactivation** de `typeCheck` : le serveur de
développement redémarre. Le passage à `vue-tsc@2` — qui rétablirait la
vérification de types et ne remonte aucune erreur sur ce code — a été tenté
puis **abandonné** : toute réinstallation retire du lockfile les binaires de
plateforme d'esbuild exigés par Vite 6 (`node_modules/vite/node_modules/@esbuild/*`),
ce qui casse `npm ci`, donc le build Docker. Ce passage demande une
régénération maîtrisée du lockfile, hors du cadre de ces correctifs ;
`package.json` et `package-lock.json` sont laissés **inchangés**.

---

Sévérité : 🔴 bloquant · 🟠 majeur · 🟡 mineur.
Colonne « Vérif. » : **exécuté** = reproduit par exécution,
**lecture** = établi par lecture du code (y compris celui des dépendances).

## Synthèse

| ID | Sév. | Anomalie | Vérif. |
|---|---|---|---|
| F-01 | 🔴 | `npm run dev` échoue : `typeCheck` + `vue-tsc` 1.8 incompatible avec TS 5.9 | exécuté |
| F-02 | 🟠 | Double `bindTooltip` : l'infobulle de survol est écrasée et ne s'affiche jamais | lecture |
| F-03 | 🟠 | Aucune région dessinée quand l'indicateur n'a pas de données | lecture |
| F-04 | 🟠 | Le choix de langue n'est pas mémorisé (cookie jamais écrit) | lecture |
| F-05 | 🟠 | 13 textes codés en dur en français malgré les 3 locales complètes | exécuté |
| F-06 | 🟠 | Commandes mortes : Imprimer, Télécharger, 3 liens d'en-tête, niveau « Districts » | lecture |
| F-07 | 🟠 | La barre latérale affiche 7 thèmes codés en dur ; `/api/themes` et `/api/search` jamais appelées | exécuté |
| F-08 | 🟠 | Chiffres clés jamais affichés ; la fiche région s'appuie sur un champ `population` inexistant | lecture |
| F-09 | 🟠 | Graphiques régionaux mêlant effectifs, pourcentages et désagrégations | lecture |
| F-10 | 🟡 | `\|\| null` et `\|\| 0` : une valeur 0 est traitée comme absente | lecture |
| F-11 | 🟡 | Code mort : 3 composables, 1 store entier, 1 feuille CSS, 10 méthodes d'API | exécuté |
| F-12 | 🟡 | `useFetch` appelée dans des actions Pinia (hors contexte de setup) | lecture |
| F-13 | 🟡 | Types divergents entre `types/api.ts` et `types/map.ts` ; 3 signatures mensongères | lecture |
| F-14 | 🟡 | `getLocalizedName` réécrite dans 5 fichiers | exécuté |
| F-15 | 🟡 | CSS dupliqué entre `main.scss` et les styles scopés : RTL neutralisé | lecture |
| F-16 | 🟡 | Carte Leaflet jamais détruite ; pas d'`invalidateSize` ; `watch` profond sur le GeoJSON | lecture |
| F-17 | 🟡 | Palette incohérente ; `visualization.colorScale` de l'API ignorée | lecture |
| F-18 | 🟡 | Infobulles construites par concaténation HTML de données non échappées | lecture |
| F-19 | 🟡 | Barre latérale masquée sous 768 px sans menu de remplacement | lecture |
| F-20 | 🟡 | Aucune indexation ni URL par langue (SPA + `no_prefix`) | lecture |
| F-21 | 🟡 | Trois CDN externes chargés au runtime dont Leaflet, déjà en dépendance npm | lecture |
| F-22 | 🟡 | Script `start` inopérant ; lien symbolique `dist` vers un chemin Windows absolu | exécuté |
| F-23 | 🟡 | Repli silencieux sur des valeurs inventées en cas de panne d'API | lecture |
| F-24 | 🟠 | La carte reste dans la langue précédente après un changement de langue | exécuté |

Rappel des anomalies dont la cause est côté backend mais dont l'effet est visible
ici : **D-01** (carte d'accueil entièrement grise), **D-02** (31 indicateurs
sélectionnables sans données), **C-01/C-02** (`/api/regions` et `/api/indicators`
renvoient les thèmes), **B-06** (`chart-data` renvoie des objets comme libellés).

---

### F-01 🔴 Le serveur de développement ne démarre pas

`nuxt.config.ts:6` active la vérification de types en développement :

```ts
typeCheck: process.env.NODE_ENV === 'development'
```

`nuxi dev` positionne lui-même `NODE_ENV=development`, donc la vérification est
toujours active. Or les versions installées sont `vue-tsc@1.8.27` et
`typescript@5.9.3`, combinaison connue pour être incompatible. Résultat
reproduit :

```
$ npx nuxi dev --port 3099
ERROR  Cannot find module '@volar/typescript/lib/node/proxyCreateProgram'
Require stack:
- node_modules/@nuxt/vite-builder/node_modules/vite-plugin-checker/dist/esm/checkers/vueTsc/prepareVueTsc.js
exit=1
```

`npx vue-tsc --noEmit` échoue de son côté sur
`Search string not found: "/supportedTSExtensions = .*(?=;)/"`. Conséquences :
aucun développement local possible en l'état, et **aucune erreur de typage n'a
jamais pu être détectée** — ce qui explique les types mensongers relevés en
F-13. Le build de production (`nuxi generate`) n'est pas concerné,
`typeCheck` étant faux hors développement.

**Correctif** : passer à `vue-tsc@^2` (compatible TS 5.9) ; à défaut, retirer
`typeCheck` de la configuration et lancer la vérification à la demande.

### F-02 🟠 L'infobulle de survol n'existe pas

`components/map/DjiboutiMap.vue:240` puis `:250` appellent `bindTooltip` **deux
fois sur la même couche** : d'abord l'infobulle de survol (`sticky: true`), puis
l'étiquette permanente (`permanent: true`). Leaflet ne conserve qu'une infobulle
par couche : le second appel remplace le premier. Le bloc HTML
`region-tooltip` — ainsi que les styles `.region-tooltip*` de `main.scss` et du
composant — est donc du code mort, et le survol n'apporte aucune information
supplémentaire.

**Correctif** : utiliser `layer.bindTooltip()` pour le survol et
`L.marker(center, { icon: L.divIcon(...) })` (ou `L.tooltip().addTo(map)`) pour
l'étiquette permanente.

### F-03 🟠 Carte vide quand l'indicateur n'a pas de données

`DjiboutiMap.vue:207` :

```js
if (!map.value || !props.geojson || !props.mapData || props.mapData.length === 0) return;
```

La couche GeoJSON n'est ajoutée **que si des données existent**. Sur la page
thème, un indicateur national (31 cas sur 64, cf. D-02) laisse donc le fond
satellite nu, sans contour de région : l'utilisateur ne voit pas Djibouti, il
voit une photo aérienne. La page d'accueil pousse la logique plus loin et
n'affiche pas le composant du tout (`v-if="geojson && mapData.length"`).

Ces deux gardes empêchent par ailleurs le cas « carte des régions sans
indicateur », qui serait l'état de repli naturel.

**Correctif** : dessiner la couche dès que `geojson` est disponible et laisser
la fonction `getColor` renvoyer le gris pour les valeurs absentes — ce qu'elle
sait déjà faire.

### F-04 🟠 La langue choisie est oubliée au rechargement

`components/layout/LanguageSwitcher.vue:28` assigne directement
`locale.value = code`. Or, dans `@nuxtjs/i18n` 8.3, le cookie n'est écrit que par
`syncCookie()`, appelée uniquement depuis `loadAndSetLocale()` — donc depuis
`setLocale()` (vérifié dans
`node_modules/@nuxtjs/i18n/dist/runtime/utils.mjs:61-107` et
`runtime/plugins/i18n.mjs`). Le cookie `rgph_lang` déclaré dans `nuxt.config.ts`
n'est **jamais écrit**.

Comme `detectBrowserLanguage` reste actif, chaque rechargement repart de
l'`Accept-Language` du navigateur : un utilisateur arabophone qui choisit le
français retrouve l'arabe à la page suivante. Le défaut est invisible sur un
navigateur configuré en français.

**Correctif** : `const { setLocale } = useI18n()` puis `await setLocale(code)`.

### F-05 🟠 Interface partiellement non traduite

Les trois locales contiennent 39 clés chacune, parité vérifiée. Mais 13 chaînes
sont écrites en français directement dans les templates :

| Fichier | Lignes | Exemples |
|---|---|---|
| `pages/index.vue` | 21 | « Réessayer » |
| `pages/regions/[code].vue` | 5, 52, 58 | « Chargement… », « Aucune donnée disponible pour cette région. », « Région non trouvée » |
| `pages/themes/[slug].vue` | 32, 46, 66, 73, 95, 98, 102, 114, 129 | « Valeur », « Rang », « Statistiques », « Subdivisions », « Comparaison » |

S'y ajoutent des libellés passés en props (`title="Indicateurs principaux"`,
`label: 'Valeur'`, `` `${nom} - Évolution` ``) et le texte « Erreur de chargement
des données ».

Symétriquement, des clés existent sans être utilisées : tout `footer.*` (aucun
composant pied de page n'existe), `nav.home`, `map.zoomIn`, `map.zoomOut`,
`map.communes`, l'ensemble de `themes.*` (la barre latérale lit les noms de
l'API/du store) et la plupart de `common.*`.

**Correctif** : déplacer les 13 chaînes dans les locales, compléter les clés
manquantes, supprimer celles qui ne servent plus.

### F-06 🟠 Commandes sans effet

* `DjiboutiMap.vue` : les boutons « Imprimer » et « Télécharger » n'ont aucun
  gestionnaire `@click` — seulement un `title`.
* `AppHeader.vue` : « Chiffres clés 2024 », « Tableaux RGPH 2024 » et
  « Concepts et définitions » pointent `to="#"`, et leur classe `active` teste
  des segments d'URL (`chiffres-cles`, `tableaux`, `concepts`) qui n'existent
  dans aucune page. Trois des quatre entrées de navigation sont donc mortes.
* Sélecteur de niveau : le bouton « Districts » émet `level-change`, que
  `pages/index.vue` traite par `console.log("Level changed:", level)` et que
  `pages/themes/[slug].vue` n'écoute pas du tout. Aucun GeoJSON district
  n'existe de toute façon (D-09).

### F-07 🟠 La barre latérale n'affiche pas les thèmes de la base

`stores/theme.ts` initialise son état avec les **7 thèmes codés en dur**
(slug, nom trilingue, icône, couleur) et expose `fetchThemes()` pour les
remplacer par ceux de l'API. Un relevé des appels confirme que `fetchThemes()`
n'est appelée **nulle part** : la liste affichée est statique, et toute
modification en base (nouveau thème, dépublication, renommage) reste invisible.
Les métadonnées sont ainsi dupliquées en trois endroits : la base, le store, et
les clés `themes.*` des locales.

Même constat pour la recherche : le champ de la barre latérale filtre
localement ces 7 libellés ; `/api/search`, qui interroge thèmes, régions **et**
indicateurs, n'est jamais appelée alors que le placeholder annonce
« Rechercher un indicateur… ».

Accessoirement, `activeTheme` est un `ref` local du composant, non synchronisé
avec la route : arriver directement sur `/themes/sante` ne met aucune entrée en
surbrillance.

### F-08 🟠 Chiffres clés absents et densité impossible

`GET /api/themes/:slug/key-figures` expose 9 chiffres clés semés (population de
15 ans et plus, population active, taux d'activité, taux de chômage…).
`useApi.getThemeKeyFigures` existe, mais n'est appelée nulle part : **ces
données ne sont jamais affichées**.

À la place, `pages/regions/[code].vue:137-171` fabrique ses propres cartes à
partir de `regionData.population` et `regionData.area`. Or le modèle `Region` du
backend n'a **pas de champ `population`** (seulement `area`, `center`,
`sortOrder`…) — le type `Region` de `types/api.ts` le déclare pourtant en
optionnel, ce qui a masqué l'écart. Conséquence : la carte « Population totale »
ne s'affiche jamais, et la carte « Densité », conditionnée aux deux champs, non
plus. Seule la superficie apparaît.

**Correctif** : alimenter la fiche région avec `/themes/:slug/key-figures` et/ou
`/regions/:code/indicators?indicatorCode=pop_15plus`, et retirer `population` du
type ou l'ajouter au modèle backend.

### F-09 🟠 Graphiques régionaux non interprétables

`pages/regions/[code].vue` et le panneau régional de `pages/themes/[slug].vue`
construisent leurs séries à partir de **tous** les documents renvoyés par
`/api/regions/:code/indicators`, sans filtrer ni le thème, ni l'unité, ni la
désagrégation :

```js
regionChartData.value = indicatorsResponse.data.map(ind => ({
  label: getLocalizedName(ind.name),
  value: ind.value || 0,
}));
```

Pour Djibouti-ville cela mélange dans un seul histogramme des effectifs
(495 392 habitants) et des pourcentages (37,8 % de chômage), avec des libellés
répétés puisque plusieurs documents partagent le même nom et ne diffèrent que
par leur désagrégation. Le `PieChart` « Distribution » additionne par-dessus des
taux pour en calculer des parts, ce qui n'a pas de sens arithmétique.

**Correctif** : filtrer par `themeSlug` et par unité homogène, grouper par
`indicatorCode` et n'afficher la ventilation que lorsqu'une désagrégation est
explicitement choisie.

### F-10 🟡 Une valeur nulle confondue avec une absence de donnée

`pages/themes/[slug].vue:297` :

```js
value: mapData.value.find(d => d.regionCode === regionCode)?.value || null
```

Une valeur légitime de `0` (taux nul, effectif nul) devient `null`, donc « — »
et « Aucune donnée détaillée disponible ». Même motif dans `chartDatasets`
(`i.value || 0`), `topRegions` (`r.value || 0`), `maxRegionValue`
(`.filter(v => v > 0)`) et `formatNumber` de `pages/regions/[code].vue:130`
(`if (!num && num !== 0)` est correct, mais la version de
`pages/themes/[slug].vue` ne l'est pas).

**Correctif** : utiliser `?? null` et comparer explicitement à `null`/
`undefined`.

### F-11 🟡 Code mort

* `composables/useMapData.ts` — réimplémenté à l'identique dans
  `pages/index.vue`.
* `composables/useChart.ts` — chaque composant de graphique gère sa propre
  instance Chart.js.
* `composables/useLocalizedContent.ts` — réécrit dans chaque page (F-14).
* `stores/map.ts` en entier (91 lignes : état, getter `getRegionValue`, actions
  `fetchGeoJSON`/`fetchMapData`). `DjiboutiMap.vue:96` appelle bien
  `useMapStore()` mais n'utilise jamais la variable.
* `assets/css/leaflet-fix.css` — jamais importé (ni dans `nuxt.config.ts`, ni
  dans un composant) ; il contient pourtant les correctifs de hauteur du
  conteneur Leaflet, et cible une classe `.app-body` qui n'existe pas.
* `pages/index.vue` : `showDebug`, l'interface `RegionProps` partiellement
  inutilisée et tout le bloc de styles `.debug-panel`.
* 10 des 16 méthodes de `useApi` (relevé complet dans `DOCUMENTATION.md` §5).

### F-12 🟡 `useFetch` dans des actions Pinia

`stores/map.ts:43` et `:76` appellent `useFetch` à l'intérieur d'actions, après
un `await` pour la seconde. `useFetch` est un composable de setup : hors de ce
contexte, Nuxt avertit (« Nuxt instance unavailable ») et le comportement de
déduplication par clé n'est pas garanti. Le store doublonne par ailleurs
`useApi`, qui utilise `$fetch` — l'outil adapté pour un appel impératif.

### F-13 🟡 Types divergents et signatures mensongères

`types/api.ts` et `types/map.ts` définissent tous deux `AdminLevel`,
`GeoJSONData`, `GeoJSONFeature` et `MapDataEntry`, avec des définitions
différentes (`type: 'FeatureCollection'` littéral d'un côté, `string` de
l'autre ; `regionName` présent d'un seul côté). `DjiboutiMap.vue` importe la
version de `types/api.ts`, `stores/map.ts` celle de `types/map.ts`.

`AdminLevel` exclut `'country'`, que le backend renvoie pourtant pour `DJ` : le
type de `Region.level` est faux dès qu'on charge la région racine.

Trois méthodes de `useApi` annoncent une forme que l'API ne renvoie pas :

| Méthode | Type déclaré | Réponse réelle |
|---|---|---|
| `getTheme` | `ApiResponse<Theme>` | `{ theme, indicators, subThemes }` |
| `getChartData` | `ApiResponse<ChartDataEntry[]>` | `{ labels, datasets }` |
| `search` | `ApiResponse<SearchResult[]>` | `{ themes, regions, indicators }` |

`getRegions` et `getIndicators` annoncent `Region[]` / `Indicator[]` là où
l'API renvoie des thèmes (C-01, C-02). L'usage généralisé de
`[key: string]: any` et de `as any` neutralise le contrôle de types ; la
vérification étant cassée (F-01), rien ne l'a signalé.

### F-14 🟡 `getLocalizedName` écrite cinq fois

Même fonction, cinq implémentations légèrement différentes :
`composables/useLocalizedContent.ts` (inutilisée),
`pages/regions/[code].vue:120`, `pages/themes/[slug].vue:332`,
`components/layout/AppSidebar.vue:71` (`getThemeName`) et
`components/map/DjiboutiMap.vue:134` (`getRegionName`, qui lit des propriétés
`name_fr`/`name_ar`/`name_en` plates plutôt qu'un objet imbriqué). Les ordres de
repli diffèrent (`fr → en → ar` ici, `fr → en` là).

### F-15 🟡 CSS dupliqué, RTL neutralisé

`assets/scss/main.scss` définit `.map-container`, `.map-controls`,
`.map-toolbar`, `.map-legend`, `.app-sidebar`, `.chart-card`, `.key-figures`,
`.region-tooltip` — **avec** leurs variantes `@include rtl`. Les mêmes classes
sont redéfinies en `<style scoped>` dans `DjiboutiMap.vue`, `AppSidebar.vue`,
`BarChart.vue`, `PieChart.vue` et `pages/regions/[code].vue`, où elles portent
des valeurs différentes (`top: 20px` contre `16px`, `z-index: 1000` contre
`500`, `background: #f8f9fa` contre `$bg-white`, largeur `280px` en dur contre
`$sidebar-width`).

À spécificité égale (`.map-controls[data-v-x]` contre
`[dir="rtl"] .map-controls`), c'est l'ordre d'insertion qui tranche : les règles
RTL globales sont donc neutralisées de façon fragile et dépendante du mode de
build. En arabe, les contrôles de carte, la légende et la bordure de la barre
latérale restent du mauvais côté.

**Correctif** : une seule source par classe — soit tout en scopé avec les
variantes RTL dans le composant, soit tout dans `main.scss`.

### F-16 🟡 Cycle de vie de la carte Leaflet

`DjiboutiMap.vue` n'a pas de `onUnmounted` : `map.remove()` n'est jamais appelé.
En navigation interne (accueil → thème → région), les instances Leaflet,
leurs écouteurs et leurs tuiles restent en mémoire ; en rechargement à chaud,
Leaflet lève « Map container is already initialized ».

Deux autres points : aucun `map.invalidateSize()` après le montage (la carte
reste mal dimensionnée si le conteneur change de taille — c'est précisément ce
que corrigeait `leaflet-fix.css`, non importé) ; et le `watch` de la ligne 280
est `deep: true` sur l'intégralité du GeoJSON, ce qui fait parcourir tous les
polygones à chaque changement de données.

### F-17 🟡 Palettes incohérentes

Trois systèmes de couleurs coexistent : le design system vert
(`$primary: #1A9553`, repris sur les boutons et les éléments actifs), les
couleurs de thèmes du backend (`#8B1A1A` par défaut, puis une couleur par
thème), et la palette choroplèthe **rouge codée en dur** dans
`DjiboutiMap.vue:116` (`#FEE5D9` → `#A50F15`), reprise à l'identique dans le
dégradé CSS de la légende.

L'API fournit pourtant `visualization.colorScale.{min,max}` par indicateur ;
`stores/map.ts` la récupère même dans son état — mais ce store est mort (F-11) et
le composant ne reçoit jamais l'information. Changer la palette impose
aujourd'hui de modifier le JavaScript **et** le CSS de la légende.

### F-18 🟡 Injection HTML dans les infobulles

`DjiboutiMap.vue:240-256` construit le contenu des infobulles par concaténation
de chaînes, en y insérant `name` (issu des propriétés du GeoJSON) et
`formattedValue` sans échappement. Le risque est faible — les données viennent
de l'API du même domaine — mais il suffirait d'un nom de région compromis en
base pour exécuter du script dans la page.

### F-19 🟡 Thèmes inaccessibles sur mobile

`main.scss:619` masque `.app-sidebar` et `.app-header__nav` sous 768 px, sans
menu de remplacement : sur téléphone, **aucun moyen d'accéder aux thèmes**. Les
contrôles de carte (280 px de large, positionnés en absolu) recouvrent par
ailleurs une grande partie d'un écran mobile.

### F-20 🟡 Aucune indexation, aucune URL par langue

`ssr: false` : le HTML livré ne contient que le squelette Nuxt. Pour un portail
statistique public, cela signifie aucune indexation par les moteurs, aucun
aperçu au partage sur les réseaux sociaux, et une dépendance totale à
JavaScript. `strategy: 'no_prefix'` supprime en plus les URL par langue :
impossible de partager un lien « en arabe ». Aucune page ne définit de
`useHead`/`definePageMeta` : le titre reste
« RGPH 2024 - République de Djibouti » partout.

**Correctif** : si le référencement compte, basculer en préretendu
(`ssr: true` + `nitro.prerender` sur les routes connues) et adopter
`strategy: 'prefix_except_default'`.

### F-21 🟡 Dépendances CDN au runtime

`nuxt.config.ts:21-35` charge trois feuilles externes : `unpkg.com` (CSS
Leaflet), `fonts.googleapis.com` (Noto Sans Arabic, Source Sans 3) et
`cdn.jsdelivr.net` (Material Design Icons 7.4.47). Problèmes : Leaflet est déjà
une dépendance npm, dont la version pourrait diverger de celle du CSS ; une
coupure ou un filtrage d'un de ces domaines dégrade l'application (icônes
invisibles, carte mal rendue) ; aucune politique de sécurité de contenu n'encadre
ces origines ; et les polices tierces posent une question de conformité pour un
site institutionnel.

**Correctif** : `import 'leaflet/dist/leaflet.css'`, et héberger polices et
icônes dans `public/`.

### F-22 🟡 Scories de packaging

* `package.json` déclare `"start": "node .output/server/index.mjs"`, inopérant
  avec le preset `static` qui ne produit aucun serveur Node.
* Un lien symbolique `dist` → `/d/projet/nuxt/interactive map/map-frontend/.output/public`
  (chemin Windows absolu) est présent à la racine. Il n'est pas exclu par
  `.dockerignore` (qui exclut `.output` mais pas `dist`), donc copié tel quel
  dans le contexte de build, où il pointe dans le vide.
* Un `package-lock.json` orphelin (quasi vide) traîne dans le dossier parent
  `interactive map/`, hors des deux dépôts.

### F-23 🟡 Repli silencieux sur des valeurs inventées

`pages/index.vue:96` : en cas d'échec de l'API, `mapData` reçoit
`fallbackMapData` (`assets/data/fallBackMap.ts`) et la fonction **retourne
`true`**, donc aucune erreur n'est signalée. Ces valeurs (693 000 pour
Djibouti-ville, 65 000 pour Arta…) ne correspondent à aucune donnée du RGPH :
elles s'affichent exactement comme des chiffres officiels, avec étiquettes et
légende. Sur un site institutionnel de diffusion statistique, une panne d'API
produit ainsi des **chiffres faux non signalés**.

À noter que ce repli n'est aujourd'hui jamais déclenché pour la carte : l'API
répond `200` avec six valeurs nulles (D-01), ce qui est considéré comme un
succès.

**Correctif** : supprimer les données de repli, ou les afficher avec un bandeau
explicite « données de démonstration — API indisponible ».

### F-24 🟠 La carte ne suit pas le changement de langue

Relevé en navigation réelle, après correction de F-04 : en passant de l'arabe
au français, l'en-tête, la barre latérale et les bornes de la légende se
traduisent, mais **les étiquettes des régions, l'infobulle et le titre de la
légende restent en arabe**.

Cause : Leaflet écrit le contenu des étiquettes dans le DOM au moment où la
couche est construite. Le seul `watch` portait sur `geojson` et `mapData` ; un
changement de `locale` ne déclenchait donc aucune reconstruction. Sur la page
thème, s'ajoutait un second effet : `currentIndicatorName`, le nom de la région
sélectionnée et ceux des sous-régions étaient des `ref` remplies une fois pour
toutes avec un libellé déjà résolu.

Le défaut préexistait à l'audit ; il n'avait pas été relevé faute de pouvoir
exécuter l'application (F-01).

**Correctif appliqué** : `watch(locale, () => updateGeoLayer())` dans
`DjiboutiMap.vue` ; sur la page thème, les libellés deviennent des `computed`
dérivés des objets bruts de l'API (`selectedRegion`, `childRegions`,
`selectedIndicator`) ; sur l'accueil, `indicatorName` devient un `computed`.
Vérifié dans le navigateur : le basculement FR ↔ AR met à jour carte, légende,
panneau et graphiques sans rechargement.
