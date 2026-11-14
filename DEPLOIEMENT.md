# Deploiement — carte interactive RGPH 2024 (frontend)

SPA statique servie par nginx, hebergee sur le **meme EC2 que le site INSTAD**.
Domaine : `https://rgph.instad.dj`.

L'infrastructure (docker-compose, vhost nginx de l'hote, scripts) vit dans le
depot **`instad-infra`** — c'est la qu'il faut regarder pour la mise en service
du serveur. Ce fichier ne documente que ce qui concerne ce depot.

## Architecture

```
navigateur
    │  https://rgph.instad.dj
    ▼
nginx de l'hote EC2  (TLS, vhost rgph.instad.dj.conf dans instad-infra)
    ├── /        → 127.0.0.1:8081 → conteneur rgph-map-frontend  (nginx, ce depot)
    └── /api/    → 127.0.0.1:5001 → conteneur rgph-map-backend   (Express)
                                        │
                                        ▼
                                   conteneur mongo (partage avec INSTAD,
                                   base rgph_djibouti_2024)
```

Le site et l'API partagent le domaine. Comme le backend prefixe deja toutes ses
routes par `/api`, aucune reecriture d'URL n'est necessaire et les appels du
navigateur sont en meme origine : **pas de CORS a gerer**.

## Le point a retenir : l'URL de l'API est figee au build

L'app est une SPA statique (`ssr: false` + preset Nitro `static`), donc
`runtimeConfig.public` est **inscrite dans le bundle JavaScript au moment du
build**. Une variable d'environnement sur le conteneur n'a aucun effet.

- En production la valeur est `/api` (URL relative, meme domaine).
- Elle est passee en build-arg `NUXT_PUBLIC_API_BASE` (cf. `Dockerfile` et
  `.github/workflows/deploy.yml`).
- **Changer d'URL d'API impose donc un rebuild d'image**, pas un simple
  redemarrage.

Le workflow accepte un secret `MAP_PUBLIC_API_BASE` pour surcharger la valeur
sans toucher au code, si l'API devait repasser sur un domaine distinct.

## Routes dynamiques et fallback SPA

`pages/regions/[code].vue` et `pages/themes/[slug].vue` sont resolues cote
navigateur. Le `nginx.conf` de ce depot contient donc un fallback
`try_files $uri $uri/ /index.html` : sans lui, un rechargement direct ou un lien
partage vers `/regions/DJ01` renverrait 404.

## Developpement local

```bash
cp .env.example .env     # NUXT_PUBLIC_API_BASE=http://localhost:5000/api
npm ci
npm run dev              # http://localhost:3000
```

L'API doit tourner en parallele (depot `rgph-map-backend`, port 5000). En local
l'URL est absolue : le serveur de developpement Nuxt ne proxyfie pas `/api`.

## Chaine de deploiement

Un push sur `main` declenche `.github/workflows/deploy.yml` :

1. build de l'image et push sur Docker Hub
   (`<user>/rgph-map-frontend:latest` et `:<sha-court>`) ;
2. connexion SSH a l'EC2 et `/opt/instad/scripts/deploy.sh map-frontend`, qui ne
   redemarre **que ce service** — le site INSTAD et l'API de la carte ne sont
   pas interrompus.

Secrets GitHub requis : `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `EC2_HOST`,
`EC2_USER`, `EC2_SSH_KEY`. Optionnel : `MAP_PUBLIC_API_BASE`.

## Construire l'image a la main

```bash
docker build -t rgph-map-frontend:test --build-arg NUXT_PUBLIC_API_BASE=/api .
docker run --rm -p 8081:80 rgph-map-frontend:test
# http://localhost:8081/health  -> OK
```

Les appels `/api/...` echoueront en 404 dans ce mode : le fallback SPA sert
`index.html`, et c'est le nginx de l'hote qui route `/api/` vers le backend.
