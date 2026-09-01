import mongoose from "mongoose";

const getMongoDbUri = (): string => {
  const mongoDbUri = process.env.MONGODB_URI;

  if (!mongoDbUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  return mongoDbUri;
};

export const connectDatabase = async (): Promise<typeof mongoose> => {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error);
  });

  try {
    const connection = await mongoose.connect(getMongoDbUri(), {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB connected successfully: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
};

export default connectDatabase;
