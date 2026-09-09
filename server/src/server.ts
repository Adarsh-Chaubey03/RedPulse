import dotenv from "dotenv";

dotenv.config();

const app = require("./app").default;
const connectDatabase = require("./config/mongodb").default;
const { startExpirationWorker } = require("./modules/blood-request/expiration.worker");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();

    // Start the periodic expiration sweep (runs every 60 s)
    startExpirationWorker(60_000);

    app.listen(PORT, () => {
      console.log(`RedPulse server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server due to MongoDB connection failure:", error);
    process.exit(1);
  }
};

startServer();