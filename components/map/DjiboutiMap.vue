<template>
  <div class="map-container">
    <!-- Map Controls -->
    <div class="map-controls">
      <div class="rgph-badge">
        <span class="rgph-badge__year">2024</span>
        <span class="rgph-badge__text">
          {{ $t('app.fullTitle') }}
        </span>
      </div>

      <div class="map-level-selector">
        <span class="map-level-selector__label">
          {{ $t('map.country') }}
        </span>
        <button
          :class="['map-level-selector__btn', { 'map-level-selector__btn--active': currentLevel === 'region' }]"
          @click="setLevel('region')"
        >
          ▶▶ {{ $t('map.regions') }}
        </button>
        <button
          :class="['map-level-selector__btn', { 'map-level-selector__btn--active': currentLevel === 'district' }]"
          @click="setLevel('district')"
        >
          ▶▶ {{ $t('map.districts') }}
        </button>
      </div>
    </div>

    <!-- Map Toolbar -->
    <div class="map-toolbar">
      <button class="map-toolbar__btn" title="Zoom in" @click="zoomIn">
        <span class="mdi mdi-magnify-plus-outline"></span>
      </button>
      <button class="map-toolbar__btn" title="Zoom out" @click="zoomOut">
        <span class="mdi mdi-magnify-minus-outline"></span>
      </button>
      <button class="map-toolbar__btn" title="Reset" @click="resetView">
        <span class="mdi mdi-refresh"></span>
      </button>
      <button class="map-toolbar__btn" :title="$t('common.print')">
        <span class="mdi mdi-printer"></span>
      </button>
      <button class="map-toolbar__btn" :title="$t('common.download')">
        <span class="mdi mdi-download"></span>
      </button>
    </div>

    <!-- Leaflet Map -->
    <div ref="mapRef" style="width: 100%; height: 100%;"></div>

    <!-- Legend -->
    <div v-if="legendTitle" class="map-legend">
      <div class="map-legend__title">{{ legendTitle }}</div>
      <div class="map-legend__gradient">
        <div class="map-legend__gradient-bar"></div>
      </div>
      <div class="map-legend__gradient">
        <div class="map-legend__gradient-labels">
          <span>{{ formatNumber(scaleMin) }}</span>
          <span>{{ formatNumber(scaleMid) }}</span>
          <span>{{ formatNumber(scaleMax) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GeoJSONData, MapDataEntry } from '~/types/api';

// Props
interface Props {
  geojson?: GeoJSONData | null;
  mapData?: MapDataEntry[];
  indicatorName?: string;
  unit?: string;
}

const props = withDefaults(defineProps<Props>(), {
  geojson: null,
  mapData: () => [],
  indicatorName: '',
  unit: 'number',
});

// Emits
const emit = defineEmits<{
  'region-click': [properties: any];
  'level-change': [level: string];
}>();

// Composables
const { locale, t } = useI18n();
const mapStore = useMapStore();

// Refs
const mapRef = ref<HTMLElement | null>(null);
const map = ref<any>(null);
const geoLayer = ref<any>(null);
const currentLevel = ref<'region' | 'district'>('region');

const scaleMin = ref(0);
const scaleMax = ref(0);
const scaleMid = computed(() => Math.round((scaleMin.value + scaleMax.value) / 2));

const legendTitle = computed(() => {
  return props.indicatorName || t('map.population');
});

// Color interpolation for choropleth
const getColor = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '#E0E0E0';

  const colors = ['#FEE5D9', '#FCBBA1', '#FC9272', '#FB6A4A', '#EF3B2C', '#CB181D', '#A50F15'];
  const min = scaleMin.value;
  const max = scaleMax.value;

  if (max === min) return colors[3];

  const ratio = (value - min) / (max - min);
  const index = Math.min(Math.floor(ratio * (colors.length - 1)), colors.length - 1);
  return colors[index];
};

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '—';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
  return num.toLocaleString();
};

const getRegionName = (properties: Record<string, any>): string => {
  const lang = String(locale.value);
  return properties[`name_${lang}`] || properties.name_fr || properties.code || 'Unknown';
};

const getRegionValue = (code: string): number | null => {
  const entry = props.mapData.find(d => d.regionCode === code);
  return entry?.value ?? null;
};

const styleFeature = (feature: any) => {
  const value = getRegionValue(feature.properties.code);
  return {
    fillColor: getColor(value),
    weight: 2,
    opacity: 1,
    color: '#FFFFFF',
    fillOpacity: 0.85,
  };
};

