<template>
  <div class="theme-page">
    <!-- Header avec titre et sélecteur d'indicateur -->
    <div class="theme-header">
      <div class="theme-header__content">
        <h1 class="theme-header__title">
          {{ isMapLoading ? $t('common.loading') : currentIndicatorName || $t('errors.noIndicator') }}
        </h1>
        <select
          v-if="mappableIndicators.length > 1"
          v-model="selectedIndicatorCode"
          class="indicator-selector"
          @change="onIndicatorChange"
        >
          <option
            v-for="indicator in mappableIndicators"
            :key="indicator.code"
            :value="indicator.code"
          >
            {{ getLocalizedName(indicator.name, indicator.code) }}
          </option>
        </select>
      </div>
    </div>

    <!-- Carte plein écran -->
    <div class="map-fullscreen">
      <!-- Message si pas de données -->
      <div v-if="!isMapLoading && !hasValues" class="no-data-overlay">
        <div class="no-data-card">
          <span class="mdi mdi-alert-circle-outline no-data-icon"></span>
          <h3>{{ $t('common.noData') }}</h3>
          <p>{{ $t('errors.indicatorNoData') }}</p>
        </div>
      </div>

      <DjiboutiMap
        v-if="geojson"
        :geojson="geojson"
        :map-data="mapData"
        :indicator-name="currentIndicatorName"
        :unit="currentUnit"
        :color-scale="colorScale"
        @region-click="onRegionClick"
      />
      <div v-else-if="isMapLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>{{ $t('map.loading') }}</p>
      </div>
    </div>

    <!-- Popup de données de région -->
    <transition name="slide">
      <div v-if="selectedRegionData" class="region-popup">
        <div class="region-popup__header">
          <div>
            <h2 class="region-popup__title">{{ selectedRegionData.name }}</h2>
            <p class="region-popup__subtitle">{{ currentIndicatorName }}</p>
          </div>
          <button class="region-popup__close" @click="closeRegionPopup">
            <span class="mdi mdi-close"></span>
          </button>
        </div>

        <div class="region-popup__content">
          <!-- Valeur principale -->
          <div class="region-value-card">
            <span class="region-value-label">{{ $t('common.value') }}</span>
            <span class="region-value">{{ formatValue(selectedRegionData.value, currentUnit) }}</span>
          </div>

          <!-- Message si pas de données pour cette région -->
          <div v-if="!regionChart && !subRegions.length" class="no-region-data">
            <span class="mdi mdi-information-outline"></span>
            <p>{{ $t('errors.regionNoDetail') }}</p>
          </div>

          <!-- Graphiques pour la région : une seule unité à la fois, lignes
               "ensemble" uniquement (cf. AUDIT F-09). -->
          <div v-if="regionChart" class="region-charts">
            <BarChart
              :title="regionChart.title"
              :labels="regionChart.labels"
              :datasets="[{ label: regionChart.title, data: regionChart.values }]"
              :horizontal="true"
            />

            <!-- Pas d'anneau ici : les indicateurs d'une region sont des
                 ensembles imbriques (population 15+, active, inactive,
                 occupes...), pas une partition. En faire des parts d'un total
                 serait faux, quelle que soit l'unite (cf. AUDIT F-09). -->
          </div>

          <!-- Statistiques de la région -->
          <div v-if="regionStats" class="region-stats">
            <h3>{{ $t('common.statistics') }}</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">{{ $t('common.code') }}</span>
                <span class="stat-value">{{ selectedRegionData.code }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ $t('common.rank') }}</span>
                <span class="stat-value">{{ regionStats.rank }}/{{ regionStats.total }}</span>
              </div>
              <div v-if="regionStats.share !== null" class="stat-item">
                <span class="stat-label">{{ $t('common.shareOfTotal') }}</span>
                <span class="stat-value">{{ regionStats.share }} %</span>
              </div>
            </div>
          </div>

          <!-- Sous-régions si disponibles -->
          <div v-if="subRegions.length" class="sub-regions">
            <h3>{{ $t('common.subdivisions') }}</h3>
            <div class="sub-regions-list">
              <div
                v-for="subRegion in subRegions"
                :key="subRegion.code"
                class="sub-region-item"
              >
                <span class="sub-region-name">{{ subRegion.name }}</span>
                <span class="sub-region-value">{{ formatValue(subRegion.value, currentUnit) }}</span>
              </div>
            </div>
          </div>

          <!-- Comparaison avec autres régions -->
          <div v-if="topRegions.length > 0" class="region-comparison">
            <h3>{{ $t('common.comparison') }}</h3>
            <div class="comparison-bars">
              <div
                v-for="region in topRegions"
                :key="region.code"
                class="comparison-bar"
                :class="{ 'is-selected': region.code === selectedRegionData.code }"
              >
                <div class="comparison-bar__header">
                  <span class="comparison-bar__name">{{ region.name }}</span>
                  <span class="comparison-bar__value">{{ formatValue(region.value, currentUnit) }}</span>
                </div>
                <div class="comparison-bar__track">
                  <div class="comparison-bar__fill" :style="{ width: barWidth(region.value) }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bouton pour voir plus de détails -->
          <button class="view-details-btn" @click="navigateToRegionPage">
            {{ $t('region.viewAllDetails', { name: selectedRegionData.name }) }}
          </button>
        </div>
      </div>
    </transition>

    <!-- Overlay -->
    <transition name="fade">
      <div
        v-if="selectedRegionData"
        class="popup-overlay"
        @click="closeRegionPopup"
      ></div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import BarChart from "~/components/charts/BarChart.vue";
