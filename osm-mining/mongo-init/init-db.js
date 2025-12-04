// MongoDB initialization script
// This runs when the container is first created

db = db.getSiblingDB("tourism_db");

// Create the places collection with validation
db.createCollection("places", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["osm_id", "name", "category"],
      properties: {
        osm_id: {
          bsonType: "string",
          description: "OSM ID is required",
        },
        name: {
          bsonType: "string",
          description: "Name is required",
        },
        category: {
          bsonType: "string",
          description: "Category is required",
        },
      },
    },
  },
});

// Create indexes
db.places.createIndex({ location: "2dsphere" });
db.places.createIndex({
  name: "text",
  "tags.name": "text",
  "tags.description": "text",
});
db.places.createIndex({ category: 1 });
db.places.createIndex({ subcategory: 1 });
db.places.createIndex({ osm_id: 1 }, { unique: true });
db.places.createIndex({ fetched_at: 1 });

// Create a read/write user for the application
db.createUser({
  user: "osm_app",
  pwd: "osm_password123",
  roles: [{ role: "readWrite", db: "tourism_db" }],
});

print("Database initialized successfully!");
