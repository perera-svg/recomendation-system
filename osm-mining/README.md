# OSM Mining for Sri Lanka Tourism Data

A Node.js application that mines OpenStreetMap (OSM) data for tourism-related places in Sri Lanka using the Overpass API and converts it to GeoJSON format for MongoDB storage.

## Features

- 🗺️ Fetches tourism data from OpenStreetMap via Overpass API
- 🔄 Converts OSM XML/JSON to GeoJSON using `osmtogeojson`
- 💾 Stores data in MongoDB with geospatial indexing
- 🔍 Supports various tourism-related categories:
  - Tourism (attractions, hotels, museums, viewpoints, etc.)
  - Amenities (restaurants, cafes, banks, etc.)
  - Historic places (monuments, temples, ruins, etc.)
  - Natural features (beaches, waterfalls, peaks, etc.)
  - Leisure places (parks, gardens, nature reserves, etc.)
- ⏰ Supports periodic data fetching
- 📁 Exports data to GeoJSON files

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Internet connection for Overpass API access

## Installation

1. Clone or navigate to the project directory:

   ```bash
   cd osm-mining
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create environment configuration:

   ```bash
   cp .env.example .env
   ```

4. Edit `.env` file with your MongoDB connection details:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DATABASE=tourism_db
   MONGODB_COLLECTION=places
   ```

## Usage

### Fetch and Store Data (with MongoDB)

```bash
npm start
```

This will:

1. Fetch all tourism-related data from OSM for Sri Lanka
2. Convert to GeoJSON
3. Save a backup GeoJSON file to `output/`
4. Store processed data in MongoDB
5. Display statistics

### Fetch Data Only (without MongoDB)

```bash
npm run fetch
```

This will fetch data and save it to GeoJSON files in the `output/` directory without requiring MongoDB.

### Run Tests

```bash
npm test
```

### Command Line Options

```bash
# Standard fetch and store
node src/index.js

# Periodic fetching (every 24 hours by default)
node src/index.js --periodic

# Fetch tourism data only (lighter query)
node src/index.js --tourism-only
```

## Project Structure

```
osm-mining/
├── src/
│   ├── config.js         # Configuration and environment variables
│   ├── queryBuilder.js   # Overpass QL query builder
│   ├── osmFetcher.js     # OSM data fetcher and GeoJSON converter
│   ├── mongoStorage.js   # MongoDB storage handler
│   ├── index.js          # Main entry point
│   ├── fetchOsmData.js   # Standalone fetch script
│   └── test.js           # Test suite
├── output/               # Generated GeoJSON files
├── .env.example          # Environment variables template
├── package.json
└── README.md
```

## Configuration

### Environment Variables

| Variable               | Description                    | Default                                   |
| ---------------------- | ------------------------------ | ----------------------------------------- |
| `MONGODB_URI`          | MongoDB connection string      | `mongodb://localhost:27017`               |
| `MONGODB_DATABASE`     | Database name                  | `tourism_db`                              |
| `MONGODB_COLLECTION`   | Collection name                | `places`                                  |
| `OVERPASS_API_URL`     | Overpass API endpoint          | `https://overpass-api.de/api/interpreter` |
| `BBOX_SOUTH`           | South boundary (latitude)      | `5.916`                                   |
| `BBOX_WEST`            | West boundary (longitude)      | `79.652`                                  |
| `BBOX_NORTH`           | North boundary (latitude)      | `9.836`                                   |
| `BBOX_EAST`            | East boundary (longitude)      | `81.879`                                  |
| `FETCH_INTERVAL_HOURS` | Hours between periodic fetches | `24`                                      |

### Sri Lanka Bounding Box

The default bounding box covers Sri Lanka:

- South: 5.916°
- West: 79.652°
- North: 9.836°
- East: 81.879°

## Data Schema

Each place document in MongoDB has the following structure:

```javascript
{
  osm_id: "node/123456",
  osm_type: "node",
  name: "Sigiriya Rock Fortress",
  name_si: "සීගිරිය",      // Sinhala name
  name_ta: "சிகிரியா",     // Tamil name
  category: "tourism",
  subcategory: "attraction",
  geometry: {
    type: "Point",
    coordinates: [80.759, 7.957]
  },
  location: {              // For geospatial queries
    type: "Point",
    coordinates: [80.759, 7.957]
  },
  tags: { /* Original OSM tags */ },
  address: {
    street: null,
    city: null,
    postcode: null,
    country: "Sri Lanka"
  },
  contact: {
    phone: null,
    email: null,
    website: null
  },
  opening_hours: null,
  wheelchair: null,
  description: null,
  fetched_at: ISODate("2025-11-26T00:00:00Z"),
  source: "OpenStreetMap"
}
```

## MongoDB Queries

### Find places near a location

```javascript
db.places.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [80.759, 7.957], // [longitude, latitude]
      },
      $maxDistance: 5000, // 5km
    },
  },
});
```

### Find by category

```javascript
db.places.find({ category: "tourism", subcategory: "hotel" });
```

### Text search

```javascript
db.places.find({ $text: { $search: "beach resort" } });
```

## API Reference

### OsmDataFetcher

```javascript
const OsmDataFetcher = require("./osmFetcher");
const fetcher = new OsmDataFetcher();

// Fetch by category
const geojson = await fetcher.fetchByCategory("tourism");

// Fetch all data
const allData = await fetcher.fetchAllData();

// Process for MongoDB
const processed = fetcher.processForMongoDB(geojson);
```

### MongoDBStorage

```javascript
const MongoDBStorage = require("./mongoStorage");
const storage = new MongoDBStorage();

await storage.connect();

// Store features
await storage.storeFeatures(processedFeatures);

// Find near location
const nearby = await storage.findNear(80.759, 7.957, 5000);

// Search
const results = await storage.search("beach");

// Get statistics
const stats = await storage.getStats();

await storage.disconnect();
```

## Rate Limiting

The Overpass API has usage guidelines:

- Less than 10,000 queries per day
- Less than 1 GB data per day

This application adds delays between queries to respect these limits.

## Data Sources

- [OpenStreetMap](https://www.openstreetmap.org/) - Map data © OpenStreetMap contributors
- [Overpass API](https://overpass-api.de/) - OSM data query service

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Acknowledgments

- OpenStreetMap contributors for the map data
- osmtogeojson library for GeoJSON conversion
- Overpass API for the query service
