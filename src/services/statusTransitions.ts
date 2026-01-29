import { ReservationStatus } from "../models/Reservation.js";
import { UserRole } from "../models/User.js";

const terminalStatuses: ReservationStatus[] = ["Cancelled", "Completed"];

export function assertEditable(status: ReservationStatus): void {
  if (terminalStatuses.includes(status)) {
    throw new Error("Completed or cancelled reservations cannot be modified");
  }
}

export function assertStatusChange(
  currentStatus: ReservationStatus,
  nextStatus: ReservationStatus,
  actorRole: UserRole
): void {
  if (actorRole !== "employee") {
    throw new Error("Employee role required");
  }
  assertEditable(currentStatus);
  if (nextStatus === "Completed" && currentStatus !== "Approved") {
    throw new Error("Reservation must be approved before completing");
  }
}

export function assertCancellable(
  status: ReservationStatus,
  actorRole: UserRole
): void {
  if (actorRole !== "employee" && actorRole !== "guest") {
    throw new Error("Login required");
  }
  if (status === "Cancelled") {
    throw new Error("Reservation is already cancelled");
  }
  if (status === "Completed") {
    throw new Error("Completed reservations cannot be cancelled");
  }
}
