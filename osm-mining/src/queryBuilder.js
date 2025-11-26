/**
 * Overpass Query Builder
 * Builds Overpass QL queries for fetching OSM data
 */

class OverpassQueryBuilder {
  /**
   * Create a new query builder
   * @param {Object} bbox - Bounding box {south, west, north, east}
   */
  constructor(bbox) {
    this.bbox = bbox;
  }

  /**
   * Get the bounding box string for Overpass QL
   * @returns {string} Bounding box in format (south,west,north,east)
   */
  getBboxString() {
    const { south, west, north, east } = this.bbox;
    return `${south},${west},${north},${east}`;
  }

  /**
   * Build a query for tourism tags
   * @param {string[]} tags - Array of tourism tag values
   * @returns {string} Overpass QL query
   */
  buildTourismQuery(tags) {
    const bboxStr = this.getBboxString();
    const tagFilters = tags
      .map((tag) => `node["tourism"="${tag}"](${bboxStr});`)
      .join("\n  ");
    const wayFilters = tags
      .map((tag) => `way["tourism"="${tag}"](${bboxStr});`)
      .join("\n  ");

    return `
[out:json][timeout:180];
(
  ${tagFilters}
  ${wayFilters}
);
out body;
>;
out skel qt;
`;
  }

  /**
   * Build a query for amenity tags
   * @param {string[]} tags - Array of amenity tag values
   * @returns {string} Overpass QL query
   */
  buildAmenityQuery(tags) {
    const bboxStr = this.getBboxString();
    const tagFilters = tags
      .map((tag) => `node["amenity"="${tag}"](${bboxStr});`)
      .join("\n  ");
    const wayFilters = tags
      .map((tag) => `way["amenity"="${tag}"](${bboxStr});`)
      .join("\n  ");

    return `
[out:json][timeout:180];
(
  ${tagFilters}
  ${wayFilters}
);
out body;
>;
out skel qt;
`;
  }

  /**
   * Build a query for historic tags
   * @param {string[]} tags - Array of historic tag values
   * @returns {string} Overpass QL query
   */
  buildHistoricQuery(tags) {
    const bboxStr = this.getBboxString();
    const tagFilters = tags
      .map((tag) => `node["historic"="${tag}"](${bboxStr});`)
      .join("\n  ");
    const wayFilters = tags
      .map((tag) => `way["historic"="${tag}"](${bboxStr});`)
      .join("\n  ");

    return `
[out:json][timeout:180];
(
  ${tagFilters}
  ${wayFilters}
);
out body;
>;
out skel qt;
`;
  }

  /**
   * Build a query for natural features
   * @param {string[]} tags - Array of natural tag values
   * @returns {string} Overpass QL query
   */
  buildNaturalQuery(tags) {
    const bboxStr = this.getBboxString();
    const tagFilters = tags
      .map((tag) => `node["natural"="${tag}"](${bboxStr});`)
      .join("\n  ");
    const wayFilters = tags
      .map((tag) => `way["natural"="${tag}"](${bboxStr});`)
      .join("\n  ");

    return `
[out:json][timeout:180];
(
  ${tagFilters}
  ${wayFilters}
);
out body;
>;
out skel qt;
`;
  }

  /**
   * Build a query for leisure places
   * @param {string[]} tags - Array of leisure tag values
   * @returns {string} Overpass QL query
   */
  buildLeisureQuery(tags) {
    const bboxStr = this.getBboxString();
    const tagFilters = tags
      .map((tag) => `node["leisure"="${tag}"](${bboxStr});`)
      .join("\n  ");
    const wayFilters = tags
      .map((tag) => `way["leisure"="${tag}"](${bboxStr});`)
      .join("\n  ");

    return `
[out:json][timeout:180];
(
  ${tagFilters}
  ${wayFilters}
);
out body;
>;
out skel qt;
`;
  }

  /**
   * Build a comprehensive query for all tourism-related data
   * @param {Object} config - Configuration object with tag arrays
   * @returns {string} Overpass QL query
   */
  buildComprehensiveQuery(config) {
    const bboxStr = this.getBboxString();
    const { tourismTags, amenityTags, historicTags, naturalTags, leisureTags } =
      config;

    let filters = [];

    // Tourism tags
    if (tourismTags && tourismTags.length > 0) {
      tourismTags.forEach((tag) => {
        filters.push(`node["tourism"="${tag}"](${bboxStr});`);
        filters.push(`way["tourism"="${tag}"](${bboxStr});`);
      });
    }

    // Amenity tags
    if (amenityTags && amenityTags.length > 0) {
      amenityTags.forEach((tag) => {
        filters.push(`node["amenity"="${tag}"](${bboxStr});`);
        filters.push(`way["amenity"="${tag}"](${bboxStr});`);
      });
    }

    // Historic tags
    if (historicTags && historicTags.length > 0) {
      historicTags.forEach((tag) => {
        filters.push(`node["historic"="${tag}"](${bboxStr});`);
        filters.push(`way["historic"="${tag}"](${bboxStr});`);
      });
    }

    // Natural tags
    if (naturalTags && naturalTags.length > 0) {
      naturalTags.forEach((tag) => {
        filters.push(`node["natural"="${tag}"](${bboxStr});`);
        filters.push(`way["natural"="${tag}"](${bboxStr});`);
      });
    }

    // Leisure tags
    if (leisureTags && leisureTags.length > 0) {
      leisureTags.forEach((tag) => {
        filters.push(`node["leisure"="${tag}"](${bboxStr});`);
        filters.push(`way["leisure"="${tag}"](${bboxStr});`);
      });
    }

    return `
[out:json][timeout:300];
(
  ${filters.join("\n  ")}
);
out body;
>;
out skel qt;
`;
  }
}

module.exports = OverpassQueryBuilder;
