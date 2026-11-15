export default defineNuxtConfig({
  devtools: { enabled: false },
  
  typescript: {
    strict: true,
    typeCheck: process.env.NODE_ENV === 'development', // ← Seulement en dev
    shim: false
  },

  app: {
    head: {
      title: 'RGPH 2024 - République de Djibouti',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Résultats du Recensement Général de la Population et de l\'Habitat 2024 - Djibouti',
        },
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css',
        },
      ],
    },
  },
  
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/i18n',
  ],
  
  i18n: {
    locales: ['fr', 'ar', 'en'],
    defaultLocale: 'fr',
    strategy: 'no_prefix',
    vueI18n: './i18n.config.ts',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'rgph_lang',
    },
  },
  
  css: [
    '~/assets/scss/main.scss',
  ],
  
  // SPA : aucun rendu serveur, tout s'execute dans le navigateur. L'image de
  // production ne contient donc que des fichiers statiques servis par nginx
  // (cf. Dockerfile), il n'y a pas de process Node en production.
  ssr: false,

  runtimeConfig: {
    public: {
      // ATTENTION : en build statique, runtimeConfig.public est FIGE dans le
      // bundle au moment du build. Cette URL ne peut donc pas etre changee au
      // demarrage du conteneur : elle est passee en build-arg
      // NUXT_PUBLIC_API_BASE (cf. Dockerfile et .github/workflows/deploy.yml).
      //
      // En production la valeur est "/api" : le site et l'API partagent le
      // domaine, nginx route /api/ vers le backend. Une URL relative suffit
      // puisque tous les appels partent du navigateur.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:5000/api',
    },
  },

  // static : "nuxi generate" produit .output/public, servi par nginx.
  nitro: {
    preset: 'static',
    compressPublicAssets: true,
  },

  // Pour le build
  experimental: {
    payloadExtraction: false,
  },
  
  compatibilityDate: '2024-10-01',
});