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

      <div v-if="levels.length > 1" class="map-level-selector">
        <span class="map-level-selector__label">
          {{ $t('map.country') }}
        </span>
        <button
          v-for="lvl in levels"
          :key="lvl"
          :class="['map-level-selector__btn', { 'map-level-selector__btn--active': currentLevel === lvl }]"
          @click="setLevel(lvl)"
        >
          ▶▶ {{ $t(`map.${lvl}s`) }}
        </button>
      </div>
    </div>

    <!-- Map Toolbar -->
    <div class="map-toolbar">
      <button class="map-toolbar__btn" :title="$t('map.zoomIn')" @click="zoomIn">
        <span class="mdi mdi-magnify-plus-outline"></span>
      </button>
      <button class="map-toolbar__btn" :title="$t('map.zoomOut')" @click="zoomOut">
        <span class="mdi mdi-magnify-minus-outline"></span>
      </button>
      <button class="map-toolbar__btn" :title="$t('map.reset')" @click="resetView">
        <span class="mdi mdi-refresh"></span>
      </button>
      <button class="map-toolbar__btn" :title="$t('common.print')" @click="printMap">
        <span class="mdi mdi-printer"></span>
      </button>
      <button
        class="map-toolbar__btn"
        :title="$t('common.download')"
        :disabled="!hasValues"
        @click="downloadCsv"
      >
        <span class="mdi mdi-download"></span>
      </button>
    </div>

    <!-- Leaflet Map -->
    <div ref="mapRef" style="width: 100%; height: 100%;"></div>

    <!-- Legend -->
    <div v-if="hasValues" class="map-legend">
      <div class="map-legend__title">{{ legendTitle }}</div>
      <div class="map-legend__gradient">
        <div class="map-legend__gradient-bar" :style="{ background: legendGradient }"></div>
      </div>
      <div class="map-legend__gradient">
        <div class="map-legend__gradient-labels">
          <span>{{ formatValue(scaleMin) }}</span>
          <span>{{ formatValue(scaleMid) }}</span>
          <span>{{ formatValue(scaleMax) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColorScale, GeoJSONData, MapDataEntry } from '~/types/api';

// Props
interface Props {
  geojson?: GeoJSONData | null;
  mapData?: MapDataEntry[];
  indicatorName?: string;
  unit?: string;
  /** Palette fournie par l'API (visualization.colorScale). */
  colorScale?: ColorScale | null;
  /** Niveaux administratifs reellement disponibles. */
  levels?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  geojson: null,
  mapData: () => [],
  indicatorName: '',
  unit: 'number',
  colorScale: null,
  levels: () => ['region'],
});

// Emits
const emit = defineEmits<{
  'region-click': [properties: any];
  'level-change': [level: string];
}>();

// Composables
const { locale, t } = useI18n();

// Refs
const mapRef = ref<HTMLElement | null>(null);
const map = ref<any>(null);
const geoLayer = ref<any>(null);
const labelLayer = ref<any>(null);
const currentLevel = ref<string>(props.levels[0] ?? 'region');

const scaleMin = ref(0);
const scaleMax = ref(0);
const scaleMid = computed(() => (scaleMin.value + scaleMax.value) / 2);

const numericValues = computed(() =>
  props.mapData
    .map((d) => d.value)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v)),
);

const hasValues = computed(() => numericValues.value.length > 0);

const legendTitle = computed(() => props.indicatorName || t('map.population'));

// --- Palette ---------------------------------------------------------------
// La rampe etait codee en dur dans le composant ET dans le CSS de la legende,
// alors que l'API fournit visualization.colorScale par indicateur
// (cf. AUDIT F-17). On interpole desormais entre les deux bornes recues.
const DEFAULT_SCALE: ColorScale = { min: '#FEE5D9', max: '#A50F15' };
const STEPS = 7;

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
};

const isHex = (value?: string | null): value is string =>
  typeof value === 'string' && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);

