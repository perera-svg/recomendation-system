/**
 * Configuration for OSM Mining
 * Sri Lanka bounding box and tourism tags
 */

require("dotenv").config();

module.exports = {
  // Overpass API endpoint
  overpassApiUrl:
    process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter",

  // Sri Lanka bounding box coordinates
  // Format: [South, West, North, East]
  sriLankaBbox: {
    south: parseFloat(process.env.BBOX_SOUTH) || 5.916,
    west: parseFloat(process.env.BBOX_WEST) || 79.652,
    north: parseFloat(process.env.BBOX_NORTH) || 9.836,
    east: parseFloat(process.env.BBOX_EAST) || 81.879,
  },

  // Tourism tags to fetch from OSM
  tourismTags: [
    "attraction",
    "hotel",
    "museum",
    "viewpoint",
    "guest_house",
    "hostel",
    "motel",
    "camp_site",
    "caravan_site",
    "chalet",
    "alpine_hut",
    "wilderness_hut",
    "information",
    "picnic_site",
    "zoo",
    "theme_park",
    "artwork",
    "gallery",
  ],

  // Additional amenity tags useful for tourism
  amenityTags: [
    "restaurant",
    "cafe",
    "bar",
    "fast_food",
    "bank",
    "atm",
    "pharmacy",
    "hospital",
    "parking",
    "fuel",
    "bus_station",
    "taxi",
  ],

  // Historic places
  historicTags: [
    "monument",
    "memorial",
    "castle",
    "ruins",
    "archaeological_site",
    "fort",
    "temple",
  ],

  // Natural features
  naturalTags: ["beach", "peak", "waterfall", "hot_spring", "cave_entrance"],

  // Leisure places
  leisureTags: [
    "park",
    "garden",
    "nature_reserve",
    "beach_resort",
    "water_park",
    "swimming_pool",
  ],

  // MongoDB configuration
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017",
    database: process.env.MONGODB_DATABASE || "tourism_db",
    collection: process.env.MONGODB_COLLECTION || "places",
  },

  // Fetch interval in milliseconds
  fetchIntervalMs:
    (parseInt(process.env.FETCH_INTERVAL_HOURS) || 24) * 60 * 60 * 1000,
};
