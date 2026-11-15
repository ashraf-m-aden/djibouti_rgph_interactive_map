<template>
  <div
    v-if="isOpen"
    class="app-sidebar__overlay"
    aria-hidden="true"
    @click="close"
  ></div>

  <aside class="app-sidebar" :class="{ 'is-open': isOpen }">
    <div class="app-sidebar__mobile-brand">
      <img src="/logo-blue.png" alt="INSTAD" />
    </div>

    <nav class="app-sidebar__mobile-nav">
      <NuxtLink to="/" :class="{ 'is-active': isHome }">{{ $t('nav.thematicMaps') }}</NuxtLink>
      <NuxtLink to="/chiffres-cles" :class="{ 'is-active': route.path === '/chiffres-cles' }">
        {{ $t('nav.keyFigures') }}
      </NuxtLink>
      <NuxtLink to="/tableaux" :class="{ 'is-active': route.path === '/tableaux' }">
        {{ $t('nav.tables') }}
      </NuxtLink>
      <NuxtLink to="/concepts" :class="{ 'is-active': route.path === '/concepts' }">
        {{ $t('nav.concepts') }}
      </NuxtLink>
    </nav>

    <div class="app-sidebar__header">
      {{ $t('sidebar.themes') }}
    </div>

    <div class="app-sidebar__search">
      <input
        v-model="searchQuery"
        type="search"
        :placeholder="$t('sidebar.searchPlaceholder')"
      />
    </div>

    <!-- Resultats de /api/search : themes, regions et indicateurs. Le champ
         ne filtrait auparavant que les 7 libelles de themes charges en dur
         (cf. AUDIT F-07). -->
    <div v-if="searchQuery.trim().length >= 2" class="search-results">
      <p v-if="searching" class="search-results__hint">{{ $t('common.loading') }}</p>
      <template v-else-if="hasResults">
        <template v-if="results.themes.length">
          <div class="search-results__group">{{ $t('common.themes') }}</div>
          <button
            v-for="theme in results.themes"
            :key="`t-${theme.slug}`"
            class="search-results__item"
            @click="goToTheme(theme.slug)"
          >
            <span class="mdi mdi-shape-outline"></span>
            {{ getLocalizedName(theme.name, theme.slug) }}
          </button>
        </template>

        <template v-if="results.regions.length">
          <div class="search-results__group">{{ $t('common.regions') }}</div>
          <button
            v-for="region in results.regions"
            :key="`r-${region.code}`"
            class="search-results__item"
            @click="goToRegion(region.code)"
          >
            <span class="mdi mdi-map-marker-outline"></span>
            {{ getLocalizedName(region.name, region.code) }}
          </button>
        </template>

        <template v-if="results.indicators.length">
          <div class="search-results__group">{{ $t('common.indicators') }}</div>
          <button
            v-for="indicator in results.indicators"
            :key="`i-${indicator.code}`"
            class="search-results__item"
            @click="goToTheme(indicator.themeSlug)"
          >
            <span class="mdi mdi-chart-bar"></span>
            {{ getLocalizedName(indicator.name, indicator.code) }}
          </button>
        </template>
      </template>
      <p v-else class="search-results__hint">{{ $t('common.searchNoResult') }}</p>
    </div>

    <nav v-else class="theme-tree">
      <div class="theme-tree__group">
        <div class="theme-tree__parent" @click="toggleGroup('rgph')">
          <span :class="['mdi', openGroups.includes('rgph') ? 'mdi-menu-down' : 'mdi-menu-right']"></span>
          {{ $t('app.fullTitle') }}
        </div>
        <div v-show="openGroups.includes('rgph')" class="theme-tree__children">
          <div
            v-for="theme in themes"
            :key="theme.slug"
            :class="['theme-tree__item', { 'theme-tree__item--active': activeSlug === theme.slug }]"
            @click="goToTheme(theme.slug)"
          >
            <span :class="['mdi', theme.icon || 'mdi-chart-bar']"></span>
            {{ getLocalizedName(theme.name, theme.slug) }}
          </div>
        </div>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import type { SearchResults } from '~/types/api';

const route = useRoute();
const { locale } = useI18n();
const themeStore = useThemeStore();
const { getLocalizedName } = useLocalizedContent();
const { isOpen, close } = useMobileNav();

const isHome = computed(() => route.path === '/' || route.path === '');

const searchQuery = ref('');
const searching = ref(false);
const openGroups = ref<string[]>(['rgph']);
const results = ref<SearchResults>({ themes: [], regions: [], indicators: [] });

const themes = computed(() => themeStore.themes);

// L'element actif se deduit de la route : un acces direct a /themes/sante
// ne mettait rien en surbrillance (cf. AUDIT F-07).
const activeSlug = computed(() => {
  if (route.path.startsWith('/themes/')) return String(route.params.slug ?? '');
  return themeStore.activeTheme ?? '';
});

const hasResults = computed(
  () => results.value.themes.length + results.value.regions.length + results.value.indicators.length > 0,
);

