<template>
  <div class="theme-page">
    <!-- Header avec titre et sélecteur d'indicateur -->
    <div class="theme-header">
      <div class="theme-header__content">
        <h1 class="theme-header__title">
          {{ isMapLoading ? "Chargement..." : currentIndicatorName || "Aucun indicateur trouvé" }}
        </h1>
        <select
          v-if="indicators.length > 1"
          v-model="selectedIndicatorCode"
          class="indicator-selector"
          @change="onIndicatorChange"
        >
          <option
            v-for="indicator in indicators"
            :key="indicator.code"
            :value="indicator.code"
          >
            {{ getIndicatorName(indicator) }}
          </option>
        </select>
      </div>
    </div>

    <!-- Carte plein écran -->
    <div class="map-fullscreen">
      <!-- Message si pas de données -->
      <div v-if="!isMapLoading && mapData.length === 0" class="no-data-overlay">
        <div class="no-data-card">
          <span class="mdi mdi-alert-circle-outline no-data-icon"></span>
          <h3>Aucune donnée disponible</h3>
          <p>Les données pour cet indicateur ne sont pas encore disponibles.</p>
        </div>
      </div>

      <DjiboutiMap
        v-if="geojson"
        :geojson="geojson"
        :map-data="mapData"
        :indicator-name="currentIndicatorName"
        @region-click="onRegionClick"
      />
      <div v-else-if="isMapLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Chargement de la carte...</p>
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
            <span class="region-value-label">Valeur</span>
            <span class="region-value">{{ formatNumber(selectedRegionData.value) }}</span>
          </div>

          <!-- Message si pas de données pour cette région -->
          <div v-if="!regionChartData.length && !subRegions.length" class="no-region-data">
            <span class="mdi mdi-information-outline"></span>
            <p>Aucune donnée détaillée disponible pour cette région.</p>
          </div>

          <!-- Graphiques pour la région -->
          <div v-if="regionChartData.length" class="region-charts">
            <BarChart
              :title="`${selectedRegionData.name} - Évolution`"
              :labels="regionChartLabels"
              :datasets="[{ label: currentIndicatorName, data: regionChartValues }]"
              :horizontal="true"
            />

            <PieChart
              v-if="regionChartLabels.length > 1"
              :title="`${selectedRegionData.name} - Distribution`"
              :labels="regionChartLabels"
              :data="regionChartValues"
            />
          </div>

          <!-- Statistiques de la région -->
          <div v-if="regionStats && selectedRegionData.value !== null" class="region-stats">
            <h3>Statistiques</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Code</span>
                <span class="stat-value">{{ selectedRegionData.code }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Rang</span>
                <span class="stat-value">{{ regionStats.rank }}/{{ mapData.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">% du total</span>
                <span class="stat-value">{{ regionStats.percentage }}%</span>
              </div>
            </div>
          </div>

          <!-- Sous-régions si disponibles -->
          <div v-if="subRegions.length" class="sub-regions">
            <h3>Subdivisions</h3>
            <div class="sub-regions-list">
              <div 
                v-for="subRegion in subRegions" 
                :key="subRegion.code"
                class="sub-region-item"
              >
                <span class="sub-region-name">{{ subRegion.name }}</span>
                <span class="sub-region-value">{{ formatNumber(subRegion.value) }}</span>
              </div>
            </div>
          </div>

          <!-- Comparaison avec autres régions -->
          <div v-if="topRegions.length > 0" class="region-comparison">
            <h3>Comparaison</h3>
            <div class="comparison-bars">
              <div 
                v-for="region in topRegions" 
                :key="region.code"
                class="comparison-bar"
                :class="{ 'is-selected': region.code === selectedRegionData.code }"
              >
                <div class="comparison-bar__header">
                  <span class="comparison-bar__name">{{ region.name }}</span>
                  <span class="comparison-bar__value">{{ formatNumber(region.value) }}</span>
                </div>
                <div class="comparison-bar__track">
                  <div 
                    class="comparison-bar__fill" 
                    :style="{ width: `${(region.value / maxRegionValue) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bouton pour voir plus de détails -->
          <button 
            class="view-details-btn"
            @click="navigateToRegionPage"
          >
            Voir tous les détails de {{ selectedRegionData.name }}
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
import PieChart from "~/components/charts/PieChart.vue";
import DjiboutiMap from "~/components/map/DjiboutiMap.vue";
import type { GeoJSONData, MapDataEntry, Indicator } from "~/types/api";

// Composables
const route = useRoute();
const router = useRouter();
const { locale } = useI18n();
const themeStore = useThemeStore();

// Computed
const currentLang = computed(() => String(locale.value));
const slug = computed(() => String(route.params.slug));

// Refs
const geojson = ref<GeoJSONData | null>(null);
const mapData = ref<MapDataEntry[]>([]);
const indicators = ref<Indicator[]>([]);
const selectedIndicatorCode = ref("");
const currentIndicatorName = ref("");
const isMapLoading = ref(true);
const selectedRegionData = ref<{
  code: string;
  name: string;
  value: number | null;
} | null>(null);
const subRegions = ref<Array<{ code: string; name: string; value: number | null }>>([]);
const regionChartData = ref<any[]>([]);

// Computed - Region stats
const regionStats = computed(() => {
  if (!selectedRegionData.value || selectedRegionData.value.value === null) return null;
  
  const validRegions = mapData.value.filter(r => r.value !== null);
  if (validRegions.length === 0) return null;
  
  const sortedRegions = [...validRegions].sort((a, b) => (b.value || 0) - (a.value || 0));
  const rank = sortedRegions.findIndex(r => r.regionCode === selectedRegionData.value?.code) + 1;
  const total = validRegions.reduce((sum, r) => sum + (r.value || 0), 0);
  const percentage = total > 0 ? ((selectedRegionData.value.value || 0) / total * 100).toFixed(1) : '0';
  
  return { rank, percentage };
});

const maxRegionValue = computed(() => {
  const values = mapData.value.map(r => r.value || 0).filter(v => v > 0);
  return values.length > 0 ? Math.max(...values) : 0;
});

const topRegions = computed(() => {
  return [...mapData.value]
    .filter(r => r.value !== null && r.value > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 5)
    .map(r => ({
      code: r.regionCode,
      name: getRegionName(r),
      value: r.value || 0,
    }));
});

const regionChartLabels = computed(() => {
  return regionChartData.value.map(d => d.label || 'Inconnu');
});

const regionChartValues = computed(() => {
  return regionChartData.value.map(d => d.value || 0);
});

// Utility functions
const getIndicatorName = (indicator: Indicator): string => {
  const name = indicator.name as any;
  if (typeof name === "string") return name;
  if (typeof name === "object") {
    return name[currentLang.value] || name.fr || name.en || indicator.code;
  }
  return indicator.code;
};

const getRegionName = (region: MapDataEntry): string => {
  const regionName = region.regionName as any;
  return regionName?.[currentLang.value] || regionName?.fr || region.regionCode || "Unknown";
};

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "—";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(0) + "k";
  return num.toLocaleString();
};

// Load indicator data
const loadIndicatorData = async (indicatorCode: string) => {
  try {
    const api = useApi();
    const mapResponse = await api.getMapData(indicatorCode);

    if (mapResponse?.success && mapResponse.data?.mapData) {
      mapData.value = mapResponse.data.mapData;
    } else {
      mapData.value = [];
      console.warn(`No data available for indicator: ${indicatorCode}`);
    }
  } catch (error) {
    console.error("Error loading indicator data:", error);
    mapData.value = [];
  }
};

// Load region specific data
const loadRegionData = async (regionCode: string) => {
  try {
    const api = useApi();
    
    // Charger les données de la région
    const regionResponse = await api.getRegion(regionCode);
    if (regionResponse?.success) {
      const region = regionResponse.data;
      
      selectedRegionData.value = {
        code: regionCode,
        name: getLocalizedName(region.name),
        value: mapData.value.find(d => d.regionCode === regionCode)?.value || null,
      };
    }

    // Charger les sous-régions
    try {
      const childrenResponse = await api.getRegionChildren(regionCode);
      if (childrenResponse?.success && childrenResponse.data) {
        subRegions.value = childrenResponse.data.map((child: any) => ({
          code: child.code,
          name: getLocalizedName(child.name),
          value: null,
        }));
      }
    } catch {
      subRegions.value = [];
    }

    // Charger les indicateurs de la région
    try {
      const indicatorsResponse = await api.getRegionIndicators(regionCode);
      if (indicatorsResponse?.success && indicatorsResponse.data) {
        regionChartData.value = indicatorsResponse.data.map((ind: any) => ({
          label: getLocalizedName(ind.name),
          value: ind.value || 0,
        }));
      }
    } catch {
      regionChartData.value = [];
    }
  } catch (error) {
    console.error("Error loading region data:", error);
  }
};

const getLocalizedName = (nameObj: any): string => {
  if (!nameObj) return '';
  if (typeof nameObj === 'string') return nameObj;
  if (typeof nameObj === 'object') {
    return nameObj[currentLang.value] || nameObj.fr || nameObj.en || '';
  }
  return '';
};

// Load theme data
const loadThemeData = async () => {
  isMapLoading.value = true;
  
  try {
    const api = useApi();

    // Toujours charger le GeoJSON d'abord
    const geoResponse = await api.getGeoJSON("region");
    if (geoResponse?.success) {
      geojson.value = geoResponse.data;
    }

    // Fetch theme details
    const themeResponse = await api.getTheme(slug.value);
    if (themeResponse?.success) {
      const { indicators: themeIndicators } = themeResponse.data;
      indicators.value = themeIndicators || [];

      // Load first indicator by default
      if (themeIndicators && themeIndicators.length > 0) {
        const firstIndicator = themeIndicators[0];
        selectedIndicatorCode.value = firstIndicator.code;
        currentIndicatorName.value = getIndicatorName(firstIndicator);

        await loadIndicatorData(firstIndicator.code);
      } else {
        // Pas d'indicateurs, mais on garde la carte visible
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
  const indicator = indicators.value.find(
    (i) => i.code === selectedIndicatorCode.value,
  );
  if (indicator) {
    currentIndicatorName.value = getIndicatorName(indicator);
    await loadIndicatorData(indicator.code);
    
    // Recharger les données de la région si une région est sélectionnée
    if (selectedRegionData.value) {
      await loadRegionData(selectedRegionData.value.code);
    }
  }
};

const onRegionClick = async (regionProps: { code: string; name?: string }) => {
  await loadRegionData(regionProps.code);
};

const closeRegionPopup = () => {
  selectedRegionData.value = null;
  subRegions.value = [];
  regionChartData.value = [];
};

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
  border-top: 4px solid #1a9553;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.theme-header__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1d26;
  margin: 0;
  flex: 1;
}

.indicator-selector {
  padding: 0.75rem 1rem;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  min-width: 250px;
  outline: none;
  transition: border-color 0.2s;
}

.indicator-selector:focus {
  border-color: #1a9553;
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
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
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
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1d26;
  margin: 0 0 0.25rem 0;
}

.region-popup__subtitle {
  font-size: 0.875rem;
  color: #5a5f72;
  margin: 0;
}

.region-popup__close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #5a5f72;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.region-popup__close:hover {
  color: #1a1d26;
}

.region-popup__content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.region-value-card {
  background: linear-gradient(135deg, #1a9553 0%, #157a42 100%);
  color: white;
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 1.5rem;
}

.region-value-label {
  display: block;
  font-size: 0.875rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.region-value {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
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
  color: #1a9553;
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
  padding: 0.75rem;
  border-radius: 6px;
  background: #f5f5f5;
}

.comparison-bar.is-selected {
  background: #e8f5e9;
  border: 2px solid #1a9553;
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
  font-size: 0.875rem;
  font-weight: 700;
  color: #1a9553;
}

.comparison-bar__track {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.comparison-bar__fill {
  height: 100%;
  background: #1a9553;
  transition: width 0.3s ease;
}

.view-details-btn {
  width: 100%;
  padding: 1rem;
  background: #1a9553;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.view-details-btn:hover {
  background: #157a42;
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