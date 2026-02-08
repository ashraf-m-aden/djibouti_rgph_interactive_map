export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export type AdminLevel = 'region' | 'district' | 'commune';
export type Language = 'fr' | 'ar' | 'en';
export interface LocalizedName {
  fr: string;
  ar?: string;
  en?: string;
}
export interface Region {
  code: string;
  name: string | LocalizedName;
  nameAr?: string;
  nameEn?: string;
  level: AdminLevel;
  parentCode?: string;
  population?: number;
  area?: number;
  childrenCount?: number;
  [key: string]: any;
}

export interface Theme {
  slug: string;
  name: string | LocalizedName;
  nameAr?: string;
  nameEn?: string;
  description?: string | LocalizedName;
  descriptionAr?: string;
  descriptionEn?: string;
  icon?: string;
  color?: string;
  order?: number;
  [key: string]: any;
}
export interface Indicator {
  code: string;
  name: string | {
    fr: string;
    ar?: string;
    en?: string;
  };
  nameAr?: string;
  nameEn?: string;
  themeSlug: string;
  unit?: string;
  [key: string]: any;
}

export interface MapDataEntry {
  regionCode: string;
  districtCode?: string;
  communeCode?: string;
  value: number | null;
  name?: string;
  regionName?: string | {
    fr: string;
    ar?: string;
    en?: string;
  };
  [key: string]: any;
}
export interface ChartDataEntry {
  label: string;
  value: number;
  percentage?: number;
  [key: string]: any;
}

export interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  [key: string]: any;
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

export interface SearchResult {
  type: 'region' | 'indicator' | 'theme';
  code?: string;
  slug?: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  [key: string]: any;
}

// Params types
export interface RegionParams {
  level?: AdminLevel;
  parentCode?: string;
  [key: string]: any;
}

export interface IndicatorParams {
  themeSlug?: string;
  search?: string;
  limit?: number;
  [key: string]: any;
}

export interface MapDataParams {
  level?: AdminLevel;
  disaggregation?: Record<string, any>;
  [key: string]: any;
}

