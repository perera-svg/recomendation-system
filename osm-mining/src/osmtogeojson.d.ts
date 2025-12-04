declare module "osmtogeojson" {
  interface OsmToGeoJSONOptions {
    flatProperties?: boolean;
    uninterestingTags?: { [key: string]: boolean };
    polygonFeatures?: { [key: string]: boolean };
    deduplicator?: (ways: unknown[]) => unknown[];
  }

  interface GeoJSONFeatureCollection {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
  }

  interface GeoJSONFeature {
    type: "Feature";
    id?: string | number;
    geometry: GeoJSONGeometry | null;
    properties: Record<string, unknown>;
  }

  type GeoJSONGeometry =
    | { type: "Point"; coordinates: [number, number] }
    | { type: "LineString"; coordinates: number[][] }
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] }
    | { type: "MultiLineString"; coordinates: number[][][] }
    | { type: "MultiPoint"; coordinates: number[][] }
    | { type: "GeometryCollection"; geometries: GeoJSONGeometry[] };

  function osmtogeojson(
    data: unknown,
    options?: OsmToGeoJSONOptions
  ): GeoJSONFeatureCollection;

  export = osmtogeojson;
}
