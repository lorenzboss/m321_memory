import bcrypt from "bcrypt";
import { query } from "../db";
import { User } from "../types";

const SALT_ROUNDS = 10;

export class AuthService {
  async register(username: string, password: string): Promise<User> {
    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error(
        "Username can only contain letters, numbers, and underscores"
      );
    }

    if (username.length < 3 || username.length > 10) {
      throw new Error("Username must be between 3 and 10 characters");
    }

    // Check if user exists
    const existingUsers = await query<User>(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (existingUsers.length > 0) {
      throw new Error("Username already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await query<User>(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *",
      [username, passwordHash]
    );

    return result[0];
  }

  async login(username: string, password: string): Promise<User | null> {
    const users = await query<User>("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return null;
    }

    return user;
  }

  async getUserById(id: number): Promise<User | null> {
    const users = await query<User>("SELECT * FROM users WHERE id = $1", [id]);
    return users.length > 0 ? users[0] : null;
  }
}

export const authService = new AuthService();
