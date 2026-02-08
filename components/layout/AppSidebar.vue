<template>
  <aside class="app-sidebar">
    <div class="app-sidebar__header">
      {{ $t('sidebar.themes') }}
    </div>
    <div class="app-sidebar__search">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="$t('sidebar.searchPlaceholder')"
      />
    </div>
    <nav class="theme-tree">
      <!-- Main RGPH section -->
      <div class="theme-tree__group">
        <div class="theme-tree__parent" @click="toggleGroup('rgph')">
          <span class="mdi mdi-checkbox-blank-outline"></span>
          {{ $t('app.fullTitle') }}
        </div>
        <div v-show="openGroups.includes('rgph')" class="theme-tree__children">
          <div
            v-for="theme in filteredThemes"
            :key="theme.slug"
            :class="['theme-tree__item', { 'theme-tree__item--active': activeTheme === theme.slug }]"
            @click="selectTheme(theme.slug)"
          >
            <span class="mdi mdi-checkbox-blank-outline"></span>
            {{ getThemeName(theme) }}
          </div>
        </div>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import type { Theme } from '~/types/api';

// Types locaux
interface LocalizedName {
  fr: string;
  ar?: string;
  en?: string;
}

// Composables
const { locale, t } = useI18n();
const themeStore = useThemeStore();

// Computed
const currentLang = computed(() => String(locale.value));

// Refs
const searchQuery = ref('');
const openGroups = ref<string[]>(['rgph']);
const activeTheme = ref('');

// Computed properties
const themes = computed(() => themeStore.themes);

const filteredThemes = computed(() => {
  if (!searchQuery.value) return themes.value;
  const query = searchQuery.value.toLowerCase();
  return themes.value.filter(theme => {
    const name = getThemeName(theme);
    return name.toLowerCase().includes(query);
  });
});

// Utility functions
const getThemeName = (theme: Theme): string => {
  const name = theme.name;
  
  if (!name) return theme.slug;
  if (typeof name === 'string') return name;
  if (typeof name === 'object') {
    return name[currentLang.value as keyof LocalizedName] || 
           name.fr || 
           name.en || 
           name.ar || 
           theme.slug;
  }
  
  return theme.slug;
};

const toggleGroup = (group: string) => {
  const index = openGroups.value.indexOf(group);
  if (index > -1) {
    openGroups.value.splice(index, 1);
  } else {
    openGroups.value.push(group);
  }
};

const selectTheme = (slug: string) => {
  activeTheme.value = slug;
  themeStore.setActiveTheme(slug);
  navigateTo(`/themes/${slug}`);
};
</script>

<style scoped>
.app-sidebar {
  width: 280px;
  background: #f8f9fa;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-sidebar__header {
  padding: 1rem 1.5rem;
  font-weight: 700;
  font-size: 1.1rem;
  color: #1A1D26;
  border-bottom: 1px solid #e0e0e0;
}

.app-sidebar__search {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.app-sidebar__search input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 0.9rem;
  outline: none;
}

.app-sidebar__search input:focus {
  border-color: #1A9553;
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

.theme-tree__item {
  padding: 0.75rem 1.5rem;
  color: #5A5F72;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.theme-tree__item:hover {
  background: #e8e8e8;
  color: #1A1D26;
}

.theme-tree__item--active {
  background: #1A9553;
  color: white;
  font-weight: 600;
}

.theme-tree__item--active:hover {
  background: #157a42;
}

.mdi {
  font-size: 1rem;
}
</style>