<template>
  <div class="letterhead-rule" aria-hidden="true"><span></span><span></span><span></span></div>

  <header class="app-header">
    <div class="app-header__brand">
      <div class="app-header__mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 26 26">
          <polygon points="13,2 24,13 13,24 2,13" fill="none" stroke="#00185F" stroke-width="1.6"></polygon>
          <circle cx="13" cy="13" r="3" fill="#00185F"></circle>
        </svg>
      </div>
      <div class="app-header__text">
        <span class="app-header__eyebrow">{{ $t('app.subtitle') }}</span>
        <span class="app-header__name">INSTAD</span>
        <span class="app-header__tagline">{{ $t('app.fullTitle') }}</span>
      </div>
    </div>

    <nav class="app-header__nav">
      <NuxtLink to="/" :class="{ active: isHome }">
        {{ $t('nav.thematicMaps') }}
      </NuxtLink>
      <NuxtLink to="/chiffres-cles" :class="{ active: route.path === '/chiffres-cles' }">
        {{ $t('nav.keyFigures') }}
      </NuxtLink>
      <NuxtLink to="/tableaux" :class="{ active: route.path === '/tableaux' }">
        {{ $t('nav.tables') }}
      </NuxtLink>
      <NuxtLink to="/concepts" :class="{ active: route.path === '/concepts' }">
        {{ $t('nav.concepts') }}
      </NuxtLink>
    </nav>

    <div class="app-header__actions">
      <div class="census-badge">
        <span class="census-badge__label">{{ $t('app.census') }}</span>
        <span class="census-badge__code">{{ $t('app.censusCode') }}</span>
      </div>
      <LanguageSwitcher />
    </div>
  </header>
</template>

<script setup lang="ts">
import LanguageSwitcher from './LanguageSwitcher.vue';

const route = useRoute();

const isHome = computed(() => route.path === '/' || route.path === '');
</script>

<style scoped>
.census-badge {
  display: none;
}

@media (min-width: 900px) {
  .census-badge {
    display: flex;
  }
}
</style>
