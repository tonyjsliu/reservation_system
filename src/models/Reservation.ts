export type ReservationStatus =
  | "Requested"
  | "Approved"
  | "Cancelled"
  | "Completed";

export type MealPeriod = "Lunch" | "Dinner";

export interface Reservation {
  id: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  expectedArrivalTime: string;
  mealPeriod: MealPeriod;
  tableSize: number;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}
