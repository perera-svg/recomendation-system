/**
 * Overpass Query Builder
 * Builds Overpass QL queries for fetching OSM data
 */

import { BoundingBox, TagConfig } from "./types";

class OverpassQueryBuilder {
  private bbox: BoundingBox;

  /**
   * Create a new query builder
   * @param bbox - Bounding box {south, west, north, east}
   */
  constructor(bbox: BoundingBox) {
    this.bbox = bbox;
  }

  /**
   * Get the bounding box string for Overpass QL
   * @returns Bounding box in format (south,west,north,east)
   */
  getBboxString(): string {
    const { south, west, north, east } = this.bbox;
    return `${south},${west},${north},${east}`;
  }

  /**
   * Build a query for tourism tags
   * @param tags - Array of tourism tag values
   * @returns Overpass QL query
   */
  buildTourismQuery(tags: string[]): string {
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
   * @param tags - Array of amenity tag values
   * @returns Overpass QL query
   */
  buildAmenityQuery(tags: string[]): string {
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
   * @param tags - Array of historic tag values
   * @returns Overpass QL query
   */
  buildHistoricQuery(tags: string[]): string {
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
   * @param tags - Array of natural tag values
   * @returns Overpass QL query
   */
  buildNaturalQuery(tags: string[]): string {
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
   * @param tags - Array of leisure tag values
   * @returns Overpass QL query
   */
  buildLeisureQuery(tags: string[]): string {
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
   * @param config - Configuration object with tag arrays
   * @returns Overpass QL query
   */
  buildComprehensiveQuery(tagConfig: TagConfig): string {
    const bboxStr = this.getBboxString();
    const { tourismTags, amenityTags, historicTags, naturalTags, leisureTags } =
      tagConfig;

    const filters: string[] = [];

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

export default OverpassQueryBuilder;
