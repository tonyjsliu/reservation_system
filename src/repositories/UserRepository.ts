import { User } from "../models/User.js";
import { UserRepository } from "../interfaces/UserRepository.js";
import { UserModel } from "../db/models.js";

function toUser(doc: any): User {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    role: doc.role,
    passwordHash: doc.passwordHash
  };
}

export class MongooseUserRepository implements UserRepository {
  async createUser(input: Omit<User, "id">): Promise<User> {
    const doc = await UserModel.create(input);
    return toUser(doc);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email });
    return doc ? toUser(doc) : null;
  }

  async findUserByPhone(phone: string): Promise<User | null> {
    const doc = await UserModel.findOne({ phone });
    return doc ? toUser(doc) : null;
  }

  async findUserById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id);
    return doc ? toUser(doc) : null;
  }
}