const palette = computed<string[]>(() => {
  const from = isHex(props.colorScale?.min) ? props.colorScale!.min : DEFAULT_SCALE.min;
  const to = isHex(props.colorScale?.max) ? props.colorScale!.max : DEFAULT_SCALE.max;
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);

  return Array.from({ length: STEPS }, (_, i) => {
    const ratio = i / (STEPS - 1);
    const mix = (a: number, b: number) => Math.round(a + (b - a) * ratio);
    return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
  });
});

const legendGradient = computed(() => `linear-gradient(to right, ${palette.value.join(', ')})`);

const NO_DATA_COLOR = '#E0E0E0';

const getColor = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return NO_DATA_COLOR;

  const colors = palette.value;
  const min = scaleMin.value;
  const max = scaleMax.value;

  if (max === min) return colors[Math.floor(colors.length / 2)];

  const ratio = (value - min) / (max - min);
  const index = Math.min(Math.floor(ratio * colors.length), colors.length - 1);
  return colors[index];
};

// --- Formatage -------------------------------------------------------------
// L'unite recue en prop n'etait pas utilisee : un pourcentage s'affichait
// comme un effectif.
const { formatCompact } = useValueFormat();

const formatValue = (num: number | null | undefined): string =>
  formatCompact(num, props.unit as any);

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });

const getRegionName = (properties: Record<string, any>): string => {
  const lang = String(locale.value);
  return properties[`name_${lang}`] || properties.name_fr || properties.code || t('common.unknown');
};

const getRegionValue = (code: string): number | null => {
  const entry = props.mapData.find((d) => d.regionCode === code);
  return entry?.value ?? null;
};

const styleFeature = (feature: any) => ({
  fillColor: getColor(getRegionValue(feature.properties?.code)),
  weight: 2,
  opacity: 1,
  color: '#FFFFFF',
  fillOpacity: 0.85,
});

const highlightFeature = (e: any) => {
  const layer = e.target;
  layer.setStyle({ weight: 3, color: '#333', fillOpacity: 0.95 });
  layer.bringToFront();
};

const resetHighlight = (e: any) => {
  if (geoLayer.value) geoLayer.value.resetStyle(e.target);
};

const onFeatureClick = (e: any) => {
  const properties = e.target.feature?.properties;
  if (properties) emit('region-click', properties);
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

    // Le conteneur est souvent dimensionne apres le montage : sans cela
    // Leaflet garde une taille nulle et n'affiche qu'une tuile partielle.
    await nextTick();
    map.value.invalidateSize();

    updateGeoLayer();
  } catch (error) {
    console.error('Error initializing map:', error);
  }
};

