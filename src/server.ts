import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { MongooseReservationRepository } from "./repositories/ReservationRepository.js";
import { MongooseUserRepository } from "./repositories/UserRepository.js";
import { ReservationService } from "./services/ReservationService.js";
import { AuthService } from "./services/AuthService.js";
import { buildAuthRoutes } from "./routes/authRoutes.js";
import { buildSchema } from "./graphql/schema.js";
import { authOptional } from "./middleware/auth.js";

async function start() {
  await connectDatabase();

  const app = express();
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
  app.use(cors());
  app.use(express.json());
  app.use(express.static("public"));

  const userRepository = new MongooseUserRepository();
  const reservationRepository = new MongooseReservationRepository();
  const authService = new AuthService(userRepository);
  const reservationService = new ReservationService(reservationRepository);

  app.use("/auth", buildAuthRoutes(authService, userRepository));

  const { typeDefs, resolvers } = buildSchema(reservationService, userRepository);
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers
  });
  await apolloServer.start();

  app.use(
    "/graphql",
    authOptional,
    expressMiddleware(apolloServer, {
      context: async ({ req }) => ({ req })
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error", error);
    res.status(500).json({ message: "Internal Server Error" });
  });

  app.listen(env.port, () => {
    console.log(`Backend running on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
