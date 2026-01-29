import { Reservation, ReservationStatus } from "../models/Reservation.js";

export interface ReservationFilter {
  date?: string;
  status?: ReservationStatus;
  mealPeriod?: Reservation["mealPeriod"];
  guestEmail?: string;
  guestPhone?: string;
}

export interface ReservationRepository {
  createReservation(
    input: Omit<Reservation, "id" | "createdAt" | "updatedAt">
  ): Promise<Reservation>;
  updateReservation(
    id: string,
    input: Partial<Omit<Reservation, "id" | "createdAt" | "updatedAt">>
  ): Promise<Reservation | null>;
  findReservationById(id: string): Promise<Reservation | null>;
  listReservations(filter: ReservationFilter): Promise<Reservation[]>;
  findReservationConflict(input: {
    date: string;
    mealPeriod: Reservation["mealPeriod"];
    guestEmail?: string;
    guestPhone?: string;
    excludeId?: string;
  }): Promise<Reservation | null>;
}
