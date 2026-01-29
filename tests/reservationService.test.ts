import { ReservationService } from "../src/services/ReservationService.js";
import {
  ReservationRepository,
  ReservationFilter
} from "../src/interfaces/ReservationRepository.js";
import { Reservation } from "../src/models/Reservation.js";

class InMemoryReservationRepository implements ReservationRepository {
  private items: Reservation[] = [];

  async createReservation(
    input: Omit<Reservation, "id" | "createdAt" | "updatedAt">
  ): Promise<Reservation> {
    const reservation: Reservation = {
      ...input,
      id: String(this.items.length + 1),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.items.unshift(reservation);
    return reservation;
  }

  async updateReservation(
    id: string,
    input: Partial<Omit<Reservation, "id" | "createdAt" | "updatedAt">>
  ): Promise<Reservation | null> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const updated = {
      ...this.items[index],
      ...input,
      updatedAt: new Date()
    };
    this.items[index] = updated;
    return updated;
  }

  async findReservationById(id: string): Promise<Reservation | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  async listReservations(filter: ReservationFilter): Promise<Reservation[]> {
    const { date, status, mealPeriod, guestEmail, guestPhone } = filter;
    return this.items.filter((item) => {
      if (status && item.status !== status) return false;
      if (mealPeriod && item.mealPeriod !== mealPeriod) return false;
      if (date && !item.expectedArrivalTime.startsWith(date)) return false;
      if (guestEmail && guestPhone) {
        if (item.guestEmail !== guestEmail && item.guestPhone !== guestPhone) {
          return false;
        }
      } else if (guestEmail && item.guestEmail !== guestEmail) {
        return false;
      } else if (guestPhone && item.guestPhone !== guestPhone) {
        return false;
      }
      return true;
    });
  }

  async findReservationConflict(input: {
    date: string;
    mealPeriod: Reservation["mealPeriod"];
    guestEmail?: string;
    guestPhone?: string;
    excludeId?: string;
  }): Promise<Reservation | null> {
    return (
      this.items.find((item) => {
        if (input.excludeId && item.id === input.excludeId) return false;
        if (!item.expectedArrivalTime.startsWith(input.date)) return false;
        if (item.mealPeriod !== input.mealPeriod) return false;
        if (input.guestEmail && item.guestEmail === input.guestEmail) return true;
        if (input.guestPhone && item.guestPhone === input.guestPhone) return true;
        return false;
      }) || null
    );
  }
}

describe("ReservationService", () => {
  function getFutureDate(daysAhead = 1) {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString().slice(0, 10);
  }

  it("creates a reservation with Requested status", async () => {
    const repository = new InMemoryReservationRepository();
    const service = new ReservationService(repository);
    const date = getFutureDate();

    const reservation = await service.createReservation({
      guestName: "Alice",
      guestPhone: "100861",
      guestEmail: "alice@example.com",
      expectedArrivalTime: `${date} 19:00`,
      mealPeriod: "Dinner",
      tableSize: 4
    });

    expect(reservation.status).toBe("Requested");
    expect(reservation.guestName).toBe("Alice");
  });

  it("updates reservation status", async () => {
    const repository = new InMemoryReservationRepository();
    const service = new ReservationService(repository);
    const date = getFutureDate();

    const created = await service.createReservation({
      guestName: "Bob",
      guestPhone: "100101",
      guestEmail: "bob@example.com",
      expectedArrivalTime: `${date} 20:00`,
      mealPeriod: "Dinner",
      tableSize: 2
    });

    const updated = await service.updateStatus(created.id, "Approved", "employee");

    expect(updated?.status).toBe("Approved");
  });

  it("rejects duplicate meal reservation for same day", async () => {
    const repository = new InMemoryReservationRepository();
    const service = new ReservationService(repository);
    const date = getFutureDate();

    await service.createReservation({
      guestName: "Alice",
      guestPhone: "100861",
      guestEmail: "alice@example.com",
      expectedArrivalTime: `${date} 12:00`,
      mealPeriod: "Lunch",
      tableSize: 2
    });

    await expect(
      service.createReservation({
        guestName: "Alice",
        guestPhone: "100861",
        guestEmail: "alice@example.com",
        expectedArrivalTime: `${date} 13:00`,
        mealPeriod: "Lunch",
        tableSize: 2
      })
    ).rejects.toThrow("Only one reservation per meal period per day is allowed");
  });
});
