/**
 * Formes renvoyees par l'API RGPH 2024.
 *
 * Source de verite unique des types partages : `types/map.ts` les reexporte
 * (les deux fichiers definissaient auparavant AdminLevel, GeoJSONData et
 * MapDataEntry avec des definitions divergentes, cf. AUDIT F-13).
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  count?: number;
  total?: number;
  limit?: number;
  offset?: number;
  message?: string;
  error?: string;
}

/** Le backend expose aussi le niveau "country" (region DJ). */
export type AdminLevel = 'country' | 'region' | 'district' | 'commune';

/** Niveaux reellement cartographiables (GeoData disponible). */
export type MapLevel = Extract<AdminLevel, 'region' | 'district' | 'commune'>;

export type Language = 'fr' | 'ar' | 'en';

export type Unit =
  | 'number'
  | 'percentage'
  | 'ratio'
  | 'per_thousand'
  | 'per_hundred_thousand'
  | 'years'
  | 'index'
  | 'currency';

export interface LocalizedName {
  fr: string;
  ar?: string;
  en?: string;
  [key: string]: string | undefined;
}

export interface ColorScale {
  min: string;
  max: string;
}

export interface Visualization {
  chartType?: 'choropleth' | 'bar' | 'pie' | 'line' | 'stacked_bar' | 'treemap' | 'gauge' | 'table';
  colorScale?: ColorScale;
  decimals?: number;
  showOnMap?: boolean;
}

export interface Region {
  code: string;
  name: string | LocalizedName;
  level: AdminLevel;
  parentCode?: string | null;
  center?: { lat?: number; lng?: number };
  area?: number;
  geoFeatureId?: string;
  sortOrder?: number;
  isActive?: boolean;
  [key: string]: any;
}

export interface Theme {
  slug: string;
  name: string | LocalizedName;
  description?: string | LocalizedName;
  icon?: string;
  color?: string;
  parentSlug?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  children?: Theme[];
  [key: string]: any;
}

/** Un document Indicator : une cellule (code, region, desagregation). */
export interface Indicator {
  indicatorCode: string;
  themeSlug: string;
  name: string | LocalizedName;
  unit?: Unit;
  regionCode: string;
  value: number | null;
  disaggregation?: Record<string, string>;
  year?: number;
  visualization?: Visualization;
  source?: { document?: string; table?: string; page?: number };
  [key: string]: any;
}

/** Metadonnee d'indicateur renvoyee par GET /themes/:slug. */
export interface IndicatorMeta {
  code: string;
  name: string | LocalizedName;
  unit?: Unit;
  visualization?: Visualization;
  count?: number;
  /** false = indicateur national uniquement, non cartographiable. */
  hasRegionalData?: boolean;
}

export interface ThemeDetail {
  theme: Theme;
  indicators: IndicatorMeta[];
  subThemes: Theme[];
}

export interface KeyFigure {
  code: string;
  label: string | LocalizedName;
  value: number;
  displayValue?: string | LocalizedName;
  unit?: string | LocalizedName;
  icon?: string;
  color?: string;
  themeSlug?: string;
  sortOrder?: number;
  year?: number;
}

export interface MapDataEntry {
  regionCode: string;
  regionName?: string | LocalizedName;
  center?: { lat?: number; lng?: number };
  value: number | null;
  unit?: Unit | null;
  [key: string]: any;
}

export interface MapDataResponse {
  indicatorCode: string;
  level: AdminLevel;
  mapData: MapDataEntry[];
  /** null quand aucune valeur numerique n'existe pour ce niveau. */
  scale: { min: number; max: number } | null;
  hasData: boolean;
  /** Regions dont seules des valeurs ventilees existent. */
  disaggregatedOnly: string[];
  visualization: Visualization;
}

/** Forme renvoyee par GET /indicators/chart-data/:code (Chart.js). */
export interface ChartData {
  labels: string[];
  datasets: Array<{ label?: string; data: Array<number | null> }>;
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

export interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  [key: string]: any;
}

export interface SearchResults {
  themes: Array<{ slug: string; name: string | LocalizedName; icon?: string }>;
  regions: Array<{ code: string; name: string | LocalizedName; level: AdminLevel }>;
  indicators: Array<{ code: string; name: string | LocalizedName; themeSlug: string; unit?: Unit }>;
}

// Params types
export interface RegionParams {
  level?: AdminLevel;
  parentCode?: string;
  [key: string]: any;
}

export interface IndicatorParams {
  theme?: string;
  indicator?: string;
  region?: string;
  year?: number;
  limit?: number;
  offset?: number;
  [key: string]: any;
}

export interface MapDataParams {
  level?: AdminLevel;
  disaggregation?: Record<string, string>;
  [key: string]: any;
}
