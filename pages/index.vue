<template>
  <div class="index-page">
    <DjiboutiMap
      v-if="geojson"
      :geojson="geojson"
      :map-data="mapData"
      :indicator-name="indicatorName"
      :unit="unit"
      :color-scale="colorScale"
      @region-click="onRegionClick"
    />

    <div v-else class="loading-container">
      <p v-if="loading">{{ $t('map.loading') }}</p>
      <template v-else>
        <p>{{ $t('map.noGeo') }}</p>
        <button class="retry-btn" @click="loadData">{{ $t('common.retry') }}</button>
      </template>
    </div>

    <!-- Le fond de carte est disponible mais l'indicateur n'a aucune valeur :
         on le dit, au lieu d'afficher une carte uniformement grise
         (cf. AUDIT D-01). -->
    <div v-if="geojson && !loading && !hasValues" class="no-data-banner">
      <span class="mdi mdi-alert-circle-outline"></span>
      {{ $t('errors.indicatorNoData') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import DjiboutiMap from '~/components/map/DjiboutiMap.vue';
import type { ColorScale, GeoJSONData, MapDataEntry, Unit } from '~/types/api';

const router = useRouter();
const { t } = useI18n();

/**
 * Indicateur de la carte d'accueil. "population_totale" n'existe qu'au niveau
 * national : la carte renvoyait six regions a null, donc un fond gris sans
 * etiquette (cf. AUDIT D-01). "pop_15plus" couvre les six regions.
 * A remplacer par la population totale par region des que le Tome 1 sera
 * integre aux seeds.
 */
const HOME_INDICATOR = 'pop_15plus';

const geojson = ref<GeoJSONData | null>(null);
const mapData = ref<MapDataEntry[]>([]);
const colorScale = ref<ColorScale | null>(null);
const unit = ref<Unit>('number');
// Recalcule a chaque changement de langue (cf. AUDIT F-24).
const indicatorName = computed(() => t('map.population'));
const loading = ref(true);

const hasValues = computed(() =>
  mapData.value.some((entry) => typeof entry.value === 'number' && Number.isFinite(entry.value)),
);

const loadGeoData = async () => {
  const api = useApi();

  try {
    const response = await api.getGeoJSON('region');
    if (response?.success && response.data?.features?.length) {
      geojson.value = response.data;
      return;
    }
  } catch (error) {
    console.error('Error loading GeoJSON from API:', error);
  }

  // Repli hors ligne legitime : le trace des regions, pas des valeurs.
  try {
    const staticData = await import('~/assets/data/djibouti-regions.json');
    const loaded = ((staticData as any).default ?? staticData) as GeoJSONData;
    if (loaded?.features?.length) geojson.value = loaded;
  } catch (fallbackError) {
    console.error('Failed to load fallback GeoJSON:', fallbackError);
  }
};

const loadMapData = async () => {
  const api = useApi();

  try {
    const response = await api.getMapData(HOME_INDICATOR, { level: 'region' });
    if (response?.success && response.data) {
      mapData.value = response.data.mapData ?? [];
      colorScale.value = response.data.visualization?.colorScale ?? null;
      unit.value = (response.data.mapData?.find((e) => e.unit)?.unit as Unit) ?? 'number';
      return;
    }
  } catch (error) {
    // Les valeurs de secours inventees ont ete supprimees : une panne d'API
    // ne doit pas ressembler a des chiffres officiels (cf. AUDIT F-23).
    console.error('Error loading map data:', error);
  }

  mapData.value = [];
  colorScale.value = null;
};

const onRegionClick = (regionProps: { code?: string }) => {
  if (regionProps?.code) router.push(`/regions/${regionProps.code}`);
};

const loadData = async () => {
  loading.value = true;
  try {
    await Promise.all([loadGeoData(), loadMapData()]);
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);
</script>

<style scoped>
.index-page {
  height: calc(100vh - 60px);
  width: 100%;
  overflow: hidden;
  position: relative;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.2rem;
  color: #666;
  gap: 1rem;
}

.retry-btn {
  padding: 0.5rem 1rem;
  cursor: pointer;
  background: #00185F;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
}

.retry-btn:hover {
  background: #000D33;
}

.no-data-banner {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  color: #8a5300;
  border-left: 4px solid #ff9800;
  padding: 0.75rem 1.25rem;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 0.9rem;
  max-width: 90%;
}

[dir="rtl"] .no-data-banner {
  border-left: none;
  border-right: 4px solid #ff9800;
}

.no-data-banner .mdi {
  font-size: 1.25rem;
  color: #ff9800;
}
</style>
