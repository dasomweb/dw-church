import jwt from 'jsonwebtoken';
import { env } from './env.js';

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h';
const REFRESH_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
