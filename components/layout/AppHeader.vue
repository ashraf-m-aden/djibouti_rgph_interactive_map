<template>
  <header class="app-header">
    <div class="app-header__logo">
      <div class="app-header__mark">INSTAD</div>
      <span class="app-header__logo-text">
        {{ $t('app.fullTitle') }}<br />{{ $t('app.subtitle') }}
      </span>
    </div>

    <!-- Les entrees "Chiffres cles", "Tableaux" et "Concepts" pointaient
         toutes vers "#" : aucune page correspondante n'existe (cf. AUDIT
         F-06). Elles seront reintroduites avec leurs routes. -->
    <nav class="app-header__nav">
      <NuxtLink to="/" :class="{ active: isHome }">
        {{ $t('nav.thematicMaps') }}
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

const isHome = computed(() => route.path === '/' || route.path === '');
</script>

<style scoped>
.app-header__mark {
  width: 48px;
  height: 40px;
  background: #1A9553;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.6rem;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
</style>
