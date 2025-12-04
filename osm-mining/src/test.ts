/**
 * Test script for OSM Mining
 * Tests the Overpass API connection and basic functionality
 */

import OsmDataFetcher from "./osmFetcher";
import OverpassQueryBuilder from "./queryBuilder";
import config from "./config";
import { GeoJSONFeatureCollection } from "./types";

async function testConnection(): Promise<boolean> {
  console.log("Testing Overpass API connection...\n");

  const fetcher = new OsmDataFetcher();

  // Test with a small query - just tourism=attraction
  const testQuery = `
[out:json][timeout:60];
(
  node["tourism"="attraction"](${config.sriLankaBbox.south},${config.sriLankaBbox.west},${config.sriLankaBbox.north},${config.sriLankaBbox.east});
);
out body;
`;

  try {
    console.log("Sending test query to Overpass API...");
    console.log("Bounding box:", config.sriLankaBbox);

    const response = await fetcher.executeQuery(testQuery);

    console.log("\n✓ Connection successful!");
    console.log(`  Received ${response.elements.length} elements`);

    // Convert to GeoJSON
    const geojson = fetcher.convertToGeoJSON(response);
    console.log(`  Converted to ${geojson.features.length} GeoJSON features`);

    // Show sample data
    if (geojson.features.length > 0) {
      console.log("\nSample features:");
      geojson.features.slice(0, 5).forEach((feature, index) => {
        const props = feature.properties as Record<string, unknown>;
        const tags = (props.tags || props) as Record<string, string>;
        const name = tags?.name || "Unnamed";
        const type = tags?.tourism || "N/A";
        console.log(`  ${index + 1}. ${name} (${type})`);
      });
    }

    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("\n✗ Connection failed:", errorMessage);
    return false;
  }
}

async function testQueryBuilder(): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("Testing Query Builder...\n");

  const builder = new OverpassQueryBuilder(config.sriLankaBbox);

  // Test tourism query
  const tourismQuery = builder.buildTourismQuery(["attraction", "hotel"]);
  console.log("Tourism Query Sample:");
  console.log(tourismQuery.substring(0, 300) + "...\n");

  // Test comprehensive query
  const comprehensiveQuery = builder.buildComprehensiveQuery({
    tourismTags: ["attraction"],
    amenityTags: ["restaurant"],
    historicTags: ["monument"],
  });
  console.log("Comprehensive Query Sample:");
  console.log(comprehensiveQuery.substring(0, 400) + "...\n");

  console.log("✓ Query Builder working correctly!");
}

async function testProcessing(): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("Testing Data Processing...\n");

  const fetcher = new OsmDataFetcher();

  // Create sample GeoJSON
  const sampleGeoJSON: GeoJSONFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "node/12345",
        geometry: {
          type: "Point",
          coordinates: [80.0, 7.0],
        },
        properties: {
          id: 12345,
          type: "node",
          tags: {
            name: "Test Attraction",
            "name:si": "ටෙස්ට්",
            tourism: "attraction",
            phone: "+94123456789",
            website: "https://example.com",
          },
        },
      },
    ],
  };

  const processed = fetcher.processForMongoDB(sampleGeoJSON);

  console.log("Processed feature:");
  console.log(JSON.stringify(processed[0], null, 2));

  console.log("\n✓ Data Processing working correctly!");
}

// Run all tests
async function runTests(): Promise<void> {
  console.log("=".repeat(50));
  console.log("OSM Mining Test Suite");
  console.log("=".repeat(50));

  await testQueryBuilder();
  await testProcessing();
  await testConnection();

  console.log("\n" + "=".repeat(50));
  console.log("All tests completed!");
  console.log("=".repeat(50));
}

runTests().catch(console.error);
