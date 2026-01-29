import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://mongo:27017/hilton",
  jwtSecret: process.env.JWT_SECRET || "jwt-secret-key"
};