import DjiboutiMap from "~/components/map/DjiboutiMap.vue";
import type {
  ColorScale,
  GeoJSONData,
  Indicator,
  IndicatorMeta,
  MapDataEntry,
  Region,
  Unit,
} from "~/types/api";

// Composables
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const themeStore = useThemeStore();
const { getLocalizedName } = useLocalizedContent();
const { formatCompact: formatValue } = useValueFormat();

const slug = computed(() => String(route.params.slug));

// Refs
const geojson = ref<GeoJSONData | null>(null);
const mapData = ref<MapDataEntry[]>([]);
const indicators = ref<IndicatorMeta[]>([]);
const selectedIndicatorCode = ref("");
const colorScale = ref<ColorScale | null>(null);
const isMapLoading = ref(true);
const regionIndicators = ref<Indicator[]>([]);

// On conserve les objets bruts renvoyes par l'API plutot que des libelles
// deja resolus : sinon le panneau reste dans la langue precedente apres un
// changement de langue (cf. AUDIT F-24).
const selectedRegion = ref<Region | null>(null);
const childRegions = ref<Region[]>([]);

/**
 * Le sélecteur proposait les 64 indicateurs du thème, dont une trentaine
 * n'existent qu'au niveau national et laissaient donc la carte vide
 * (cf. AUDIT D-02). L'API expose maintenant hasRegionalData.
 */
const mappableIndicators = computed(() =>
  indicators.value.filter((i) => i.hasRegionalData !== false),
);

const selectedIndicator = computed(() =>
  indicators.value.find((i) => i.code === selectedIndicatorCode.value) ?? null,
);

const currentIndicatorName = computed(() =>
  selectedIndicator.value
    ? getLocalizedName(selectedIndicator.value.name, selectedIndicator.value.code)
    : "",
);

const currentUnit = computed<Unit>(() => (selectedIndicator.value?.unit as Unit) ?? "number");

const selectedRegionData = computed(() => {
  const region = selectedRegion.value;
  if (!region) return null;

  return {
    code: region.code,
    name: getLocalizedName(region.name, region.code),
    // "?? null" et non "|| null" : une valeur de 0 est une valeur
    // (cf. AUDIT F-10).
    value: mapData.value.find((d) => d.regionCode === region.code)?.value ?? null,
  };
});

const subRegions = computed(() =>
  childRegions.value.map((child) => ({
    code: child.code,
    name: getLocalizedName(child.name, child.code),
    value: null as number | null,
  })),
);

const numericEntries = computed(() =>
  mapData.value.filter(
    (entry): entry is MapDataEntry & { value: number } =>
      typeof entry.value === "number" && Number.isFinite(entry.value),
  ),
);

const hasValues = computed(() => numericEntries.value.length > 0);

const maxRegionValue = computed(() =>
  numericEntries.value.reduce((max, entry) => Math.max(max, entry.value), 0),
);

const regionStats = computed(() => {
  const selected = selectedRegionData.value;
  if (!selected || selected.value === null) return null;

  const sorted = [...numericEntries.value].sort((a, b) => b.value - a.value);
  if (!sorted.length) return null;

  const rank = sorted.findIndex((entry) => entry.regionCode === selected.code) + 1;
  if (rank === 0) return null;

  // Une part du total n'a de sens que sur des effectifs : la somme de taux
  // regionaux ne represente rien.
  const total = sorted.reduce((sum, entry) => sum + entry.value, 0);
  const share =
    currentUnit.value === "number" && total > 0
      ? ((selected.value / total) * 100).toFixed(1)
      : null;

  return { rank, total: sorted.length, share };
});

const topRegions = computed(() =>
  [...numericEntries.value]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((entry) => ({
      code: entry.regionCode,
      name: getLocalizedName(entry.regionName, entry.regionCode),
      value: entry.value,
    })),
);