const highlightFeature = (e: any) => {
  const layer = e.target;
  layer.setStyle({
    weight: 3,
    color: '#333',
    fillOpacity: 0.95,
  });
  layer.bringToFront();
};

const resetHighlight = (e: any) => {
  if (geoLayer.value) {
    geoLayer.value.resetStyle(e.target);
  }
};

const onFeatureClick = (e: any) => {
  const properties = e.target.feature?.properties;
  if (properties) {
    emit('region-click', properties);
  }
};

const initMap = async () => {
  if (!mapRef.value || map.value) return;

  const L = await import('leaflet');

  try {
    map.value = L.map(mapRef.value, {
      center: [11.55, 42.95],
      zoom: 8,
      minZoom: 7,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Images © Esri',
    }).addTo(map.value);

    // Wait a bit for the map to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    updateGeoLayer();
  } catch (error) {
    console.error('Error initializing map:', error);
  }
};

const updateGeoLayer = async () => {
  if (!map.value || !props.geojson || !props.mapData || props.mapData.length === 0) {
    return;
  }

  const L = await import('leaflet');

  // Remove existing layer
  if (geoLayer.value) {
    map.value.removeLayer(geoLayer.value);
  }

  // Calculate scale
  const values = props.mapData
    .map(d => d.value)
    .filter((v): v is number => v !== null && v !== undefined);
    
  if (values.length) {
    scaleMin.value = Math.min(...values);
    scaleMax.value = Math.max(...values);
  } else {
    scaleMin.value = 0;
    scaleMax.value = 100;
  }

  // Add GeoJSON layer
  try {
    geoLayer.value = L.geoJSON(props.geojson as any, {
      style: styleFeature,
      onEachFeature: (feature: any, layer: any) => {
        const name = getRegionName(feature.properties);
        const value = getRegionValue(feature.properties.code);
        const formattedValue = formatNumber(value);

        layer.bindTooltip(
          `<div class="region-tooltip">
            <div class="region-tooltip__name">${name}</div>
            <div class="region-tooltip__value"><strong>${formattedValue}</strong></div>
          </div>`,
          { sticky: true, className: 'region-tooltip-wrapper' }
        );

        // Permanent label
        if (value !== null) {
          layer.bindTooltip(
            `<div style="text-align:center;font-weight:600;font-size:12px;color:#333;text-shadow:1px 1px 2px white;">
              ${name}<br/><span style="font-size:14px;color:#A50F15;">${formattedValue}</span>
            </div>`,
            { permanent: true, direction: 'center', className: 'region-label' }
          );
        }

        layer.on({
          mouseover: highlightFeature,
          mouseout: resetHighlight,
          click: onFeatureClick,
        });
      },
    }).addTo(map.value);
  } catch (error) {
    console.error('Error adding GeoJSON layer:', error);
  }
};

const zoomIn = () => map.value?.zoomIn();
const zoomOut = () => map.value?.zoomOut();
const resetView = () => map.value?.setView([11.55, 42.95], 8);

const setLevel = (level: 'region' | 'district') => {
  currentLevel.value = level;
  emit('level-change', level);
};

// Watch for data changes
watch(() => [props.geojson, props.mapData], ([newGeoJson, newMapData]) => {
  if (newGeoJson && newMapData && newMapData.length > 0) {
    updateGeoLayer();
  }
}, { deep: true });

onMounted(() => {
  nextTick(() => {
    initMap();
  });
});
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600px; /* AJOUTEZ CETTE LIGNE */
  background: #f5f5f5;
}


.region-tooltip-wrapper {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.region-label) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.map-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.rgph-badge {
  margin-bottom: 1rem;
}

.rgph-badge__year {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1A9553;
  display: block;
}

.rgph-badge__text {
  font-size: 0.875rem;
  color: #666;
}

.map-level-selector__label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.map-level-selector__btn {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  margin-bottom: 0.5rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.map-level-selector__btn:hover {
  background: #f5f5f5;
}

.map-level-selector__btn--active {
  background: #1A9553;
  color: white;
  border-color: #1A9553;
}

.map-toolbar {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: white;
  padding: 0.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.map-toolbar__btn {
  width: 40px;
  height: 40px;
  border: none;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.map-toolbar__btn:hover {
  background: #f5f5f5;
}

.map-toolbar__btn .mdi {
  font-size: 20px;
  color: #333;
}

.map-legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 200px;
}

.map-legend__title {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #333;
}

.map-legend__gradient-bar {
  height: 20px;
  background: linear-gradient(to right, #FEE5D9, #FCBBA1, #FC9272, #FB6A4A, #EF3B2C, #CB181D, #A50F15);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.map-legend__gradient-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #666;
}
</style>