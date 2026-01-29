import { Reservation } from "../models/Reservation.js";
import {
  ReservationFilter,
  ReservationRepository
} from "../interfaces/ReservationRepository.js";
import { ReservationModel } from "../db/models.js";

function toReservation(doc: any): Reservation {
  return {
    id: doc._id.toString(),
    guestName: doc.guestName,
    guestPhone: doc.guestPhone,
    guestEmail: doc.guestEmail,
    expectedArrivalTime: doc.expectedArrivalTime,
    mealPeriod: doc.mealPeriod,
    tableSize: doc.tableSize,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

export class MongooseReservationRepository implements ReservationRepository {
  async createReservation(
    input: Omit<Reservation, "id" | "createdAt" | "updatedAt">
  ): Promise<Reservation> {
    const doc = await ReservationModel.create(input);
    return toReservation(doc);
  }

  async updateReservation(
    id: string,
    input: Partial<Omit<Reservation, "id" | "createdAt" | "updatedAt">>
  ): Promise<Reservation | null> {
    const doc = await ReservationModel.findByIdAndUpdate(id, input, {
      new: true
    });
    return doc ? toReservation(doc) : null;
  }

  async findReservationById(id: string): Promise<Reservation | null> {
    const doc = await ReservationModel.findById(id);
    return doc ? toReservation(doc) : null;
  }

  async listReservations(filter: ReservationFilter): Promise<Reservation[]> {
    const query: Record<string, unknown> = {};
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.date) {
      query.expectedArrivalTime = { $regex: `^${filter.date}` };
    }

    const docs = await ReservationModel.find(query).sort({
      expectedArrivalTime: -1
    });
    return docs.map(toReservation);
  }

  async findReservationConflict(input: {
    date: string;
    mealPeriod: Reservation["mealPeriod"];
    guestEmail?: string;
    guestPhone?: string;
    excludeId?: string;
  }): Promise<Reservation | null> {
    const query: Record<string, unknown> = {
      mealPeriod: input.mealPeriod,
      expectedArrivalTime: { $regex: `^${input.date}` }
    };

    const orConditions: Record<string, string>[] = [];
    if (input.guestEmail) {
      orConditions.push({ guestEmail: input.guestEmail });
    }
    if (input.guestPhone) {
      orConditions.push({ guestPhone: input.guestPhone });
    }
    if (orConditions.length > 0) {
      query.$or = orConditions;
    }
    if (input.excludeId) {
      query._id = { $ne: input.excludeId };
    }

    const doc = await ReservationModel.findOne(query);
    return doc ? toReservation(doc) : null;
  }
}
