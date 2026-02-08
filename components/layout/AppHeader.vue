<template>
  <header class="app-header">
    <div class="app-header__logo">
      <div style="width: 40px; height: 40px; background: #1A9553; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.7rem;">INSD</div>
      <span class="app-header__logo-text">
        {{ $t('app.fullTitle') }}<br />{{ $t('app.subtitle') }}
      </span>
    </div>

    <nav class="app-header__nav">
      <NuxtLink to="/" :class="{ active: isHome }">
        {{ $t('nav.thematicMaps') }}
      </NuxtLink>
      <NuxtLink to="#" :class="{ active: route.path.includes('chiffres-cles') }">
        {{ $t('nav.keyFigures') }}
      </NuxtLink>
      <NuxtLink to="#" :class="{ active: route.path.includes('tableaux') }">
        {{ $t('nav.tables') }}
      </NuxtLink>
      <NuxtLink to="#" :class="{ active: route.path.includes('concepts') }">
        {{ $t('nav.concepts') }}
      </NuxtLink>
    </nav>

    <div class="app-header__actions">
      <LanguageSwitcher />
    </div>
  </header>
</template>

<script setup lang="ts">
import LanguageSwitcher from './LanguageSwitcher.vue';

const route = useRoute();
const { locale, t } = useI18n();
const themeStore = useThemeStore();
const currentLang = computed(() => String(locale.value));
const isHome = computed(() => {
  return route.path === '/' || route.path === '';
});
</script>
