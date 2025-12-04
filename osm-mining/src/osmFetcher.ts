/**
 * OSM Data Fetcher
 * Fetches data from Overpass API and converts to GeoJSON
 */

import fetch from "node-fetch";
import osmtogeojson from "osmtogeojson";
import config from "./config";
import OverpassQueryBuilder from "./queryBuilder";
import {
  BoundingBox,
  Category,
  FetcherOptions,
  GeoJSONFeatureCollection,
  GeoJSONGeometry,
  GeoJSONPoint,
  OSMResponse,
  ProcessedPlace,
} from "./types";

interface OsmToGeoJSONOptions {
  flatProperties?: boolean;
  [key: string]: unknown;
}

class OsmDataFetcher {
  private apiUrl: string;
  private bbox: BoundingBox;
  private queryBuilder: OverpassQueryBuilder;

  /**
   * Create a new OSM data fetcher
   * @param options - Configuration options
   */
  constructor(options: FetcherOptions = {}) {
    this.apiUrl = options.apiUrl || config.overpassApiUrl;
    this.bbox = options.bbox || config.sriLankaBbox;
    this.queryBuilder = new OverpassQueryBuilder(this.bbox);
  }

  /**
   * Execute an Overpass API query
   * @param query - Overpass QL query
   * @returns OSM JSON data
   */
  async executeQuery(query: string): Promise<OSMResponse> {
    console.log("Executing Overpass query...");
    console.log("Query:", query.substring(0, 200) + "...");

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "data=" + encodeURIComponent(query),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as OSMResponse;
      console.log(
        `Received ${
          data.elements ? data.elements.length : 0
        } elements from Overpass API`
      );
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching data from Overpass API:", errorMessage);
      throw error;
    }
  }

  /**
   * Convert OSM data to GeoJSON
   * @param osmData - OSM JSON data
   * @param options - Conversion options
   * @returns GeoJSON FeatureCollection
   */
  convertToGeoJSON(
    osmData: OSMResponse,
    options: OsmToGeoJSONOptions = {}
  ): GeoJSONFeatureCollection {
    console.log("Converting OSM data to GeoJSON...");

    const geojson = osmtogeojson(osmData, {
      flatProperties: options.flatProperties || false,
      ...options,
    }) as GeoJSONFeatureCollection;

    console.log(
      `Converted to GeoJSON with ${
        geojson.features ? geojson.features.length : 0
      } features`
    );
    return geojson;
  }

  /**
   * Fetch tourism data from OSM
   * @returns GeoJSON FeatureCollection
   */
  async fetchTourismData(): Promise<GeoJSONFeatureCollection> {
    const query = this.queryBuilder.buildTourismQuery(config.tourismTags);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch amenity data from OSM
   * @returns GeoJSON FeatureCollection
   */
  async fetchAmenityData(): Promise<GeoJSONFeatureCollection> {
    const query = this.queryBuilder.buildAmenityQuery(config.amenityTags);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch historic data from OSM
   * @returns GeoJSON FeatureCollection
   */
  async fetchHistoricData(): Promise<GeoJSONFeatureCollection> {
    const query = this.queryBuilder.buildHistoricQuery(config.historicTags);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch natural features from OSM
   * @returns GeoJSON FeatureCollection
   */
  async fetchNaturalData(): Promise<GeoJSONFeatureCollection> {
    const query = this.queryBuilder.buildNaturalQuery(config.naturalTags);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch leisure data from OSM
   * @returns GeoJSON FeatureCollection
   */
  async fetchLeisureData(): Promise<GeoJSONFeatureCollection> {
    const query = this.queryBuilder.buildLeisureQuery(config.leisureTags);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch all tourism-related data in one query
   * @returns GeoJSON FeatureCollection
   */
  async fetchAllData(): Promise<GeoJSONFeatureCollection> {
    const query = this.queryBuilder.buildComprehensiveQuery(config);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch data by category type
   * @param category - Category type: 'tourism', 'amenity', 'historic', 'natural', 'leisure', 'all'
   * @returns GeoJSON FeatureCollection
   */
  async fetchByCategory(category: Category): Promise<GeoJSONFeatureCollection> {
    switch (category.toLowerCase() as Category) {
      case "tourism":
        return this.fetchTourismData();
      case "amenity":
        return this.fetchAmenityData();
      case "historic":
        return this.fetchHistoricData();
      case "natural":
        return this.fetchNaturalData();
      case "leisure":
        return this.fetchLeisureData();
      case "all":
        return this.fetchAllData();
      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }

  /**
   * Process GeoJSON features for MongoDB storage
   * Adds useful metadata and ensures proper structure
   * @param geojson - GeoJSON FeatureCollection
   * @returns Array of processed features ready for MongoDB
   */
  processForMongoDB(geojson: GeoJSONFeatureCollection): ProcessedPlace[] {
    console.log("Processing features for MongoDB...");

    const processedFeatures: ProcessedPlace[] = geojson.features.map(
      (feature) => {
        // Extract coordinates for MongoDB geospatial queries
        let coordinates: [number, number] | null = null;
        const geometryType = feature.geometry ? feature.geometry.type : null;

        if (feature.geometry) {
          if (geometryType === "Point") {
            coordinates = (feature.geometry as GeoJSONPoint).coordinates;
          } else if (
            geometryType === "Polygon" ||
            geometryType === "LineString"
          ) {
            // Calculate centroid for non-point geometries
            coordinates = this.calculateCentroid(feature.geometry);
          }
        }

        // Extract properties
        const props = feature.properties || {};
        const tags = (props.tags || props) as Record<string, string>;

        return {
          osm_id: String(feature.id || props.id || ""),
          osm_type: String(props.type || this.extractOsmType(feature.id)),
          name: String(tags.name || tags["name:en"] || "Unnamed"),
          name_si: tags["name:si"] || null,
          name_ta: tags["name:ta"] || null,
          category: this.determineCategory(tags),
          subcategory: this.determineSubcategory(tags),
          geometry: feature.geometry,
          location: coordinates
            ? {
                type: "Point" as const,
                coordinates: coordinates,
              }
            : null,
          tags: tags,
          address: {
            street: tags["addr:street"] || null,
            city: tags["addr:city"] || null,
            postcode: tags["addr:postcode"] || null,
            country: "Sri Lanka",
          },
          contact: {
            phone: tags.phone || tags["contact:phone"] || null,
            email: tags.email || tags["contact:email"] || null,
            website: tags.website || tags["contact:website"] || null,
          },
          opening_hours: tags.opening_hours || null,
          wheelchair: tags.wheelchair || null,
          description: tags.description || null,
          fetched_at: new Date(),
          source: "OpenStreetMap",
        };
      }
    );

    // Filter out features without valid location
    const validFeatures = processedFeatures.filter((f) => f.location !== null);
    console.log(`Processed ${validFeatures.length} valid features for MongoDB`);

    return validFeatures;
  }

  /**
   * Calculate centroid of a polygon or linestring
   * @param geometry - GeoJSON geometry
   * @returns [longitude, latitude]
   */
  calculateCentroid(geometry: GeoJSONGeometry): [number, number] | null {
    let coords: number[][] = [];

    if (geometry.type === "Polygon") {
      coords = geometry.coordinates[0]; // Outer ring
    } else if (geometry.type === "LineString") {
      coords = geometry.coordinates;
    } else if (geometry.type === "MultiPolygon") {
      coords = geometry.coordinates[0][0]; // First polygon's outer ring
    }

    if (coords.length === 0) return null;

    let sumLon = 0;
    let sumLat = 0;
    coords.forEach((coord) => {
      sumLon += coord[0];
      sumLat += coord[1];
    });

    return [sumLon / coords.length, sumLat / coords.length];
  }

  /**
   * Extract OSM type from feature ID
   * @param id - Feature ID (e.g., 'node/123')
   * @returns OSM type
   */
  extractOsmType(id: string | number | undefined): string {
    if (!id) return "unknown";
    const parts = id.toString().split("/");
    return parts[0] || "unknown";
  }

  /**
   * Determine main category from tags
   * @param tags - OSM tags
   * @returns Category name
   */
  determineCategory(tags: Record<string, string>): string {
    if (tags.tourism) return "tourism";
    if (tags.amenity) return "amenity";
    if (tags.historic) return "historic";
    if (tags.natural) return "natural";
    if (tags.leisure) return "leisure";
    return "other";
  }

  /**
   * Determine subcategory from tags
   * @param tags - OSM tags
   * @returns Subcategory name
   */
  determineSubcategory(tags: Record<string, string>): string {
    return (
      tags.tourism ||
      tags.amenity ||
      tags.historic ||
      tags.natural ||
      tags.leisure ||
      "unknown"
    );
  }
}

export default OsmDataFetcher;
