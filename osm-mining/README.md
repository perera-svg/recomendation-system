# OSM Mining for Sri Lanka Tourism Data

A TypeScript Node.js application that mines OpenStreetMap (OSM) data for tourism-related places in Sri Lanka using the Overpass API and converts it to GeoJSON format for MongoDB storage.

## Features

- 🗺️ Fetches tourism data from OpenStreetMap via Overpass API
- 🔄 Converts OSM XML/JSON to GeoJSON using `osmtogeojson`
- 💾 Stores data in MongoDB with geospatial indexing
- 🐳 Docker Compose setup for MongoDB 8.0 with Mongo Express UI
- 📝 Fully typed with TypeScript
- 🔍 Supports various tourism-related categories:
  - Tourism (attractions, hotels, museums, viewpoints, etc.)
  - Amenities (restaurants, cafes, banks, etc.)
  - Historic places (monuments, temples, ruins, etc.)
  - Natural features (beaches, waterfalls, peaks, etc.)
  - Leisure places (parks, gardens, nature reserves, etc.)
- ⏰ Supports periodic data fetching
- 📁 Exports data to GeoJSON files

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose (for MongoDB)
- Internet connection for Overpass API access

## Quick Start with Docker

1. Clone or navigate to the project directory:

   ```bash
   cd osm-mining
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start MongoDB using Docker:

   ```bash
   npm run docker:up
   ```

   This starts:
   - MongoDB 8.0 on port `27017`
   - Mongo Express (Web UI) on port `8081`

4. Create environment configuration:

   ```bash
   cp .env.example .env
   ```

5. Build and run:
   ```bash
   npm start
   ```

## Docker Commands

```bash
# Start MongoDB containers
npm run docker:up

# Stop MongoDB containers
npm run docker:down

# View container logs
npm run docker:logs

# Reset MongoDB (removes all data)
npm run docker:reset
```

## MongoDB Access

### Connection Details

- **Host:** `localhost:27017`
- **Admin User:** `admin` / `password123`
- **App User:** `osm_app` / `osm_password123`
- **Database:** `tourism_db`

### Mongo Express (Web UI)

Access at: http://localhost:8081
- **Username:** `admin`
- **Password:** `admin123`

## Usage

### Fetch and Store Data (with MongoDB)

```bash
# Build and run (production)
npm start

# Run directly with ts-node (development)
npm run start:dev
```

This will:

1. Fetch all tourism-related data from OSM for Sri Lanka
2. Convert to GeoJSON
3. Save a backup GeoJSON file to `output/`
4. Store processed data in MongoDB
5. Display statistics

### Fetch Data Only (without MongoDB)

```bash
# Build and run
npm run fetch

# Development mode
npm run fetch:dev
```

This will fetch data and save it to GeoJSON files in the `output/` directory without requiring MongoDB.

### Run Tests

```bash
# Build and run tests
npm test

# Development mode
npm run test:dev
```

### Command Line Options

```bash
# Standard fetch and store
npm start

# Periodic fetching (every 24 hours by default)
node dist/index.js --periodic

# Fetch tourism data only (lighter query)
node dist/index.js --tourism-only
```

## Project Structure

```
osm-mining/
├── src/
│   ├── types.ts          # TypeScript type definitions
│   ├── config.ts         # Configuration and environment variables
│   ├── queryBuilder.ts   # Overpass QL query builder
│   ├── osmFetcher.ts     # OSM data fetcher and GeoJSON converter
│   ├── mongoStorage.ts   # MongoDB storage handler
│   ├── index.ts          # Main entry point
│   ├── fetchOsmData.ts   # Standalone fetch script
│   ├── test.ts           # Test suite
│   └── osmtogeojson.d.ts # Type declarations for osmtogeojson
├── dist/                 # Compiled JavaScript (generated)
├── output/               # Generated GeoJSON files
├── mongo-init/           # MongoDB initialization scripts
│   └── init-db.js        # Creates indexes and app user
├── docker-compose.yml    # Docker Compose for MongoDB
├── tsconfig.json         # TypeScript configuration
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

```typescript
interface ProcessedPlace {
  osm_id: string;
  osm_type: string;
  name: string;
  name_si: string | null;      // Sinhala name
  name_ta: string | null;      // Tamil name
  category: string;
  subcategory: string;
  geometry: GeoJSONGeometry | null;
  location: {                  // For geospatial queries
    type: 'Point';
    coordinates: [number, number];
  } | null;
  tags: Record<string, string>;
  address: {
    street: string | null;
    city: string | null;
    postcode: string | null;
    country: string;
  };
  contact: {
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  opening_hours: string | null;
  wheelchair: string | null;
  description: string | null;
  fetched_at: Date;
  source: string;
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

```typescript
import OsmDataFetcher from './osmFetcher';

const fetcher = new OsmDataFetcher();

// Fetch by category
const geojson = await fetcher.fetchByCategory('tourism');

// Fetch all data
const allData = await fetcher.fetchAllData();

// Process for MongoDB
const processed = fetcher.processForMongoDB(geojson);
```

### MongoDBStorage

```typescript
import MongoDBStorage from './mongoStorage';

const storage = new MongoDBStorage();

await storage.connect();

// Store features
await storage.storeFeatures(processedFeatures);

// Find near location
const nearby = await storage.findNear(80.759, 7.957, 5000);

// Search
const results = await storage.search('beach');

// Get statistics
const stats = await storage.getStats();

await storage.disconnect();
```

## Building

```bash
# Build TypeScript to JavaScript
npm run build

# Clean build output
npm run clean
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
