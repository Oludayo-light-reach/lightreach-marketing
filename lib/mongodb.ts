import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cache;
}

const CONTENTS_COLLECTION = "contents";
const EXTERNAL_ID_PLATFORM_INDEX = "externalId_1_platform_1";

/**
 * Drops legacy unique index on { externalId, platform } if present so duplicate
 * platform ids are allowed (matches Content schema — non-unique sparse index).
 */
async function migrateContentsExternalIdIndexIfNeeded(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;

  try {
    const coll = db.collection(CONTENTS_COLLECTION);
    const indexes = await coll.indexes();
    const existing = indexes.find((i) => i.name === EXTERNAL_ID_PLATFORM_INDEX);
    if (existing && "unique" in existing && existing.unique) {
      await coll.dropIndex(EXTERNAL_ID_PLATFORM_INDEX);
      await coll.createIndex(
        { externalId: 1, platform: 1 },
        { sparse: true, name: EXTERNAL_ID_PLATFORM_INDEX },
      );
    }
  } catch (err) {
    const msg = String(err);
    if (msg.includes("index not found") || msg.includes("ns not found")) return;
    console.warn("[mongodb] migrateContentsExternalIdIndexIfNeeded:", err);
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn(
      "[mongodb] MONGODB_URI is not set. API routes that use the database will fail until it is configured.",
    );
    throw new Error("MONGODB_URI is not defined");
  }

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  cache.conn = await cache.promise;
  await migrateContentsExternalIdIndexIfNeeded();
  return cache.conn;
}
