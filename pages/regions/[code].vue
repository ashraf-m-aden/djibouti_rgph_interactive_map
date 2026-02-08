<template>
  <div style="padding: 24px;">
    <!-- Loading state -->
    <div v-if="loading" style="text-align: center; padding: 2rem;">
      <p>Chargement...</p>
    </div>

    <!-- Region content -->
    <div v-else-if="region">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.5rem; font-weight: 700; color: #1A1D26;">
          {{ getLocalizedName(region.name) }}
        </h1>
        <p style="color: #5A5F72; font-size: 0.9rem;">
          {{ $t('app.fullTitle') }}
        </p>
      </div>

      <!-- Key Figures -->
      <div v-if="keyFigures.length" class="key-figures">
        <div
          v-for="figure in keyFigures"
          :key="figure.code"
          class="key-figure-card"
        >
          <div
            class="key-figure-card__icon"
            :style="{ background: figure.color || '#1A9553' }"
          >
            <span :class="['mdi', figure.icon || 'mdi-chart-bar']"></span>
          </div>
          <div class="key-figure-card__value">
            {{ formatNumber(figure.value) }}
          </div>
          <div class="key-figure-card__label">
            {{ getLocalizedName(figure.label) }}
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div v-if="regionIndicators.length" class="charts-panel" style="padding: 24px 0;">
        <BarChart
          title="Indicateurs principaux"
          :labels="chartLabels"
          :datasets="chartDatasets"
        />
      </div>

      <!-- No data message -->
      <div v-else style="text-align: center; padding: 2rem; color: #666;">
        <p>Aucune donnée disponible pour cette région.</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else style="text-align: center; padding: 2rem;">
      <p style="color: #D32F2F;">Région non trouvée</p>
      <button @click="$router.push('/')" style="margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer;">
        Retour à l'accueil
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import BarChart from '~/components/charts/BarChart.vue';
import type { Region, Indicator } from '~/types/api';

// Types
interface LocalizedName {
  fr: string;
  ar?: string;
  en?: string;
}

interface KeyFigure {
  code: string;
  label: string | LocalizedName;
  value: number;
  icon?: string;
  color?: string;
}

interface RegionIndicator extends Indicator {
  value?: number;
}

// Composables
const route = useRoute();
const { locale } = useI18n();

// Computed
const currentLang = computed(() => String(locale.value));
const regionCode = computed(() => String(route.params.code));

// Refs
const region = ref<Region | null>(null);
const keyFigures = ref<KeyFigure[]>([]);
const regionIndicators = ref<RegionIndicator[]>([]);
const loading = ref(true);

// Chart data
const chartLabels = computed(() => {
  return regionIndicators.value
    .filter(i => i.value !== undefined && i.value !== null)
    .map(i => getLocalizedName(i.name));
});

const chartDatasets = computed(() => {
  return [{
    label: 'Valeur',
    data: regionIndicators.value
      .filter(i => i.value !== undefined && i.value !== null)
      .map(i => i.value || 0)
  }];
});

// Utility functions
const getLocalizedName = (nameObj: string | LocalizedName | null | undefined): string => {
  if (!nameObj) return '';
  if (typeof nameObj === 'string') return nameObj;
  if (typeof nameObj === 'object') {
    return nameObj[currentLang.value as keyof LocalizedName] || nameObj.fr || nameObj.en || '';
  }
  return '';
};

const formatNumber = (num: number | null | undefined): string => {
  if (!num && num !== 0) return '—';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
  return num.toLocaleString();
};

// Generate key figures from region data
const generateKeyFigures = (regionData: Region) => {
  const figures: KeyFigure[] = [];
  
  // Population totale
  if (regionData.population) {
    figures.push({
      code: 'population',
      label: { fr: 'Population totale', ar: 'إجمالي السكان', en: 'Total Population' },
      value: regionData.population,
      icon: 'mdi-account-group',
      color: '#1A9553',
    });
  }
  
  // Superficie
  if (regionData.area) {
    figures.push({
      code: 'area',
      label: { fr: 'Superficie (km²)', ar: 'المساحة (كم²)', en: 'Area (km²)' },
      value: regionData.area,
      icon: 'mdi-map',
      color: '#0066CC',
    });
  }
  
  // Densité
  if (regionData.population && regionData.area) {
    figures.push({
      code: 'density',
      label: { fr: 'Densité (hab/km²)', ar: 'الكثافة (نسمة/كم²)', en: 'Density (pop/km²)' },
      value: Math.round(regionData.population / regionData.area),
      icon: 'mdi-map-marker-radius',
      color: '#FF6B35',
    });
  }
  
  keyFigures.value = figures;
};

// Load region data
const loadRegionData = async () => {
  loading.value = true;
  try {
    const api = useApi();
    
    // Fetch region details
    const response = await api.getRegion(regionCode.value);
    if (response?.success && response.data) {
      region.value = response.data;
      generateKeyFigures(response.data);
    }
    
    // Fetch region indicators
    const indResponse = await api.getRegionIndicators(regionCode.value);
    if (indResponse?.success && indResponse.data) {
      regionIndicators.value = indResponse.data;
    }
  } catch (error) {
    console.error('Error loading region data:', error);
    region.value = null;
  } finally {
    loading.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadRegionData();
});

watch(regionCode, () => {
  loadRegionData();
});
</script>

<style scoped>
.key-figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.key-figure-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.key-figure-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.key-figure-card__icon .mdi {
  font-size: 24px;
  color: white;
}

.key-figure-card__value {
  font-size: 2rem;
  font-weight: 700;
  color: #1A1D26;
  margin-bottom: 0.5rem;
}

.key-figure-card__label {
  font-size: 0.875rem;
  color: #5A5F72;
}

.charts-panel {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>