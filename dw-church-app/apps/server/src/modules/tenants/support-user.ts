import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../../config/database.js';

const BCRYPT_ROUNDS = 12;
const PASSWORD_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Email address of the per-tenant support user.
 * Pattern: support-{slug}@truelight.app — system-owned, no mail delivery.
 */
export function supportEmailFor(slug: string): string {
  return `support-${slug}@truelight.app`;
}

/**
 * Create the support user for a tenant if it doesn't already exist.
 * Password is set to a random unguessable value with no TTL — login is only
 * possible after the super admin calls `rotateSupportPassword` to mint a
 * 24-hour credential.
 */
export async function ensureSupportUser(tenantId: string, slug: string): Promise<void> {
  const email = supportEmailFor(slug);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const placeholderPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(placeholderPassword, BCRYPT_ROUNDS);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: `${slug} Support`,
      role: 'support',
      tenantId,
      tenantSlug: slug,
      // Expired at the epoch → login rejected until rotation mints a live credential.
      passwordExpiresAt: new Date(0),
    },
  });
}

/**
 * Rotate the support user's password. Generates a fresh random password,
 * stores only its hash, and sets a 24h expiry. Returns the plaintext once —
 * caller (super admin endpoint) must display it immediately; there is no way
 * to retrieve it again.
 */
export async function rotateSupportPassword(slug: string): Promise<{
  email: string;
  password: string;
  expiresAt: Date;
}> {
  const email = supportEmailFor(slug);
  const password = generateReadablePassword();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + PASSWORD_TTL_MS);

  await prisma.user.update({
    where: { email },
    data: { passwordHash, passwordExpiresAt: expiresAt, isActive: true },
  });

  return { email, password, expiresAt };
}

/**
 * Human-copyable password — 16 chars from an unambiguous alphabet
 * (no 0/O/1/l/I) so a super admin can read it off the screen.
 */
function generateReadablePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}
