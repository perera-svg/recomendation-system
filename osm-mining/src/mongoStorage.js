/**
 * MongoDB Storage Handler
 * Handles storing GeoJSON data in MongoDB with geospatial indexing
 */

const { MongoClient } = require("mongodb");
const config = require("./config");

class MongoDBStorage {
  /**
   * Create a new MongoDB storage handler
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.uri = options.uri || config.mongodb.uri;
    this.databaseName = options.database || config.mongodb.database;
    this.collectionName = options.collection || config.mongodb.collection;
    this.client = null;
    this.db = null;
    this.collection = null;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      console.log("Connecting to MongoDB...");
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db(this.databaseName);
      this.collection = this.db.collection(this.collectionName);
      console.log(
        `Connected to MongoDB: ${this.databaseName}/${this.collectionName}`
      );

      // Create geospatial index
      await this.createIndexes();
    } catch (error) {
      console.error("Error connecting to MongoDB:", error.message);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log("Disconnected from MongoDB");
    }
  }

  /**
   * Create necessary indexes for efficient querying
   */
  async createIndexes() {
    try {
      console.log("Creating indexes...");

      // 2dsphere index for geospatial queries
      await this.collection.createIndex({ location: "2dsphere" });

      // Text index for search
      await this.collection.createIndex({
        name: "text",
        "tags.name": "text",
        "tags.description": "text",
      });

      // Other useful indexes
      await this.collection.createIndex({ category: 1 });
      await this.collection.createIndex({ subcategory: 1 });
      await this.collection.createIndex({ osm_id: 1 }, { unique: true });

      console.log("Indexes created successfully");
    } catch (error) {
      console.error("Error creating indexes:", error.message);
    }
  }

  /**
   * Store processed features in MongoDB
   * @param {Array} features - Array of processed features
   * @returns {Object} Result with counts of inserted and updated documents
   */
  async storeFeatures(features) {
    const results = {
      inserted: 0,
      updated: 0,
      errors: 0,
    };

    console.log(`Storing ${features.length} features in MongoDB...`);

    for (const feature of features) {
      try {
        // Upsert - update if exists, insert if new
        const result = await this.collection.updateOne(
          { osm_id: feature.osm_id },
          {
            $set: feature,
            $setOnInsert: { created_at: new Date() },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          results.inserted++;
        } else if (result.modifiedCount > 0) {
          results.updated++;
        }
      } catch (error) {
        console.error(
          `Error storing feature ${feature.osm_id}:`,
          error.message
        );
        results.errors++;
      }
    }

    console.log(
      `Storage complete: ${results.inserted} inserted, ${results.updated} updated, ${results.errors} errors`
    );
    return results;
  }

  /**
   * Find places near a location
   * @param {number} longitude - Longitude
   * @param {number} latitude - Latitude
   * @param {number} maxDistance - Maximum distance in meters
   * @param {Object} filter - Additional filter criteria
   * @returns {Promise<Array>} Array of nearby places
   */
  async findNear(longitude, latitude, maxDistance = 5000, filter = {}) {
    const query = {
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistance,
        },
      },
      ...filter,
    };

    return this.collection.find(query).toArray();
  }

  /**
   * Find places by category
   * @param {string} category - Category name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of places
   */
  async findByCategory(category, options = {}) {
    const query = { category: category };
    const cursor = this.collection.find(query);

    if (options.limit) {
      cursor.limit(options.limit);
    }

    if (options.skip) {
      cursor.skip(options.skip);
    }

    return cursor.toArray();
  }

  /**
   * Search places by text
   * @param {string} searchText - Text to search for
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching places
   */
  async search(searchText, options = {}) {
    const query = { $text: { $search: searchText } };

    if (options.category) {
      query.category = options.category;
    }

    const cursor = this.collection
      .find(query, {
        projection: { score: { $meta: "textScore" } },
      })
      .sort({ score: { $meta: "textScore" } });

    if (options.limit) {
      cursor.limit(options.limit);
    }

    return cursor.toArray();
  }

  /**
   * Get statistics about stored data
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    const totalCount = await this.collection.countDocuments();

    const categoryCounts = await this.collection
      .aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const subcategoryCounts = await this.collection
      .aggregate([
        { $group: { _id: "$subcategory", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    return {
      total: totalCount,
      byCategory: categoryCounts,
      topSubcategories: subcategoryCounts,
    };
  }

  /**
   * Delete all documents from the collection
   */
  async clearCollection() {
    const result = await this.collection.deleteMany({});
    console.log(`Deleted ${result.deletedCount} documents from collection`);
    return result.deletedCount;
  }

  /**
   * Export all data as GeoJSON
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async exportAsGeoJSON() {
    const documents = await this.collection.find({}).toArray();

    const features = documents.map((doc) => ({
      type: "Feature",
      id: doc.osm_id,
      properties: {
        name: doc.name,
        category: doc.category,
        subcategory: doc.subcategory,
        tags: doc.tags,
        address: doc.address,
        contact: doc.contact,
      },
      geometry: doc.geometry || doc.location,
    }));

    return {
      type: "FeatureCollection",
      features: features,
    };
  }
}

module.exports = MongoDBStorage;
