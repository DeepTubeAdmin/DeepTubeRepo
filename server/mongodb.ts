/**
 * MongoDB Connection Utilities
 * 
 * This module handles the connection to MongoDB for future database migration.
 */

import { MongoClient } from 'mongodb';

// Instance of MongoDB client
let client: MongoClient | null = null;

/**
 * Connect to MongoDB
 * @returns MongoDB client instance
 */
export async function connectToMongoDB(): Promise<MongoClient> {
  // If already connected, return the existing client
  if (client) {
    return client;
  }

  // Check if the MongoDB URI is available in environment
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    // Create a new client and connect
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('Successfully connected to MongoDB');
    return client;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Get MongoDB database instance
 * @returns MongoDB database instance
 */
export async function getDb() {
  const client = await connectToMongoDB();
  return client.db();
}

/**
 * Close MongoDB connection when shutting down
 */
export async function closeMongoDB() {
  if (client) {
    await client.close();
    client = null;
    console.log('MongoDB connection closed');
  }
}

// Export default object with all functions
export default {
  connectToMongoDB,
  getDb,
  closeMongoDB
};
