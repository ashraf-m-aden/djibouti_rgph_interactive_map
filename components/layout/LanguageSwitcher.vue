<template>
  <div class="lang-switcher">
    <button
      v-for="loc in availableLocales"
      :key="loc.code"
      :class="['lang-switcher__btn', { 'lang-switcher__btn--active': currentLocale === loc.code }]"
      @click="switchLocale(loc.code)"
    >
      {{ loc.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const { locale } = useI18n();

const currentLocale = computed(() => String(locale.value));

const availableLocales = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
  { code: 'en', label: 'EN' },
];

const switchLocale = (code:string) => {
  locale.value = code;
};
</script>
