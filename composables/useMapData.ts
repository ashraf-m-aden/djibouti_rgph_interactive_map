// composables/useMapData.ts
import type { GeoJSONData, MapDataEntry } from '~/types/api';

export const useMapData = () => {
    const geojson = ref<GeoJSONData | null>(null);
    const mapData = ref<MapDataEntry[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const loadGeoData = async (level: 'region' | 'district' | 'commune' = 'region') => {
        loading.value = true;
        error.value = null;

        try {
            const api = useApi();
            const response = await api.getGeoJSON(level);

            if (response?.success) {
                geojson.value = response.data;
            }
        } catch (err) {
            console.error('Error loading GeoJSON:', err);
            error.value = 'Failed to load geographic data';

            // Fallback
            try {
                const staticData = await import('~/assets/data/djibouti-regions.json');
                geojson.value = (staticData.default || staticData) as GeoJSONData;

            } catch (fallbackError) {
                console.error('Failed to load fallback GeoJSON:', fallbackError);
            }
        } finally {
            loading.value = false;
        }
    };

    const loadMapData = async (indicatorCode: string) => {
        loading.value = true;
        error.value = null;

        try {
            const api = useApi();
            const response = await api.getMapData(indicatorCode);

            if (response?.success) {
                mapData.value = response.data.mapData;
            }
        } catch (err) {
            console.error('Error loading map data:', err);
            error.value = 'Failed to load map data';
        } finally {
            loading.value = false;
        }
    };

    return {
        geojson,
        mapData,
        loading,
        error,
        loadGeoData,
        loadMapData,
    };
};