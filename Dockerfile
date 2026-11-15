# ============================================================
#  Stage 1 - Build Nuxt (SPA statique : ssr: false, preset static)
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# URL de l'API figee dans le bundle par "nuxi generate" : en build statique
# runtimeConfig.public n'est plus lisible au demarrage, toute modification
# exige donc un rebuild d'image.
# Valeur par defaut "/api" : le site et l'API partagent le domaine, nginx
# route /api/ vers le backend. Une URL relative suffit, tous les appels
# partant du navigateur.
ARG NUXT_PUBLIC_API_BASE=/api

ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
ENV NODE_ENV=production

# Une valeur vide ferait retomber la config sur http://localhost:5000/api,
# qui ne resout rien chez le visiteur : mieux vaut echouer au build.
RUN test -n "$NUXT_PUBLIC_API_BASE" || (echo "NUXT_PUBLIC_API_BASE build-arg vide" >&2; exit 1)

COPY package*.json ./
# npm ci : installation reproductible depuis le lockfile. Les devDependencies
# sont necessaires au build (nuxt y figure).
RUN npm ci --no-audit --no-fund

COPY . .
RUN npx nuxi generate

# ============================================================
#  Stage 2 - Serve avec Nginx
# ============================================================
FROM nginx:1.25-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/.output/public /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
