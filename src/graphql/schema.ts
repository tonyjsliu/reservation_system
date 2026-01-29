import { ReservationService } from "../services/ReservationService.js";
import { UserRepository } from "../interfaces/UserRepository.js";
import { MealPeriod, ReservationStatus } from "../models/Reservation.js";
import { AuthRequest } from "../middleware/auth.js";

export interface GraphqlContext {
  req: AuthRequest;
}

export function buildSchema(
  reservationService: ReservationService,
  userRepository: UserRepository
) {
  const typeDefs = `
    enum MealPeriod {
      Lunch
      Dinner
    }

    enum ReservationStatus {
      Requested
      Approved
      Cancelled
      Completed
    }

    type Reservation {
      id: ID!
      guestName: String!
      guestPhone: String!
      guestEmail: String!
      expectedArrivalTime: String!
      mealPeriod: MealPeriod!
      tableSize: Int!
      status: ReservationStatus!
      createdAt: String!
      updatedAt: String!
    }

    input ReservationInput {
      guestName: String!
      guestPhone: String!
      guestEmail: String!
      expectedArrivalTime: String!
      mealPeriod: MealPeriod!
      tableSize: Int!
    }

    input ReservationUpdateInput {
      guestName: String
      guestPhone: String
      guestEmail: String
      expectedArrivalTime: String
      mealPeriod: MealPeriod
      tableSize: Int
    }

    type Query {
      reservation(id: ID!): Reservation
      reservations(date: String, status: ReservationStatus): [Reservation!]!
      myReservations: [Reservation!]!
    }

    type Mutation {
      createReservation(input: ReservationInput!): Reservation!
      updateReservation(id: ID!, input: ReservationUpdateInput!): Reservation
      cancelReservation(id: ID!): Reservation
      updateReservationStatus(id: ID!, status: ReservationStatus!): Reservation
    }
  `;

  const resolvers = {
    Query: {
      reservation: async (_: unknown, args: { id: string }) => {
        return reservationService.getReservation(args.id);
      },
      reservations: async (
        _: unknown,
        args: { date?: string; status?: ReservationStatus },
        context: GraphqlContext
      ) => {
        if (!context.req.user || context.req.user.role !== "employee") {
          throw new Error("Employee role required");
        }
        return reservationService.listReservations(args);
      },
      myReservations: async (_: unknown, __: unknown, context: GraphqlContext) => {
        if (!context.req.user || context.req.user.role !== "guest") {
          throw new Error("Guest role required");
        }
        const user = await userRepository.findUserById(context.req.user.id);
        if (!user) {
          throw new Error("User not found");
        }
        return reservationService.listReservationsForGuest({
          guestEmail: user.email,
          guestPhone: user.phone
        });
      }
    },
    Mutation: {
      createReservation: async (
        _: unknown,
        args: { input: ReservationInput }
      ) => {
        return reservationService.createReservation(args.input);
      },
      updateReservation: async (
        _: unknown,
        args: { id: string; input: ReservationUpdateInput },
        context: GraphqlContext
      ) => {
        if (!context.req.user) {
          throw new Error("Login required");
        }
        return reservationService.updateReservation(args.id, args.input);
      },
      cancelReservation: async (
        _: unknown,
        args: { id: string },
        context: GraphqlContext
      ) => {
        if (!context.req.user) {
          throw new Error("Login required");
        }
        return reservationService.cancelReservation(args.id, context.req.user.role);
      },
      updateReservationStatus: async (
        _: unknown,
        args: { id: string; status: ReservationStatus },
        context: GraphqlContext
      ) => {
        if (!context.req.user || context.req.user.role !== "employee") {
          throw new Error("Employee role required");
        }
        return reservationService.updateStatus(
          args.id,
          args.status,
          context.req.user.role
        );
      }
    }
  };

  return { typeDefs, resolvers };
}

type ReservationInput = {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  expectedArrivalTime: string;
  mealPeriod: MealPeriod;
  tableSize: number;
};

type ReservationUpdateInput = Partial<ReservationInput>;
