/**
 * Composable for RGPH API calls
 *
 * Les signatures decrivent desormais ce que l'API renvoie reellement :
 * getTheme rend { theme, indicators, subThemes }, getChartData rend
 * { labels, datasets } et search rend { themes, regions, indicators }
 * (cf. AUDIT F-13).
 */
import type {
  AdminLevel,
  ApiResponse,
  ChartData,
  Indicator,
  IndicatorParams,
  KeyFigure,
  Language,
  MapDataParams,
  MapDataResponse,
  Region,
  RegionParams,
  SearchResults,
  Theme,
  ThemeDetail,
  GeoJSONData,
} from '~/types/api';

export const useApi = () => {
  const config = useRuntimeConfig();

  // Instance $fetch partagee. Pas d'en-tete Content-Type sur des GET : il
  // declenchait une requete prealable OPTIONS a chaque appel en cross-origin
  // sans rien apporter (aucun corps n'est envoye).
  const customFetch = $fetch.create({
    baseURL: config.public.apiBase,
  });

  const fetchData = async <T = any>(endpoint: string, options: any = {}): Promise<ApiResponse<T>> => {
    try {
      return await customFetch<ApiResponse<T>>(endpoint, options);
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  };

  // Regions
  const getRegions = (params: RegionParams = {}) =>
    customFetch<ApiResponse<Region[]>>('/regions', { method: 'GET', params });

  const getRegion = (code: string) =>
    customFetch<ApiResponse<Region>>(`/regions/${encodeURIComponent(code)}`, { method: 'GET' });

  const getRegionChildren = (code: string) =>
    customFetch<ApiResponse<Region[]>>(`/regions/${encodeURIComponent(code)}/children`, { method: 'GET' });

  const getRegionIndicators = (code: string, params: IndicatorParams = {}) =>
    customFetch<ApiResponse<Indicator[]>>(`/regions/${encodeURIComponent(code)}/indicators`, {
      method: 'GET',
      params,
    });

  // Themes
  const getThemes = () => customFetch<ApiResponse<Theme[]>>('/themes', { method: 'GET' });

  const getTheme = (slug: string) =>
    customFetch<ApiResponse<ThemeDetail>>(`/themes/${encodeURIComponent(slug)}`, { method: 'GET' });

  const getThemeKeyFigures = (slug: string) =>
    customFetch<ApiResponse<KeyFigure[]>>(`/themes/${encodeURIComponent(slug)}/key-figures`, {
      method: 'GET',
    });

  // Indicators
  const getIndicators = (params: IndicatorParams = {}) =>
    customFetch<ApiResponse<Indicator[]>>('/indicators', { method: 'GET', params });

  const getIndicatorsByTheme = (themeSlug: string, params: IndicatorParams = {}) =>
    customFetch<ApiResponse<Indicator[]>>(`/indicators/by-theme/${encodeURIComponent(themeSlug)}`, {
      method: 'GET',
      params,
    });

  const getMapData = (indicatorCode: string, params: MapDataParams = {}) => {
    const { disaggregation, ...rest } = params;
    return customFetch<ApiResponse<MapDataResponse>>(
      `/indicators/map-data/${encodeURIComponent(indicatorCode)}`,
      {
        method: 'GET',
        params: {
          ...rest,
          ...(disaggregation ? { disaggregation: JSON.stringify(disaggregation) } : {}),
        },
      },
    );
  };

  const getChartData = (indicatorCode: string, params: Record<string, any> = {}) =>
    customFetch<ApiResponse<ChartData>>(`/indicators/chart-data/${encodeURIComponent(indicatorCode)}`, {
      method: 'GET',
      params,
    });

  const compareIndicator = (indicator: string, regions: string[]) =>
    customFetch<ApiResponse<Indicator[]>>('/indicators/compare', {
      method: 'GET',
      params: { indicator, regions: regions.join(',') },
    });

  // Geo
  const getGeoJSON = (level: AdminLevel = 'region') =>
    customFetch<ApiResponse<GeoJSONData>>(`/geo/${level}`, { method: 'GET' });

  // Search
  const search = (query: string, lang: Language = 'fr') =>
    customFetch<ApiResponse<SearchResults>>('/search', {
      method: 'GET',
      params: { q: query, lang },
    });

  return {
    customFetch,
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
