/**
 * OSM Data Fetcher
 * Fetches data from Overpass API and converts to GeoJSON
 */

const fetch = require("node-fetch");
const osmtogeojson = require("osmtogeojson");
const config = require("./config");
const OverpassQueryBuilder = require("./queryBuilder");

class OsmDataFetcher {
  /**
   * Create a new OSM data fetcher
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || config.overpassApiUrl;
    this.bbox = options.bbox || config.sriLankaBbox;
    this.queryBuilder = new OverpassQueryBuilder(this.bbox);
  }

  /**
   * Execute an Overpass API query
   * @param {string} query - Overpass QL query
   * @returns {Promise<Object>} OSM JSON data
   */
  async executeQuery(query) {
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

      const data = await response.json();
      console.log(
        `Received ${
          data.elements ? data.elements.length : 0
        } elements from Overpass API`
      );
      return data;
    } catch (error) {
      console.error("Error fetching data from Overpass API:", error.message);
      throw error;
    }
  }

  /**
   * Convert OSM data to GeoJSON
   * @param {Object} osmData - OSM JSON data
   * @param {Object} options - Conversion options
   * @returns {Object} GeoJSON FeatureCollection
   */
  convertToGeoJSON(osmData, options = {}) {
    console.log("Converting OSM data to GeoJSON...");

    const geojson = osmtogeojson(osmData, {
      flatProperties: options.flatProperties || false,
      ...options,
    });

    console.log(
      `Converted to GeoJSON with ${
        geojson.features ? geojson.features.length : 0
      } features`
    );
    return geojson;
  }

  /**
   * Fetch tourism data from OSM
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchTourismData() {
    const query = this.queryBuilder.buildTourismQuery(config.tourismTags);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch amenity data from OSM
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchAmenityData() {
    const query = this.queryBuilder.buildAmenityQuery(config.amenityTags);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch historic data from OSM
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchHistoricData() {
    const query = this.queryBuilder.buildHistoricQuery(config.historicTags);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch natural features from OSM
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchNaturalData() {
    const query = this.queryBuilder.buildNaturalQuery(config.naturalTags);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch leisure data from OSM
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchLeisureData() {
    const query = this.queryBuilder.buildLeisureQuery(config.leisureTags);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch all tourism-related data in one query
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchAllData() {
    const query = this.queryBuilder.buildComprehensiveQuery(config);
    const osmData = await this.executeQuery(query);
    return this.convertToGeoJSON(osmData);
  }

  /**
   * Fetch data by category type
   * @param {string} category - Category type: 'tourism', 'amenity', 'historic', 'natural', 'leisure', 'all'
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchByCategory(category) {
    switch (category.toLowerCase()) {
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
   * @param {Object} geojson - GeoJSON FeatureCollection
   * @returns {Array} Array of processed features ready for MongoDB
   */
  processForMongoDB(geojson) {
    console.log("Processing features for MongoDB...");

    const processedFeatures = geojson.features.map((feature) => {
      // Extract coordinates for MongoDB geospatial queries
      let coordinates = null;
      let geometryType = feature.geometry ? feature.geometry.type : null;

      if (feature.geometry) {
        if (geometryType === "Point") {
          coordinates = feature.geometry.coordinates;
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
      const tags = props.tags || props;

      return {
        osm_id: feature.id || props.id,
        osm_type: props.type || this.extractOsmType(feature.id),
        name: tags.name || tags["name:en"] || "Unnamed",
        name_si: tags["name:si"] || null,
        name_ta: tags["name:ta"] || null,
        category: this.determineCategory(tags),
        subcategory: this.determineSubcategory(tags),
        geometry: feature.geometry,
        location: coordinates
          ? {
              type: "Point",
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
    });

    // Filter out features without valid location
    const validFeatures = processedFeatures.filter((f) => f.location !== null);
    console.log(`Processed ${validFeatures.length} valid features for MongoDB`);

    return validFeatures;
  }

  /**
   * Calculate centroid of a polygon or linestring
   * @param {Object} geometry - GeoJSON geometry
   * @returns {Array} [longitude, latitude]
   */
  calculateCentroid(geometry) {
    let coords = [];

    if (geometry.type === "Polygon") {
      coords = geometry.coordinates[0]; // Outer ring
    } else if (geometry.type === "LineString") {
      coords = geometry.coordinates;
    } else if (geometry.type === "MultiPolygon") {
      coords = geometry.coordinates[0][0]; // First polygon's outer ring
    }

    if (coords.length === 0) return null;

    let sumLon = 0,
      sumLat = 0;
    coords.forEach((coord) => {
      sumLon += coord[0];
      sumLat += coord[1];
    });

    return [sumLon / coords.length, sumLat / coords.length];
  }

  /**
   * Extract OSM type from feature ID
   * @param {string} id - Feature ID (e.g., 'node/123')
   * @returns {string} OSM type
   */
  extractOsmType(id) {
    if (!id) return "unknown";
    const parts = id.toString().split("/");
    return parts[0] || "unknown";
  }

  /**
   * Determine main category from tags
   * @param {Object} tags - OSM tags
   * @returns {string} Category name
   */
  determineCategory(tags) {
    if (tags.tourism) return "tourism";
    if (tags.amenity) return "amenity";
    if (tags.historic) return "historic";
    if (tags.natural) return "natural";
    if (tags.leisure) return "leisure";
    return "other";
  }

  /**
   * Determine subcategory from tags
   * @param {Object} tags - OSM tags
   * @returns {string} Subcategory name
   */
  determineSubcategory(tags) {
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

module.exports = OsmDataFetcher;
