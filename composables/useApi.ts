/**
 * Composable for RGPH API calls
 */
import type { 
  ApiResponse, 
  Region, 
  Theme, 
  Indicator, 
  MapDataEntry, 
  ChartDataEntry, 
  GeoJSONData, 
  SearchResult,
  RegionParams,
  IndicatorParams,
  MapDataParams,
  AdminLevel,
  Language
} from '~/types/api';

export const useApi = () => {
  const config = useRuntimeConfig();

  // Créer une instance personnalisée de $fetch
  const customFetch = $fetch.create({
    baseURL: config.public.apiBase,
    headers: {
      'Content-Type': 'application/json',
    },
    // Optionnel: credentials si besoin
    // credentials: 'include',
  });

  const fetchData = async <T = any>(
    endpoint: string, 
    options: any = {}
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await customFetch<ApiResponse<T>>(endpoint, options);
      return response;
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  };

  // Regions
  const getRegions = async (params: RegionParams = {}) => {
    return await customFetch<ApiResponse<Region[]>>('/regions', {
      method: 'GET',
      params,
    });
  };

  const getRegion = async (code: string) => {
    return await customFetch<ApiResponse<Region>>(`/regions/${code}`, {
      method: 'GET',
    });
  };

  const getRegionChildren = async (code: string) => {
    return await customFetch<ApiResponse<Region[]>>(`/regions/${code}/children`, {
      method: 'GET',
    });
  };

  const getRegionIndicators = async (code: string, params: IndicatorParams = {}) => {
    return await customFetch<ApiResponse<Indicator[]>>(`/regions/${code}/indicators`, {
      method: 'GET',
      params,
    });
  };

  // Themes
  const getThemes = async () => {
    return await customFetch<ApiResponse<Theme[]>>('/themes', {
      method: 'GET',
    });
  };

  const getTheme = async (slug: string) => {
    return await customFetch<ApiResponse<Theme>>(`/themes/${slug}`, {
      method: 'GET',
    });
  };

  const getThemeKeyFigures = async (slug: string) => {
    return await customFetch<ApiResponse<any[]>>(`/themes/${slug}/key-figures`, {
      method: 'GET',
    });
  };

  // Indicators
  const getIndicators = async (params: IndicatorParams = {}) => {
    return await customFetch<ApiResponse<Indicator[]>>('/indicators', {
      method: 'GET',
      params,
    });
  };

  const getIndicatorsByTheme = async (themeSlug: string, params: IndicatorParams = {}) => {
    return await customFetch<ApiResponse<Indicator[]>>(`/indicators/by-theme/${themeSlug}`, {
      method: 'GET',
      params,
    });
  };

  const getMapData = async (indicatorCode: string, params: MapDataParams = {}) => {
    return await customFetch<ApiResponse<{ mapData: MapDataEntry[]; visualization?: any }>>(
      `/indicators/map-data/${indicatorCode}`, 
      {
        method: 'GET',
        params,
      }
    );
  };

  const getChartData = async (indicatorCode: string, params: Record<string, any> = {}) => {
    return await customFetch<ApiResponse<ChartDataEntry[]>>(
      `/indicators/chart-data/${indicatorCode}`, 
      {
        method: 'GET',
        params,
      }
    );
  };

  const compareIndicator = async (indicator: string, regions: string[]) => {
    return await customFetch<ApiResponse<any>>('/indicators/compare', {
      method: 'GET',
      params: { 
        indicator, 
        regions: regions.join(',') 
      },
    });
  };

  // Geo
  const getGeoJSON = async (level: AdminLevel = 'region') => {
    return await customFetch<ApiResponse<GeoJSONData>>(`/geo/${level}`, {
      method: 'GET',
    });
  };

  // Search
  const search = async (query: string, lang: Language = 'fr') => {
    return await customFetch<ApiResponse<SearchResult[]>>('/search', {
      method: 'GET',
      params: { q: query, lang },
    });
  };

  return {
    customFetch, // Exposer customFetch pour des appels personnalisés
    fetchData,
    getRegions,
    getRegion,
    getRegionChildren,
    getRegionIndicators,
    getThemes,
    getTheme,
    getThemeKeyFigures,
    getIndicators,
    getIndicatorsByTheme,
    getMapData,
    getChartData,
    compareIndicator,
    getGeoJSON,
    search,
  };
};