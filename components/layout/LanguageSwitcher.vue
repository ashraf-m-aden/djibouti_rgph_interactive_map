<template>
  <div class="lang-switcher">
    <button
      v-for="loc in availableLocales"
      :key="loc.code"
      :class="['lang-switcher__btn', { 'lang-switcher__btn--active': currentLocale === loc.code }]"
      :aria-current="currentLocale === loc.code ? 'true' : undefined"
      @click="switchLocale(loc.code)"
    >
      {{ loc.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Language } from '~/types/api';

const { locale, setLocale } = useI18n();

const currentLocale = computed(() => String(locale.value));

const availableLocales: Array<{ code: Language; label: string }> = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
  { code: 'en', label: 'EN' },
];

// Affecter locale.value directement ne declenche pas l'ecriture du cookie
// rgph_lang (@nuxtjs/i18n ne le fait que dans loadAndSetLocale, appele par
// setLocale) : la langue choisie etait perdue au rechargement, au profit de
// l'Accept-Language du navigateur (cf. AUDIT F-04).
const switchLocale = async (code: Language) => {
  await setLocale(code);
};
</script>
