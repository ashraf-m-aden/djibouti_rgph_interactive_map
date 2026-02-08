export type AdminLevel = 'region' | 'district' | 'commune';

export interface GeoJSONData {
  type: string;
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

export interface MapDataEntry {
  regionCode: string;
  districtCode?: string;
  communeCode?: string;
  value: number | null;
  name?: string;
  [key: string]: any;
}

export interface ColorScale {
  min: string;
  max: string;
}

export interface FetchMapDataOptions {
  level?: AdminLevel;
  disaggregation?: Record<string, any>;
}

export interface MapState {
  currentLevel: AdminLevel;
  selectedRegion: string | null;
  currentIndicator: string | null;
  geoData: {
    region: GeoJSONData | null;
    district: GeoJSONData | null;
    commune: GeoJSONData | null;
  };
  mapData: MapDataEntry[];
  colorScale: ColorScale;
  loading: boolean;
}