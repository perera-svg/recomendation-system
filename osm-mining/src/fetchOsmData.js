/**
 * Standalone script to fetch OSM data without MongoDB
 * Useful for testing or exporting to file only
 */

const OsmDataFetcher = require("./osmFetcher");
const config = require("./config");
const fs = require("fs");
const path = require("path");

async function fetchOsmData() {
  console.log("=".repeat(60));
  console.log("OSM Data Fetcher - Sri Lanka Tourism");
  console.log("=".repeat(60));
  console.log(`Bounding Box: ${JSON.stringify(config.sriLankaBbox)}`);
  console.log("=".repeat(60));

  const fetcher = new OsmDataFetcher();
  const outputDir = path.join(__dirname, "..", "output");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const categories = ["tourism", "historic", "natural", "leisure"];

  for (const category of categories) {
    console.log(`\nFetching ${category} data...`);

    try {
      const geojson = await fetcher.fetchByCategory(category);

      if (geojson.features && geojson.features.length > 0) {
        const filename = `sri-lanka-${category}.geojson`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(geojson, null, 2));
        console.log(
          `  Saved ${geojson.features.length} features to ${filename}`
        );
      } else {
        console.log(`  No features found for ${category}`);
      }

      // Add delay to avoid rate limiting
      await sleep(2000);
    } catch (error) {
      console.error(`  Error fetching ${category}:`, error.message);
    }
  }

  // Fetch all data combined
  console.log("\nFetching all combined data...");
  try {
    const allData = await fetcher.fetchAllData();
    const allFilename = "sri-lanka-all-tourism.geojson";
    const allFilepath = path.join(outputDir, allFilename);
    fs.writeFileSync(allFilepath, JSON.stringify(allData, null, 2));
    console.log(
      `Saved ${allData.features.length} total features to ${allFilename}`
    );

    // Also save processed data
    const processed = fetcher.processForMongoDB(allData);
    const processedFilename = "sri-lanka-processed.json";
    const processedFilepath = path.join(outputDir, processedFilename);
    fs.writeFileSync(processedFilepath, JSON.stringify(processed, null, 2));
    console.log(`Saved processed data to ${processedFilename}`);
  } catch (error) {
    console.error("Error fetching all data:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Fetching complete! Check the output folder.");
  console.log("=".repeat(60));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the fetcher
fetchOsmData().catch(console.error);
