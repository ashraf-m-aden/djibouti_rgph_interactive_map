<template>
  <div class="doc-page">
    <div class="doc-page__header">
      <h1>{{ $t('nav.keyFigures') }}</h1>
      <p>{{ $t('app.censusCode') }} &mdash; {{ $t('app.fullTitle') }}</p>
    </div>

    <div v-if="loading" class="doc-page__state">
      <p>{{ $t('common.loading') }}</p>
    </div>

    <div v-else-if="figures.length === 0" class="doc-page__state">
      <p>{{ $t('common.noData') }}</p>
    </div>

    <div v-else class="kpi-grid">
      <div v-for="figure in figures" :key="figure.code" class="kpi-tile">
        <span class="kpi-tile__tag">
          <span class="dot" :style="{ '--tag-color': figure.themeColor }"></span>
          {{ figure.themeName }}
        </span>
        <span class="kpi-tile__value">{{ figure.display }}</span>
        <span class="kpi-tile__label">{{ figure.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// "Chiffres cles" n'existait pas encore comme page (cf. AUDIT F-06, lien vers
// "#"). Le modele KeyFigure et la route /themes/:slug/key-figures existent
// deja cote API mais n'etaient appeles par aucune page.
import type { KeyFigure, Theme } from '~/types/api';

const { getLocalizedName } = useLocalizedContent();
const { locale } = useI18n();

const loading = ref(true);

interface DisplayFigure {
  code: string;
  label: string;
  display: string;
  themeName: string;
  themeColor: string;
}

const figures = ref<DisplayFigure[]>([]);

const formatRaw = (value: number): string =>
  new Intl.NumberFormat(String(locale.value), { maximumFractionDigits: 1 }).format(value);

const loadKeyFigures = async () => {
  loading.value = true;
  const api = useApi();

  try {
    const themesResponse = await api.getThemes();
    const themes: Theme[] = themesResponse?.success && Array.isArray(themesResponse.data)
      ? themesResponse.data
      : [];

    const results = await Promise.all(
      themes.map(async (theme) => {
        try {
          const response = await api.getThemeKeyFigures(theme.slug);
          const rows: KeyFigure[] = response?.success && Array.isArray(response.data) ? response.data : [];
          return rows.map((fig) => {
            const unit = getLocalizedName(fig.unit);
            const raw = getLocalizedName(fig.displayValue) || formatRaw(fig.value);
            return {
              code: fig.code,
              label: getLocalizedName(fig.label),
              display: unit ? `${raw} ${unit}` : raw,
              themeName: getLocalizedName(theme.name),
              themeColor: theme.color || '#00185F',
            };
          });
        } catch (error) {
          console.error(`Error loading key figures for theme ${theme.slug}:`, error);
          return [];
        }
      }),
    );

    figures.value = results.flat().sort((a, b) => a.themeName.localeCompare(b.themeName));
  } catch (error) {
    console.error('Error loading themes for key figures:', error);
    figures.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(loadKeyFigures);
watch(locale, loadKeyFigures);
</script>

<style scoped>
.doc-page {
  border: 1px solid #d7dbe6;
  margin: 24px;
  background: white;
}

.doc-page__header {
  padding: 26px 32px;
  border-bottom: 1px solid #d7dbe6;
  background: #f8f9fc;
}

.doc-page__header h1 {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: #10131c;
  margin: 0 0 4px;
}

.doc-page__header p {
  margin: 0;
  font-size: 0.82rem;
  color: #5b6478;
}

.doc-page__state {
  padding: 3rem;
  text-align: center;
  color: #5b6478;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.kpi-tile {
  padding: 24px 26px;
  border-right: 1px solid #d7dbe6;
  border-bottom: 1px solid #d7dbe6;
}

.kpi-grid .kpi-tile:nth-child(3n) {
  border-right: none;
}

.kpi-tile__tag {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #5b6478;
  margin-bottom: 12px;
}

.kpi-tile__tag .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tag-color);
  flex-shrink: 0;
}

.kpi-tile__value {
  display: block;
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 2rem;
  font-weight: 600;
  color: #00185f;
}

.kpi-tile__label {
  display: block;
  font-size: 0.82rem;
  color: #10131c;
  margin-top: 6px;
}

@media (max-width: 760px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .kpi-grid .kpi-tile {
    border-right: none;
  }
}
</style>
