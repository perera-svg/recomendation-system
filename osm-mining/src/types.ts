/**
 * Type definitions for OSM Mining
 */

// GeoJSON Types
export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface GeoJSONLineString {
  type: "LineString";
  coordinates: number[][];
}

export interface GeoJSONMultiPolygon {
  type: "MultiPolygon";
  coordinates: number[][][][];
}

export type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONPolygon
  | GeoJSONLineString
  | GeoJSONMultiPolygon;

export interface GeoJSONFeature {
  type: "Feature";
  id?: string | number;
  geometry: GeoJSONGeometry | null;
  properties: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

// OSM Types
export interface OSMElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  members?: OSMRelationMember[];
}

export interface OSMRelationMember {
  type: "node" | "way" | "relation";
  ref: number;
  role: string;
}

export interface OSMResponse {
  version: number;
  generator: string;
  osm3s?: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OSMElement[];
}

// Bounding Box
export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

// Configuration
export interface MongoDBConfig {
  uri: string;
  database: string;
  collection: string;
}

export interface Config {
  overpassApiUrl: string;
  sriLankaBbox: BoundingBox;
  tourismTags: string[];
  amenityTags: string[];
  historicTags: string[];
  naturalTags: string[];
  leisureTags: string[];
  mongodb: MongoDBConfig;
  fetchIntervalMs: number;
}

export interface TagConfig {
  tourismTags?: string[];
  amenityTags?: string[];
  historicTags?: string[];
  naturalTags?: string[];
  leisureTags?: string[];
}

// Processed Place for MongoDB
export interface Address {
  street: string | null;
  city: string | null;
  postcode: string | null;
  country: string;
}

export interface Contact {
  phone: string | null;
  email: string | null;
  website: string | null;
}

export interface ProcessedPlace {
  osm_id: string;
  osm_type: string;
  name: string;
  name_si: string | null;
  name_ta: string | null;
  category: string;
  subcategory: string;
  geometry: GeoJSONGeometry | null;
  location: GeoJSONPoint | null;
  tags: Record<string, string>;
  address: Address;
  contact: Contact;
  opening_hours: string | null;
  wheelchair: string | null;
  description: string | null;
  fetched_at: Date;
  source: string;
  created_at?: Date;
}

// Storage Results
export interface StorageResult {
  inserted: number;
  updated: number;
  errors: number;
}

// Statistics
export interface CategoryCount {
  _id: string;
  count: number;
}

export interface Statistics {
  total: number;
  byCategory: CategoryCount[];
  topSubcategories: CategoryCount[];
}

// Fetcher Options
export interface FetcherOptions {
  apiUrl?: string;
  bbox?: BoundingBox;
}

// Storage Options
export interface StorageOptions {
  uri?: string;
  database?: string;
  collection?: string;
}

// Query Options
export interface QueryOptions {
  limit?: number;
  skip?: number;
  category?: string;
}

// Category Types
export type Category =
  | "tourism"
  | "amenity"
  | "historic"
  | "natural"
  | "leisure"
  | "all";

// Export Feature (for MongoDB export)
export interface ExportFeature {
  type: "Feature";
  id: string;
  properties: {
    name: string;
    category: string;
    subcategory: string;
    tags: Record<string, string>;
    address: Address;
    contact: Contact;
  };
  geometry: GeoJSONGeometry | null;
}
