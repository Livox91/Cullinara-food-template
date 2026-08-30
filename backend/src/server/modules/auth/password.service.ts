import "server-only";
import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
  outputLen: 32,
} as const;

export const passwordService = {
  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  },

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  },
};