/**
 * Graphique du panneau régional : uniquement les lignes "ensemble" partageant
 * l'unité de l'indicateur courant. L'ancienne version empilait tous les
 * indicateurs de la région, toutes unités et toutes ventilations confondues.
 */
const regionChart = computed(() => {
  const rows = regionIndicators.value.filter(
    (ind) =>
      (!ind.disaggregation || Object.keys(ind.disaggregation).length === 0) &&
      typeof ind.value === "number" &&
      Number.isFinite(ind.value) &&
      ind.unit === currentUnit.value,
  );

  if (rows.length < 2) return null;

  return {
    unit: currentUnit.value,
    title: selectedRegionData.value?.name ?? t("region.mainIndicators"),
    labels: rows.map((ind) => getLocalizedName(ind.name, ind.indicatorCode)),
    values: rows.map((ind) => ind.value as number),
  };
});



const barWidth = (value: number): string => {
  if (!maxRegionValue.value) return "0%";
  return `${Math.max(0, Math.min(100, (value / maxRegionValue.value) * 100))}%`;
};

const findIndicator = (code: string) => mappableIndicators.value.find((i) => i.code === code);

// Load indicator data
const loadIndicatorData = async (indicatorCode: string) => {
  try {
    const api = useApi();
    const response = await api.getMapData(indicatorCode, { level: "region" });

    if (response?.success && response.data) {
      mapData.value = response.data.mapData ?? [];
      colorScale.value = response.data.visualization?.colorScale ?? null;
    } else {
      mapData.value = [];
      colorScale.value = null;
    }
  } catch (error) {
    console.error("Error loading indicator data:", error);
    mapData.value = [];
    colorScale.value = null;
  }
};

const selectIndicator = async (meta: IndicatorMeta) => {
  selectedIndicatorCode.value = meta.code;
  await loadIndicatorData(meta.code);
};

// Load region specific data
const loadRegionData = async (regionCode: string) => {
  const api = useApi();

  try {
    const regionResponse = await api.getRegion(regionCode);
    if (regionResponse?.success && regionResponse.data) {
      selectedRegion.value = regionResponse.data;
    }
  } catch (error) {
    console.error("Error loading region data:", error);
    return;
  }

  try {
    const childrenResponse = await api.getRegionChildren(regionCode);
    childRegions.value =
      childrenResponse?.success && Array.isArray(childrenResponse.data)
        ? childrenResponse.data
        : [];
  } catch {
    childRegions.value = [];
  }

  try {
    const indicatorsResponse = await api.getRegionIndicators(regionCode, { theme: slug.value });
    regionIndicators.value =
      indicatorsResponse?.success && Array.isArray(indicatorsResponse.data)
        ? indicatorsResponse.data
        : [];
  } catch {
    regionIndicators.value = [];
  }
};

// Load theme data
const loadThemeData = async () => {
  isMapLoading.value = true;
  closeRegionPopup();

  try {
    const api = useApi();

    // Toujours charger le GeoJSON d'abord : la carte reste affichée même
    // lorsque l'indicateur n'a aucune valeur (cf. AUDIT F-03).
    const geoResponse = await api.getGeoJSON("region");
    if (geoResponse?.success) geojson.value = geoResponse.data;

    const themeResponse = await api.getTheme(slug.value);
    if (themeResponse?.success && themeResponse.data) {
      indicators.value = themeResponse.data.indicators ?? [];

      const first = mappableIndicators.value[0];
      if (first) {
        await selectIndicator(first);
      } else {
        selectedIndicatorCode.value = "";
        mapData.value = [];
      }
    }
  } catch (error) {
    console.error("Error loading theme data:", error);
    mapData.value = [];
  } finally {
    isMapLoading.value = false;
  }
};

// Event handlers
const onIndicatorChange = async () => {
  const meta = findIndicator(selectedIndicatorCode.value);
  if (!meta) return;

  await selectIndicator(meta);

  if (selectedRegionData.value) {
    await loadRegionData(selectedRegionData.value.code);
  }
};

const onRegionClick = async (regionProps: { code?: string }) => {
  if (regionProps?.code) await loadRegionData(regionProps.code);
};

function closeRegionPopup() {
  selectedRegion.value = null;
  childRegions.value = [];
  regionIndicators.value = [];
}

const navigateToRegionPage = () => {
  if (selectedRegionData.value) {
    router.push(`/regions/${selectedRegionData.value.code}`);
  }
};

// Lifecycle
onMounted(() => {
  themeStore.setActiveTheme(slug.value);
  loadThemeData();
});

watch(slug, () => {
  themeStore.setActiveTheme(slug.value);
  loadThemeData();
});
</script>
<style scoped>
.theme-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  background: #f5f5f5;
  position: relative;
}

