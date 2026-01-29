import mongoose, { Schema } from "mongoose";

const ReservationSchema = new Schema(
  {
    guestName: { type: String, required: true },
    guestPhone: { type: String, required: true },
    guestEmail: { type: String, required: true },
    expectedArrivalTime: { type: String, required: true },
    mealPeriod: { type: String, enum: ["Lunch", "Dinner"], required: true },
    tableSize: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Requested", "Approved", "Cancelled", "Completed"],
      required: true
    }
  },
  { timestamps: true }
);

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ["guest", "employee"], required: true },
  passwordHash: { type: String, required: true }
});

export const ReservationModel =
  mongoose.models.Reservation ||
  mongoose.model("Reservation", ReservationSchema);

export const UserModel =
  mongoose.models.User || mongoose.model("User", UserSchema);
