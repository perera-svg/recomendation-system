/**
 * MongoDB Storage Handler
 * Handles storing GeoJSON data in MongoDB with geospatial indexing
 */

import { MongoClient, Db, Collection, Document, Filter, WithId } from "mongodb";
import config from "./config";
import {
  ExportFeature,
  GeoJSONFeatureCollection,
  ProcessedPlace,
  QueryOptions,
  Statistics,
  StorageOptions,
  StorageResult,
} from "./types";

class MongoDBStorage {
  private uri: string;
  private databaseName: string;
  private collectionName: string;
  private client: MongoClient | null;
  private db: Db | null;
  private collection: Collection<ProcessedPlace> | null;

  /**
   * Create a new MongoDB storage handler
   * @param options - Configuration options
   */
  constructor(options: StorageOptions = {}) {
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
  async connect(): Promise<void> {
    try {
      console.log("Connecting to MongoDB...");
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db(this.databaseName);
      this.collection = this.db.collection<ProcessedPlace>(this.collectionName);
      console.log(
        `Connected to MongoDB: ${this.databaseName}/${this.collectionName}`
      );

      // Create geospatial index
      await this.createIndexes();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error connecting to MongoDB:", errorMessage);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log("Disconnected from MongoDB");
    }
  }

  /**
   * Create necessary indexes for efficient querying
   */
  async createIndexes(): Promise<void> {
    if (!this.collection) throw new Error("Not connected to MongoDB");

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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating indexes:", errorMessage);
    }
  }

  /**
   * Store processed features in MongoDB
   * @param features - Array of processed features
   * @returns Result with counts of inserted and updated documents
   */
  async storeFeatures(features: ProcessedPlace[]): Promise<StorageResult> {
    if (!this.collection) throw new Error("Not connected to MongoDB");

    const results: StorageResult = {
      inserted: 0,
      updated: 0,
      errors: 0,
    };

    console.log(`Storing ${features.length} features in MongoDB...`);

    for (const feature of features) {
      try {
        // Upsert - update if exists, insert if new
        const result = await this.collection.updateOne(
          { osm_id: feature.osm_id } as Filter<ProcessedPlace>,
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
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Error storing feature ${feature.osm_id}:`, errorMessage);
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
   * @param longitude - Longitude
   * @param latitude - Latitude
   * @param maxDistance - Maximum distance in meters
   * @param filter - Additional filter criteria
   * @returns Array of nearby places
   */
  async findNear(
    longitude: number,
    latitude: number,
    maxDistance: number = 5000,
    filter: Filter<ProcessedPlace> = {}
  ): Promise<WithId<ProcessedPlace>[]> {
    if (!this.collection) throw new Error("Not connected to MongoDB");

    const query: Filter<ProcessedPlace> = {
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
   * @param category - Category name
   * @param options - Query options
   * @returns Array of places
   */
  async findByCategory(
    category: string,
    options: QueryOptions = {}
  ): Promise<WithId<ProcessedPlace>[]> {
    if (!this.collection) throw new Error("Not connected to MongoDB");

    const query: Filter<ProcessedPlace> = { category: category };
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
   * @param searchText - Text to search for
   * @param options - Search options
   * @returns Array of matching places
   */
  async search(
    searchText: string,
    options: QueryOptions = {}
  ): Promise<WithId<Document>[]> {
    if (!this.collection) throw new Error("Not connected to MongoDB");

    const query: Filter<ProcessedPlace> = { $text: { $search: searchText } };

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
   * @returns Statistics object
   */
  async getStats(): Promise<Statistics> {
    if (!this.collection) throw new Error("Not connected to MongoDB");

    const totalCount = await this.collection.countDocuments();

    const categoryCounts = await this.collection
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const subcategoryCounts = await this.collection
      .aggregate<{ _id: string; count: number }>([
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
  async clearCollection(): Promise<number> {
    if (!this.collection) throw new Error("Not connected to MongoDB");

    const result = await this.collection.deleteMany({});
    console.log(`Deleted ${result.deletedCount} documents from collection`);
    return result.deletedCount;
  }

  /**
   * Export all data as GeoJSON
   * @returns GeoJSON FeatureCollection
   */
  async exportAsGeoJSON(): Promise<GeoJSONFeatureCollection> {
    if (!this.collection) throw new Error("Not connected to MongoDB");

    const documents = await this.collection.find({}).toArray();

    const features: ExportFeature[] = documents.map((doc) => ({
      type: "Feature" as const,
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
      features: features as GeoJSONFeatureCollection["features"],
    };
  }
}

export default MongoDBStorage;
