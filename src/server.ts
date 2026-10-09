import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB } from "./config/db";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (error) {
      console.error("MongoDB connection failed; starting demo API without persistence:", error);
    }
  } else {
    console.log("MONGODB_URI is not set; starting with in-memory demo data.");
  }
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
};

void startServer();
