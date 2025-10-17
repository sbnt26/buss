import bcrypt from 'bcrypt';
import { config } from './config';

/**
 * Hash password using bcrypt (server-side only)
 */
export async function hashPassword(password: string): Promise<string> {
  const rounds = config.auth.bcryptRounds;
  return bcrypt.hash(password, rounds);
}

/**
 * Verify password against hash (server-side only)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
