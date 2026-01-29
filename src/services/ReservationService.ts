import {
  MealPeriod,
  Reservation,
  ReservationStatus
} from "../models/Reservation.js";
import {
  ReservationFilter,
  ReservationRepository
} from "../interfaces/ReservationRepository.js";
import {
  assertCancellable,
  assertEditable,
  assertStatusChange
} from "./statusTransitions.js";

export class ReservationService {
  constructor(private readonly repository: ReservationRepository) {}

  async createReservation(input: {
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    expectedArrivalTime: string;
    mealPeriod: MealPeriod;
    tableSize: number;
  }): Promise<Reservation> {
    validateContact(input.guestEmail, input.guestPhone);
    validateArrivalTime(input.expectedArrivalTime, input.mealPeriod);
    if (
      !Number.isFinite(input.tableSize) ||
      input.tableSize <= 0 ||
      input.tableSize > 10
    ) {
      throw new Error("Party size must be between 1 and 10");
    }
    const date = extractDate(input.expectedArrivalTime);
    const conflict = await this.repository.findReservationConflict({
      date,
      mealPeriod: input.mealPeriod,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone
    });
    if (conflict) {
      throw new Error("Only one reservation per meal period per day is allowed");
    }

    const reservation: Omit<Reservation, "id" | "createdAt" | "updatedAt"> = {
      ...input,
      status: "Requested"
    };

    return this.repository.createReservation(reservation);
  }

  async updateReservation(
    id: string,
    input: Partial<{
      guestName: string;
      guestPhone: string;
      guestEmail: string;
      expectedArrivalTime: string;
      mealPeriod: MealPeriod;
      tableSize: number;
    }>
  ): Promise<Reservation | null> {
    const existing = await this.repository.findReservationById(id);
    if (!existing) return null;
    assertEditable(existing.status);

    if (
      input.tableSize !== undefined &&
      (!Number.isFinite(input.tableSize) ||
        input.tableSize <= 0 ||
        input.tableSize > 10)
    ) {
      throw new Error("Party size must be between 1 and 10");
    }

    const nextArrivalTime =
      input.expectedArrivalTime ?? existing.expectedArrivalTime;
    const nextMealPeriod = input.mealPeriod ?? existing.mealPeriod;
    const nextEmail = input.guestEmail ?? existing.guestEmail;
    const nextPhone = input.guestPhone ?? existing.guestPhone;

    validateContact(nextEmail, nextPhone);
    validateArrivalTime(nextArrivalTime, nextMealPeriod);
    const date = extractDate(nextArrivalTime);
    const conflict = await this.repository.findReservationConflict({
      date,
      mealPeriod: nextMealPeriod,
      guestEmail: nextEmail,
      guestPhone: nextPhone,
      excludeId: id
    });
    if (conflict) {
      throw new Error("Only one reservation per meal period per day is allowed");
    }

    return this.repository.updateReservation(id, { ...input, status: "Requested" });
  }

  async cancelReservation(
    id: string,
    actorRole: "guest" | "employee"
  ): Promise<Reservation | null> {
    const existing = await this.repository.findReservationById(id);
    if (!existing) return null;
    assertCancellable(existing.status, actorRole);
    return this.repository.updateReservation(id, { status: "Cancelled" });
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
    actorRole: "guest" | "employee"
  ): Promise<Reservation | null> {
    const existing = await this.repository.findReservationById(id);
    if (!existing) return null;
    assertStatusChange(existing.status, status, actorRole);
    return this.repository.updateReservation(id, { status });
  }

  async listReservations(filter: ReservationFilter): Promise<Reservation[]> {
    return this.repository.listReservations(filter);
  }

  async listReservationsForGuest(input: {
    guestEmail: string;
    guestPhone: string;
  }): Promise<Reservation[]> {
    return this.repository.listReservations({
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone
    });
  }

  async getReservation(id: string): Promise<Reservation | null> {
    return this.repository.findReservationById(id);
  }
}

function extractDate(expectedArrivalTime: string): string {
  const datePart = expectedArrivalTime.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    throw new Error("Date must start with YYYY-MM-DD");
  }
  return datePart;
}

function validateArrivalTime(expectedArrivalTime: string, mealPeriod: MealPeriod) {
  const match = expectedArrivalTime.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/
  );
  if (!match) {
    throw new Error("Arrival time must be in YYYY-MM-DD HH:mm format");
  }
  const [, datePart, timePart] = match;
  const timeRange =
    mealPeriod === "Lunch"
      ? { start: "10:30", end: "14:30" }
      : { start: "17:00", end: "22:00" };
  if (timePart < timeRange.start || timePart > timeRange.end) {
    throw new Error(
      mealPeriod === "Lunch"
        ? "Lunch arrival time must be between 10:30 and 14:30"
        : "Dinner arrival time must be between 17:00 and 22:00"
    );
  }
  const candidate = new Date(`${datePart}T${timePart}:00`);
  if (Number.isNaN(candidate.getTime())) {
    throw new Error("Invalid arrival time format");
  }
  if (candidate.getTime() < Date.now()) {
    throw new Error("Past time is not allowed");
  }
}

function validateContact(email: string, phone: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new Error("Invalid email format");
  }
  const phoneRegex = /^[0-9]{6,20}$/;
  if (!phoneRegex.test(phone.trim())) {
    throw new Error("Invalid phone format");
  }
}
