import { defineStore } from 'pinia';
import type { AdminLevel, GeoJSONData, MapDataEntry, ColorScale, FetchMapDataOptions, MapState } from '~/types/map';

export const useMapStore = defineStore('map', {
  state: (): MapState => ({
    currentLevel: 'region',
    selectedRegion: null,
    currentIndicator: null,
    geoData: {
      region: null,
      district: null,
      commune: null,
    },
    mapData: [],
    colorScale: {
      min: '#FEE5D9',
      max: '#A50F15',
    },
    loading: false,
  }),

  getters: {
    getRegionValue: (state) => (regionCode: string): number | null => {
      const entry = state.mapData.find(d => d.regionCode === regionCode);
      return entry?.value ?? null;
    },
  },

  actions: {
    setLevel(level: AdminLevel) {
      this.currentLevel = level;
    },

    setSelectedRegion(region: string | null) {
      this.selectedRegion = region;
    },

    async fetchGeoJSON(level: AdminLevel = 'region'): Promise<GeoJSONData | null> {
      if (this.geoData[level]) return this.geoData[level];
      
      try {
        const config = useRuntimeConfig();
        const { data } = await useFetch<{ success: boolean; data: GeoJSONData }>(
          `${config.public.apiBase}/geo/${level}`
        );
        
        if (data.value?.success) {
          this.geoData[level] = data.value.data;
          return data.value.data;
        }
      } catch (error) {
        console.error('Error fetching GeoJSON:', error);
      }
      return null;
    },

    async fetchMapData(indicatorCode: string, options: FetchMapDataOptions = {}) {
      this.loading = true;
      try {
        const config = useRuntimeConfig();
        const params = new URLSearchParams({
          level: options.level || this.currentLevel,
          ...(options.disaggregation ? { disaggregation: JSON.stringify(options.disaggregation) } : {}),
        });

        const { data } = await useFetch<{
          success: boolean;
          data: {
            mapData: MapDataEntry[];
            visualization?: {
              colorScale?: ColorScale;
            };
          };
        }>(
          `${config.public.apiBase}/indicators/map-data/${indicatorCode}?${params}`
        );

        if (data.value?.success) {
          this.mapData = data.value.data.mapData;
          this.currentIndicator = indicatorCode;
          if (data.value.data.visualization?.colorScale) {
            this.colorScale = data.value.data.visualization.colorScale;
          }
        }
      } catch (error) {
        console.error('Error fetching map data:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});