const clearResults = () => {
  results.value = { themes: [], regions: [], indicators: [] };
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const runSearch = async (query: string) => {
  searching.value = true;
  try {
    const { search } = useApi();
    const response = await search(query, String(locale.value) as any);
    results.value = response?.success && response.data
      ? response.data
      : { themes: [], regions: [], indicators: [] };
  } catch (error) {
    console.error('Error searching:', error);
    clearResults();
  } finally {
    searching.value = false;
  }
};

watch(searchQuery, (value) => {
  const query = value.trim();
  if (searchTimer) clearTimeout(searchTimer);

  if (query.length < 2) {
    clearResults();
    searching.value = false;
    return;
  }

  searchTimer = setTimeout(() => runSearch(query), 300);
});

const toggleGroup = (group: string) => {
  const index = openGroups.value.indexOf(group);
  if (index > -1) openGroups.value.splice(index, 1);
  else openGroups.value.push(group);
};

const goToTheme = (slug: string) => {
  if (!slug) return;
  themeStore.setActiveTheme(slug);
  searchQuery.value = '';
  close();
  navigateTo(`/themes/${slug}`);
};

const goToRegion = (code: string) => {
  searchQuery.value = '';
  close();
  navigateTo(`/regions/${code}`);
};

onMounted(() => {
  themeStore.fetchThemes();
});

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.app-sidebar {
  width: 280px;
  background: #f8f9fc;
  border-right: 1px solid #d7dbe6;
  display: flex;
  flex-direction: column;
  height: 100%;
}

[dir="rtl"] .app-sidebar {
  border-right: none;
  border-left: 1px solid #d7dbe6;
}

.app-sidebar__header {
  padding: 1rem 1.5rem 0.6rem;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8690a6;
}

.app-sidebar__search {
  padding: 0 1.5rem 1rem;
}

.app-sidebar__search input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d7dbe6;
  border-radius: 2px;
  font-size: 0.85rem;
  font-family: 'Public Sans', sans-serif;
  background: white;
  outline: none;
}

.app-sidebar__search input:focus {
  border-color: #00185F;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.search-results__hint {
  padding: 0.75rem 1.5rem;
  color: #8B90A0;
  font-size: 0.85rem;
}

.search-results__group {
  padding: 0.5rem 1.5rem 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #8B90A0;
}

.search-results__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.6rem 1.5rem;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.9rem;
  color: #5A5F72;
  cursor: pointer;
}

[dir="rtl"] .search-results__item {
  text-align: right;
}

.search-results__item:hover {
  background: #e8e8e8;
  color: #1A1D26;
}

.theme-tree {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
}

.theme-tree__group {
  margin-bottom: 0.5rem;
}

.theme-tree__parent {
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  color: #1A1D26;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s;
}

.theme-tree__parent:hover {
  background: #e8e8e8;
}

.theme-tree__children {
  padding-left: 1rem;
}

[dir="rtl"] .theme-tree__children {
  padding-left: 0;
  padding-right: 1rem;
}

.theme-tree__item {
  padding: 0.65rem 1.5rem;
  color: #5A5F72;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-left: 3px solid transparent;
  transition: all 0.2s;
  font-size: 0.85rem;
}

[dir="rtl"] .theme-tree__item {
  border-left: none;
  border-right: 3px solid transparent;
}

.theme-tree__item:hover {
  background: white;
  color: #1A1D26;
}

.theme-tree__item--active {
  background: #E6E9F2;
  border-left-color: #00185F;
  color: #00185F;
  font-weight: 600;
}

[dir="rtl"] .theme-tree__item--active {
  border-left-color: transparent;
  border-right-color: #00185F;
}

.theme-tree__item--active:hover {
  background: #E6E9F2;
}

.mdi {
  font-size: 1rem;
}

.app-sidebar__mobile-brand {
  display: none;
}

.app-sidebar__mobile-nav {
  display: none;
}

.app-sidebar__overlay {
  display: none;
}

/* Sous 768px le sidebar devient un volet coulissant (plutot que disparaitre
   purement et simplement : la navigation par theme etait alors inaccessible
   sur mobile) ouvert par le bouton hamburger de AppHeader.vue. */
@media (max-width: 768px) {
  .app-sidebar__overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(16, 19, 28, 0.4);
    z-index: 1400;
  }

  .app-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 86vw;
    max-width: 320px;
    height: 100vh;
    z-index: 1500;
    box-shadow: 2px 0 16px rgba(16, 19, 28, 0.2);
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  [dir="rtl"] .app-sidebar {
    left: auto;
    right: 0;
    transform: translateX(100%);
  }

  .app-sidebar.is-open {
    transform: translateX(0);
  }

  .app-sidebar__mobile-brand {
    display: block;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #d7dbe6;
  }

  .app-sidebar__mobile-brand img {
    height: 28px;
    width: auto;
  }

  .app-sidebar__mobile-nav {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #d7dbe6;
    padding: 0.5rem 0;
  }

  .app-sidebar__mobile-nav a {
    padding: 0.7rem 1.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: #5a5f72;
    text-decoration: none;
  }

  .app-sidebar__mobile-nav a.is-active {
    color: #00185f;
    font-weight: 700;
  }
}
</style>
