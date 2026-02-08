<template>
  <div class="index-page">
    <!-- Debug info (optionnel - vous pouvez le retirer) -->

    <DjiboutiMap
      v-if="geojson && mapData.length"
      :geojson="geojson"
      :map-data="mapData"
      :indicator-name="$t('map.population')"
      unit="number"
      @region-click="onRegionClick"
      @level-change="onLevelChange"
    />

    <div v-else class="loading-container">
      <p v-if="loading">
        {{ $t("common.loading") || "Chargement de la carte..." }}
      </p>
      <p v-else>
        Erreur de chargement des données
        <button @click="reload" class="retry-btn">Réessayer</button>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fallbackMapData } from "~/assets/data/fallBackMap";
import DjiboutiMap from "~/components/map/DjiboutiMap.vue";
import type { GeoJSONData, MapDataEntry } from "~/types/api";

const router = useRouter();

interface RegionProps {
  code: string;
  name: string;
  [key: string]: any;
}

const geojson = ref<GeoJSONData | null>(null);
const mapData = ref<MapDataEntry[]>([]);
const loading = ref(true);
const showDebug = ref(false); // Changez à true pour voir le debug

// Fallback data (gardez vos données existantes)

const loadGeoData = async () => {
  try {
    const api = useApi();
    const response = await api.getGeoJSON("region");

    if (
      response?.success &&
      response.data &&
      response.data.features?.length > 0
    ) {
      geojson.value = response.data;
      return true;
    }
  } catch (error) {
    console.error("Error loading GeoJSON from API:", error);
  }

  try {
    const staticData = await import("~/assets/data/djibouti-regions.json");
    const loadedData = (staticData.default || staticData) as GeoJSONData;

    if (loadedData && loadedData.features?.length > 0) {
      geojson.value = loadedData;
      return true;
    }
  } catch (fallbackError) {
    console.error("Failed to load fallback GeoJSON:", fallbackError);
  }

  return false;
};

const loadMapData = async () => {
  try {
    const api = useApi();
    const response = await api.getMapData("population_totale");

    if (
      response?.success &&
      response.data?.mapData &&
      response.data.mapData.length > 0
    ) {
      mapData.value = response.data.mapData;
      return true;
    }
  } catch (error) {
    console.error("Error loading map data:", error);
  }

  mapData.value = fallbackMapData;
  return true;
};

const onRegionClick = (regionProps: RegionProps) => {
  router.push(`/regions/${regionProps.code}`);
};

const onLevelChange = (level: string) => {
  console.log("Level changed:", level);
};

const reload = () => {
  loading.value = true;
  geojson.value = null;
  mapData.value = [];
  loadData();
};

const loadData = async () => {
  loading.value = true;
  try {
    await Promise.all([loadGeoData(), loadMapData()]);
  } catch (error) {
    console.error("Critical error loading data:", error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.index-page {
  height: calc(100vh - 60px);
  width: 100%;
  overflow: hidden;
  position: relative;
}

.debug-panel {
  position: fixed;
  top: 70px;
  right: 20px;
  background: white;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  z-index: 9999;
  max-width: 300px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.debug-panel h4 {
  margin: 0 0 0.5rem;
  font-size: 14px;
}

.debug-panel p {
  margin: 0.25rem 0;
}

.debug-panel button {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  border: 1px solid #ccc;
  background: white;
  border-radius: 3px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.2rem;
  color: #666;
}

.retry-btn {
  margin-left: 1rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  background: #1a9553;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
}

.retry-btn:hover {
  background: #157a42;
}
</style>
