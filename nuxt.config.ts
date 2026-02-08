export default defineNuxtConfig({
  devtools: { enabled: false },
  
  typescript: {
    strict: true,
    typeCheck: true,
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
  
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:5000/api',
    },
  },

  // Important pour Render
  nitro: {
    preset: 'node-server',
    compressPublicAssets: true,
  },

  // Pour le build
  experimental: {
    payloadExtraction: false,
  },
  
  compatibilityDate: '2024-10-01',
});