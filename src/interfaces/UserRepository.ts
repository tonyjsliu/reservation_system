import { User } from "../models/User.js";

export interface UserRepository {
  createUser(input: Omit<User, "id">): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserByPhone(phone: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
}
