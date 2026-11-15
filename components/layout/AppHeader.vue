<template>
  <div class="letterhead-rule" aria-hidden="true"><span></span><span></span><span></span></div>

  <header class="app-header">
    <button
      class="app-header__menu-btn"
      type="button"
      :aria-label="$t('common.menu')"
      :aria-expanded="isMenuOpen"
      @click="toggle"
    >
      <span class="mdi" :class="isMenuOpen ? 'mdi-close' : 'mdi-menu'"></span>
    </button>

    <div class="app-header__brand">
      <img class="app-header__logo" src="/logo-blue.png" alt="INSTAD" />
      <div class="app-header__text">
        <span class="app-header__eyebrow">{{ $t('app.subtitle') }}</span>
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
const { isOpen: isMenuOpen, toggle, close } = useMobileNav();

const isHome = computed(() => route.path === '/' || route.path === '');

// Le volet mobile (AppSidebar) ne doit pas rester ouvert apres une
// navigation : sans ce watch l'utilisateur se retrouve avec le menu
// toujours affiche par-dessus la nouvelle page.
watch(() => route.path, () => close());
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

.app-header__menu-btn {
  display: none;
}

@media (max-width: 768px) {
  .app-header__menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid #d7dbe6;
    background: white;
    color: #10131c;
    font-size: 1.1rem;
    cursor: pointer;
    flex-shrink: 0;
    margin-right: 12px;
  }

  [dir="rtl"] .app-header__menu-btn {
    margin-right: 0;
    margin-left: 12px;
  }

  /* Sur mobile le logo passe dans le volet (AppSidebar.vue), ouvert par ce
     bouton : pas besoin de le dupliquer dans un header deja etroit. */
  .app-header__brand {
    display: none;
  }
}
</style>