const updateGeoLayer = async () => {
  // La couche n'etait ajoutee que si mapData contenait des valeurs : sans
  // indicateur, l'utilisateur ne voyait que le fond satellite, sans contour
  // de region (cf. AUDIT F-03). Le GeoJSON suffit desormais.
  if (!map.value || !props.geojson?.features?.length) return;

  const L = await import('leaflet');

  if (geoLayer.value) {
    map.value.removeLayer(geoLayer.value);
    geoLayer.value = null;
  }
  if (labelLayer.value) {
    map.value.removeLayer(labelLayer.value);
    labelLayer.value = null;
  }

  const values = numericValues.value;
  if (values.length) {
    scaleMin.value = Math.min(...values);
    scaleMax.value = Math.max(...values);
  } else {
    scaleMin.value = 0;
    scaleMax.value = 0;
  }

  try {
    labelLayer.value = L.layerGroup().addTo(map.value);

    geoLayer.value = L.geoJSON(props.geojson as any, {
      style: styleFeature,
      onEachFeature: (feature: any, layer: any) => {
        const name = escapeHtml(getRegionName(feature.properties ?? {}));
        const value = getRegionValue(feature.properties?.code);
        const formatted = escapeHtml(formatValue(value));

        // Une seule infobulle par couche : le second bindTooltip ecrasait le
        // premier, donc l'infobulle de survol ne s'affichait jamais
        // (cf. AUDIT F-02). L'etiquette permanente passe par un marqueur.
        layer.bindTooltip(
          `<div class="region-tooltip">
            <div class="region-tooltip__name">${name}</div>
            <div class="region-tooltip__value"><strong>${formatted}</strong></div>
          </div>`,
          { sticky: true, className: 'region-tooltip-wrapper' },
        );

        if (value !== null) {
          const center = layer.getBounds?.()?.getCenter?.();
          if (center) {
            L.marker(center, {
              interactive: false,
              keyboard: false,
              icon: L.divIcon({
                className: 'region-label',
                html: `<div class="region-label__inner">${name}<br/><span class="region-label__value">${formatted}</span></div>`,
                iconSize: [120, 36],
                iconAnchor: [60, 18],
              }),
            }).addTo(labelLayer.value);
          }
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

const printMap = () => {
  if (typeof window !== 'undefined') window.print();
};

const downloadCsv = () => {
  if (typeof document === 'undefined' || !props.mapData.length) return;

  const lang = String(locale.value);
  const header = ['code', 'region', legendTitle.value || 'valeur', 'unite'];
  const quote = (cell: string | number | null) => `"${String(cell ?? '').replace(/"/g, '""')}"`;

  const rows = props.mapData.map((entry) => {
    const name = entry.regionName as any;
    const label = typeof name === 'string' ? name : name?.[lang] ?? name?.fr ?? entry.regionCode;
    return [entry.regionCode, label, entry.value ?? '', props.unit].map(quote).join(';');
  });

  // BOM : sans lui Excel lit le CSV en ANSI et casse les accents.
  const csv = `﻿${[header.map(quote).join(';'), ...rows].join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rgph2024-${(props.indicatorName || 'donnees').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const setLevel = (level: string) => {
  currentLevel.value = level;
  emit('level-change', level);
};

// On observe la reference du GeoJSON (et non son contenu en profondeur :
// parcourir tous les polygones a chaque changement etait inutilement couteux)
// et la liste des valeurs.
watch(
  () => [props.geojson, props.mapData, props.colorScale] as const,
  () => updateGeoLayer(),
);

// Les etiquettes et infobulles sont ecrites dans le DOM Leaflet au moment ou
// la couche est construite : sans ce watch, un changement de langue laissait
// la carte dans la langue precedente (cf. AUDIT F-24).
watch(locale, () => updateGeoLayer());

onMounted(() => {
  nextTick(() => initMap());
});

// La carte n'etait jamais detruite : chaque navigation laissait une instance
// Leaflet et ses ecouteurs en memoire (cf. AUDIT F-16).
onUnmounted(() => {
  if (map.value) {
    map.value.remove();
    map.value = null;
  }
  geoLayer.value = null;
  labelLayer.value = null;
});
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600px;
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

:deep(.region-label__inner) {
  text-align: center;
  font-weight: 600;
  font-size: 12px;
  color: #333;
  text-shadow: 1px 1px 2px white;
  pointer-events: none;
}

:deep(.region-label__value) {
  font-size: 14px;
  color: #A50F15;
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

[dir="rtl"] .map-controls {
  left: auto;
  right: 20px;
}

.rgph-badge {
  margin-bottom: 1rem;
}

.rgph-badge__year {
  font-size: 1.5rem;
  font-weight: 700;
  color: #00185F;
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

[dir="rtl"] .map-level-selector__btn {
  text-align: right;
}

.map-level-selector__btn:hover {
  background: #f5f5f5;
}

.map-level-selector__btn--active {
  background: #00185F;
  color: white;
  border-color: #00185F;
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

[dir="rtl"] .map-toolbar {
  right: auto;
  left: 20px;
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

.map-toolbar__btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.map-toolbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

[dir="rtl"] .map-legend {
  right: auto;
  left: 20px;
}

.map-legend__title {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #333;
}

.map-legend__gradient-bar {
  height: 20px;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.map-legend__gradient-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #666;
}

@media print {
  .map-controls,
  .map-toolbar {
    display: none;
  }
}
</style>