.theme-header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 1.5rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.theme-header__content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}
/* Overlay pour message "pas de données" */
.no-data-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  pointer-events: none;
}

.no-data-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  text-align: center;
  max-width: 400px;
}

.no-data-icon {
  font-size: 4rem;
  color: #ff9800;
  display: block;
  margin-bottom: 1rem;
}

.no-data-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1d26;
  margin: 0 0 0.5rem 0;
}

.no-data-card p {
  font-size: 0.95rem;
  color: #5a5f72;
  margin: 0;
}

.no-region-data {
  background: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.no-region-data .mdi {
  font-size: 2rem;
  color: #ff9800;
  flex-shrink: 0;
}

.no-region-data p {
  margin: 0;
  font-size: 0.95rem;
  color: #5a5f72;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #00185F;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.theme-header__title {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 1.4rem;
  font-weight: 600;
  color: #1a1d26;
  margin: 0;
  flex: 1;
}

.indicator-selector {
  padding: 0.7rem 1rem;
  border: 1px solid #d0d0d0;
  border-radius: 2px;
  font-size: 0.9rem;
  font-family: 'Public Sans', sans-serif;
  background: white;
  cursor: pointer;
  min-width: 250px;
  outline: none;
  transition: border-color 0.2s;
}

.indicator-selector:focus {
  border-color: #00185F;
}

.map-fullscreen {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

/* Popup de région */
.region-popup {
  position: fixed;
  right: 0;
  top: 60px;
  bottom: 0;
  width: 450px;
  background: white;
  border-left: 1px solid #d7dbe6;
  box-shadow: -2px 0 10px rgba(16, 19, 28, 0.08);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.region-popup__header {
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.region-popup__title {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1d26;
  margin: 0 0 0.25rem 0;
}

.region-popup__subtitle {
  font-size: 0.875rem;
  color: #5a5f72;
  margin: 0;
}

.region-popup__close {
  background: white;
  border: 1px solid #d7dbe6;
  width: 28px;
  height: 28px;
  font-size: 1.1rem;
  line-height: 1;
  color: #5a5f72;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s;
}

.region-popup__close:hover {
  color: #00185F;
  border-color: #00185F;
}

.region-popup__content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.region-value-card {
  background: white;
  border: 1px solid #d0d0d0;
  padding: 1.25rem 1.5rem;
  text-align: left;
  margin-bottom: 1.5rem;
}

.region-value-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #5a5f72;
  margin-bottom: 0.4rem;
}

.region-value {
  display: block;
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 2.1rem;
  font-weight: 600;
  color: #00185F;
}

.region-value-card::after {
  content: '';
  display: block;
  width: 36px;
  height: 2px;
  background: #E60020;
  margin-top: 0.7rem;
}

.region-charts {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.region-stats {
  margin-bottom: 1.5rem;
}

.region-stats h3,
.sub-regions h3,
.region-comparison h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1d26;
  margin: 0 0 1rem 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #5a5f72;
  font-weight: 500;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1d26;
}

.sub-regions {
  margin-bottom: 1.5rem;
}

.sub-regions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sub-region-item {
  background: #f5f5f5;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-region-name {
  font-size: 0.875rem;
  color: #1a1d26;
}

.sub-region-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #00185F;
}

.region-comparison {
  margin-bottom: 1.5rem;
}

.comparison-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.comparison-bar {
  padding: 0.7rem 0.85rem;
  border: 1px solid #e0e0e0;
}

.comparison-bar.is-selected {
  background: #E6E9F2;
  border-color: #E60020;
}

.comparison-bar.is-selected .comparison-bar__name {
  color: #00185F;
  font-weight: 700;
}

.comparison-bar__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.comparison-bar__name {
  font-size: 0.875rem;
  color: #1a1d26;
  font-weight: 500;
}

.comparison-bar__value {
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 0.82rem;
  font-weight: 500;
  color: #5a5f72;
}

.comparison-bar__track {
  height: 6px;
  background: #e8eaf2;
  border: 1px solid #d7dbe6;
}

.comparison-bar__fill {
  height: 100%;
  background: #00185F;
  transition: width 0.3s ease;
}

.comparison-bar.is-selected .comparison-bar__fill {
  background: #E60020;
}

.view-details-btn {
  width: 100%;
  padding: 0.9rem;
  background: #00185F;
  color: white;
  border: none;
  font-family: 'Public Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s;
}

.view-details-btn:hover {
  background: #000D33;
}

.popup-overlay {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

/* Animations */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .region-popup {
    width: 100%;
  }

  .theme-header__content {
    flex-direction: column;
    align-items: stretch;
  }

  .indicator-selector {
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>