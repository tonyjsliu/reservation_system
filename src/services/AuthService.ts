import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { UserRepository } from "../interfaces/UserRepository.js";

export class AuthService {
  constructor(private readonly repository: UserRepository) {}

  async register(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: "guest" | "employee";
  }): Promise<User> {
    validateEmail(input.email);
    validatePhone(input.phone);
    const existingEmail = await this.repository.findUserByEmail(input.email);
    if (existingEmail) {
      throw new Error("Email already registered");
    }

    const existingPhone = await this.repository.findUserByPhone(input.phone);
    if (existingPhone) {
      throw new Error("Phone already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.repository.createUser({
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      passwordHash
    });
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: User }> {
    const user = await this.repository.findUserByEmail(input.email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      env.jwtSecret,
      { expiresIn: "1h" }
    );

    return { token, user };
  }
}

function validateEmail(email: string): void {
  const normalized = email.trim();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(normalized)) {
    throw new Error("Invalid email format");
  }
}

function validatePhone(phone: string): void {
  const normalized = phone.trim();
  const regex = /^[0-9]{6,20}$/;
  if (!regex.test(normalized)) {
    throw new Error("Invalid phone format");
  }
}
