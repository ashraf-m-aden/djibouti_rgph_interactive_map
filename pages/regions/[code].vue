<template>
  <div class="region-page">
    <!-- Loading state -->
    <div v-if="loading" class="region-page__state">
      <p>{{ $t('common.loading') }}</p>
    </div>

    <!-- Region content -->
    <div v-else-if="region">
      <div class="region-page__header">
        <div class="region-page__header-text">
          <h1>{{ getLocalizedName(region.name, region.code) }}</h1>
          <p>{{ $t('app.fullTitle') }}</p>
        </div>

        <select
          v-if="themes.length > 1"
          v-model="selectedThemeSlug"
          class="indicator-selector"
          @change="onThemeChange"
        >
          <option value="">{{ $t('common.allThemes') }}</option>
          <option
            v-for="theme in themes"
            :key="theme.slug"
            :value="theme.slug"
          >
            {{ getLocalizedName(theme.name, theme.slug) }}
          </option>
        </select>
      </div>

      <!-- Chiffres cles : la superficie vient de la region, les effectifs des
           indicateurs reellement presents en base. L'ancienne version lisait
           region.population, champ absent du modele backend, si bien
           qu'aucune carte "population" ni "densite" ne s'affichait jamais
           (cf. AUDIT F-08). -->
      <div v-if="keyFigures.length" class="key-figures">
        <div v-for="figure in keyFigures" :key="figure.code" class="key-figure-card">
          <div class="key-figure-card__icon" :style="{ background: figure.color }">
            <span :class="['mdi', figure.icon]"></span>
          </div>
          <div class="key-figure-card__value">{{ figure.display }}</div>
          <div class="key-figure-card__label">{{ figure.label }}</div>
        </div>
      </div>

      <!-- Un graphique par unite : melanger effectifs et pourcentages dans le
           meme histogramme le rendait illisible (cf. AUDIT F-09). -->
      <div v-if="chartGroups.length" class="charts-panel">
        <BarChart
          v-for="group in chartGroups"
          :key="group.unit"
          :title="group.title"
          :labels="group.labels"
          :datasets="[{ label: group.title, data: group.values }]"
          :horizontal="true"
        />
      </div>

      <div v-else class="region-page__state">
        <p>{{ $t('errors.regionNoData') }}</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else class="region-page__state">
      <p class="region-page__error">{{ $t('errors.regionNotFound') }}</p>
      <button class="region-page__back" @click="router.push('/')">
        {{ $t('common.backHome') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import BarChart from '~/components/charts/BarChart.vue';
import type { Indicator, Region, Unit } from '~/types/api';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { getLocalizedName } = useLocalizedContent();
const { formatCompact: formatValue } = useValueFormat();
const themeStore = useThemeStore();

const regionCode = computed(() => String(route.params.code));

// Filtre par theme : la page chargeait tous les indicateurs de tous les
// themes melanges, sans aucun moyen de les isoler.
const themes = computed(() => themeStore.themes);
const selectedThemeSlug = ref('');

const region = ref<Region | null>(null);
const indicators = ref<Indicator[]>([]);
const loading = ref(true);

/** Seules les lignes "ensemble" sont comparables entre elles. */
const isTotal = (indicator: Indicator) =>
  !indicator.disaggregation || Object.keys(indicator.disaggregation).length === 0;

const hasValue = (indicator: Indicator) =>
  typeof indicator.value === 'number' && Number.isFinite(indicator.value);

const totals = computed(() => indicators.value.filter((i) => isTotal(i) && hasValue(i)));



const PALETTE = ['#1A9553', '#1A5276', '#D35400', '#8E44AD', '#C8A951', '#E74C3C'];

const keyFigures = computed(() => {
  const figures: Array<{
    code: string;
    label: string;
    display: string;
    icon: string;
    color: string;
  }> = [];

  if (typeof region.value?.area === 'number') {
    figures.push({
      code: 'area',
      label: t('region.area'),
      display: formatValue(region.value.area),
      icon: 'mdi-map',
      color: '#0066CC',
    });
  }

  totals.value
    .filter((i) => i.unit === 'number')
    .slice(0, 5)
    .forEach((indicator, index) => {
      figures.push({
        code: `${indicator.indicatorCode}-${index}`,
        label: getLocalizedName(indicator.name, indicator.indicatorCode),
        display: formatValue(indicator.value as number, indicator.unit),
        icon: 'mdi-chart-box-outline',
        color: PALETTE[index % PALETTE.length],
      });
    });

  return figures;
});

/**
 * Un graphique par unite. Les effectifs ("number") sont deja presentes en
 * cartes de chiffres cles ; les taux et les ratios ne partagent pas la meme
 * echelle et ne peuvent donc pas figurer sur le meme axe.
 */
const UNIT_TITLES: Partial<Record<Unit, string>> = {
  percentage: 'region.mainIndicators',
};

const chartGroups = computed(() => {
  const byUnit = new Map<Unit, Indicator[]>();

  totals.value
    .filter((i) => i.unit && i.unit !== 'number')
    .forEach((indicator) => {
      const unit = indicator.unit as Unit;
      byUnit.set(unit, [...(byUnit.get(unit) ?? []), indicator]);
    });

  return [...byUnit.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([unit, rows]) => ({
      unit,
      title: t(UNIT_TITLES[unit] ?? 'region.mainIndicators'),
      labels: rows.map((i) => getLocalizedName(i.name, i.indicatorCode)),
      values: rows.map((i) => i.value as number),
    }));
});

const loadIndicators = async () => {
  const api = useApi();

  try {
    const params = selectedThemeSlug.value ? { themeSlug: selectedThemeSlug.value } : {};
    const response = await api.getRegionIndicators(regionCode.value, params);
    if (response?.success && Array.isArray(response.data)) indicators.value = response.data;
    else indicators.value = [];
  } catch (error) {
    console.error('Error loading region indicators:', error);
    indicators.value = [];
  }
};

const loadRegionData = async () => {
  loading.value = true;
  region.value = null;
  indicators.value = [];

  const api = useApi();

  try {
    const response = await api.getRegion(regionCode.value);
    if (response?.success && response.data) region.value = response.data;
  } catch (error) {
    console.error('Error loading region:', error);
    loading.value = false;
    return;
  }

  await loadIndicators();
  loading.value = false;
};

const onThemeChange = () => {
  loadIndicators();
};

onMounted(() => {
  themeStore.fetchThemes();
  loadRegionData();
});

watch(regionCode, () => {
  selectedThemeSlug.value = '';
  loadRegionData();
});
</script>

<style scoped>
.region-page {
  padding: 24px;
}

.region-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 24px;
}

.region-page__header h1 {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: #1A1D26;
}

.indicator-selector {
  padding: 0.7rem 1rem;
  border: 1px solid #d0d0d0;
  border-radius: 2px;
  font-size: 0.9rem;
  font-family: 'Public Sans', sans-serif;
  background: white;
  cursor: pointer;
  min-width: 220px;
  outline: none;
  transition: border-color 0.2s;
  flex-shrink: 0;
}

.indicator-selector:focus {
  border-color: #00185F;
}

.region-page__header p {
  color: #5A5F72;
  font-size: 0.9rem;
}

.region-page__state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.region-page__error {
  color: #E60020;
}

.region-page__back {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border: 1px solid #d0d0d0;
  background: white;
  border-radius: 2px;
  font-family: 'Public Sans', sans-serif;
}

.key-figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  border: 1px solid #d7dbe6;
  margin-bottom: 2rem;
}

.key-figure-card {
  background: white;
  padding: 1.25rem 1.4rem;
  border-left: 1px solid #d7dbe6;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.key-figure-card:first-child {
  border-left: none;
}

.key-figure-card__icon {
  width: 32px;
  height: 32px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.9rem;
}

.key-figure-card__icon .mdi {
  font-size: 18px;
  color: white;
}

.key-figure-card__value {
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 1.4rem;
  font-weight: 500;
  color: #1A1D26;
  margin-bottom: 0.4rem;
}

.key-figure-card__label {
  font-size: 0.78rem;
  color: #5A5F72;
}

.charts-panel {
  padding: 0;
}

@media (max-width: 600px) {
  .region-page {
    padding: 14px;
  }

  .region-page__header {
    flex-direction: column;
    align-items: stretch;
  }

  .region-page__header h1 {
    font-size: 1.3rem;
  }

  .indicator-selector {
    width: 100%;
    min-width: 0;
  }
}
</style>
