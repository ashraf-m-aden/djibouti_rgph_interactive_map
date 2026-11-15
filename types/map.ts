/**
 * Types de la carte. Ce fichier dupliquait AdminLevel, GeoJSONData,
 * GeoJSONFeature et MapDataEntry avec des definitions divergentes de celles de
 * `types/api.ts` (cf. AUDIT F-13) : il les reexporte desormais.
 */
export type {
  AdminLevel,
  ColorScale,
  GeoJSONData,
  GeoJSONFeature,
  MapDataEntry,
  MapLevel,
} from './api';

import type { AdminLevel, ColorScale, GeoJSONData, MapDataEntry } from './api';

export interface FetchMapDataOptions {
  level?: AdminLevel;
  disaggregation?: Record<string, string>;
}

export interface MapState {
  currentLevel: AdminLevel;
  selectedRegion: string | null;
  currentIndicator: string | null;
  geoData: Partial<Record<AdminLevel, GeoJSONData | null>>;
  mapData: MapDataEntry[];
  colorScale: ColorScale;
  loading: boolean;
}
