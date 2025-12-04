/**
 * Main Entry Point for OSM Mining
 * Fetches OSM data and stores in MongoDB
 */

import OsmDataFetcher from "./osmFetcher";
import MongoDBStorage from "./mongoStorage";
import config from "./config";
import * as fs from "fs";
import * as path from "path";

/**
 * Main function to fetch and store OSM data
 */
async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("OSM Mining for Sri Lanka Tourism Data");
  console.log("=".repeat(60));
  console.log(`Bounding Box: ${JSON.stringify(config.sriLankaBbox)}`);
  console.log(`API Endpoint: ${config.overpassApiUrl}`);
  console.log("=".repeat(60));

  const fetcher = new OsmDataFetcher();
  const storage = new MongoDBStorage();

  try {
    // Fetch all tourism-related data
    console.log("\n[1/5] Fetching OSM data...");
    const geojson = await fetcher.fetchAllData();

    // Save raw GeoJSON to file for backup
    console.log("\n[2/5] Saving GeoJSON backup...");
    const outputDir = path.join(__dirname, "..", "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const geojsonPath = path.join(
      outputDir,
      `sri-lanka-tourism-${timestamp}.geojson`
    );
    fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2));
    console.log(`GeoJSON saved to: ${geojsonPath}`);

    // Process for MongoDB
    console.log("\n[3/5] Processing data for MongoDB...");
    const processedFeatures = fetcher.processForMongoDB(geojson);

    // Store in MongoDB
    console.log("\n[4/5] Storing in MongoDB...");
    await storage.connect();
    const results = await storage.storeFeatures(processedFeatures);

    // Print statistics
    console.log("\n[5/5] Fetching statistics...");
    const stats = await storage.getStats();
    console.log("\n" + "=".repeat(60));
    console.log("STATISTICS");
    console.log("=".repeat(60));
    console.log(`Total places: ${stats.total}`);
    console.log("\nBy Category:");
    stats.byCategory.forEach((cat) => {
      console.log(`  ${cat._id}: ${cat.count}`);
    });
    console.log("\nTop Subcategories:");
    stats.topSubcategories.slice(0, 10).forEach((sub) => {
      console.log(`  ${sub._id}: ${sub.count}`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("OSM Mining completed successfully!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Error during OSM mining:", error);
    process.exit(1);
  } finally {
    await storage.disconnect();
  }
}

/**
 * Fetch only tourism data (lighter query)
 */
async function fetchTourismOnly(): Promise<void> {
  const fetcher = new OsmDataFetcher();
  const storage = new MongoDBStorage();

  try {
    console.log("Fetching tourism data only...");
    const geojson = await fetcher.fetchTourismData();
    const processedFeatures = fetcher.processForMongoDB(geojson);

    await storage.connect();
    await storage.storeFeatures(processedFeatures);
    const stats = await storage.getStats();
    console.log("Statistics:", stats);
  } finally {
    await storage.disconnect();
  }
}

/**
 * Periodic fetching with interval
 */
async function startPeriodicFetching(): Promise<void> {
  console.log(
    `Starting periodic OSM data fetching every ${
      config.fetchIntervalMs / 3600000
    } hours`
  );

  // Initial fetch
  await main();

  // Set up interval
  setInterval(async () => {
    console.log("\n[PERIODIC] Starting scheduled fetch...");
    await main();
  }, config.fetchIntervalMs);
}

// Export functions
export { main, fetchTourismOnly, startPeriodicFetching };

// Run if executed directly
const isMainModule = require.main === module;

if (isMainModule) {
  const args = process.argv.slice(2);

  if (args.includes("--periodic")) {
    startPeriodicFetching();
  } else if (args.includes("--tourism-only")) {
    fetchTourismOnly();
  } else {
    main();
  }
}
