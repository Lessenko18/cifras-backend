import mongoose from "mongoose";

let cachedConnectionPromise = null;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnectionPromise) {
    return cachedConnectionPromise;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurada");
  }

  cachedConnectionPromise = mongoose
    .connect(databaseUrl, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 15000,
      maxPoolSize: 10,
    })
    .catch((error) => {
      cachedConnectionPromise = null;
      throw error;
    });

  return cachedConnectionPromise;
}

export default connectDatabase;
