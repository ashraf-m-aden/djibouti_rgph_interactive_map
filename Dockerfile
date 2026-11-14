# ============================================================
#  Stage 1 - Build Nuxt (SSR, preset node-server)
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Le build ne fige aucune URL : NUXT_PUBLIC_API_BASE et NUXT_API_BASE_INTERNAL
# sont lus au demarrage du conteneur via runtimeConfig. Aucun build-arg ici,
# donc une meme image sert tous les environnements.
ENV NODE_ENV=production

COPY package*.json ./
# npm ci : installation reproductible depuis le lockfile. Les devDependencies
# sont necessaires au build (nuxt y figure).
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ============================================================
#  Stage 2 - Runtime
# ============================================================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
# Nitro ecoute sur toutes les interfaces du conteneur ; c'est nginx sur l'hote
# qui expose le service (le port n'est publie que sur 127.0.0.1).
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

# .output est autonome (Nitro y embarque ses dependances) : pas besoin de
# recopier node_modules, l'image reste legere.
COPY --from=builder /app/.output ./.output

USER node

EXPOSE 3000

# "localhost" resoudrait en ::1 (IPv6) alors que Nitro n'ecoute qu'en IPv4
# dans le conteneur : on vise 127.0.0.1 explicitement.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", ".output/server/index.mjs"]
