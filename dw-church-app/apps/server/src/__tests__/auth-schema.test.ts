import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteSchema,
  changePasswordSchema,
} from '../modules/auth/schema.js';

describe('loginSchema', () => {
  it('should accept valid login input', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'mypassword',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing email', () => {
    const result = loginSchema.safeParse({ password: 'mypassword' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'mypassword',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validInput = {
    churchName: 'Grace Church',
    slug: 'grace-church',
    email: 'admin@grace.church',
    password: 'securepass123',
    ownerName: 'John Doe',
  };

  it('should accept valid registration input', () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject empty churchName', () => {
    const result = registerSchema.safeParse({ ...validInput, churchName: '' });
    expect(result.success).toBe(false);
  });

  it('should reject slug shorter than 3 characters', () => {
    const result = registerSchema.safeParse({ ...validInput, slug: 'ab' });
    expect(result.success).toBe(false);
  });

  it('should reject slug with uppercase letters', () => {
    const result = registerSchema.safeParse({ ...validInput, slug: 'Grace-Church' });
    expect(result.success).toBe(false);
  });

  it('should reject slug with special characters', () => {
    const result = registerSchema.safeParse({ ...validInput, slug: 'grace@church' });
    expect(result.success).toBe(false);
  });

  it('should reject slug starting with hyphen', () => {
    const result = registerSchema.safeParse({ ...validInput, slug: '-grace' });
    expect(result.success).toBe(false);
  });

  it('should reject slug ending with hyphen', () => {
    const result = registerSchema.safeParse({ ...validInput, slug: 'grace-' });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'short' });
    expect(result.success).toBe(false);
  });

  it('should reject password longer than 128 characters', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'a'.repeat(129) });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = registerSchema.safeParse({ ...validInput, email: 'bad' });
    expect(result.success).toBe(false);
  });

  it('should reject empty ownerName', () => {
    const result = registerSchema.safeParse({ ...validInput, ownerName: '' });
    expect(result.success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('should accept valid name update', () => {
    const result = updateProfileSchema.safeParse({ name: 'Jane Doe' });
    expect(result.success).toBe(true);
  });

  it('should accept valid email update', () => {
    const result = updateProfileSchema.safeParse({ email: 'new@example.com' });
    expect(result.success).toBe(true);
  });

  it('should accept both name and email', () => {
    const result = updateProfileSchema.safeParse({
      name: 'Jane',
      email: 'jane@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty object (all fields optional)', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = updateProfileSchema.safeParse({ email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('should reject empty name string', () => {
    const result = updateProfileSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('should accept valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@test.com' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('should accept valid password', () => {
    const result = resetPasswordSchema.safeParse({ password: 'newpass123' });
    expect(result.success).toBe(true);
  });

  it('should reject short password', () => {
    const result = resetPasswordSchema.safeParse({ password: 'short' });
    expect(result.success).toBe(false);
  });
});

describe('inviteSchema', () => {
  it('should accept valid invite', () => {
    const result = inviteSchema.safeParse({
      email: 'member@church.com',
      name: 'New Member',
      role: 'member',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all valid roles', () => {
    for (const role of ['admin', 'editor', 'member']) {
      const result = inviteSchema.safeParse({
        email: 'a@b.com',
        name: 'X',
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid role', () => {
    const result = inviteSchema.safeParse({
      email: 'a@b.com',
      name: 'X',
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('should accept valid password change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: 'newsecure1',
    });
    expect(result.success).toBe(true);
  });

  it('should reject short new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: 'short',
    });
    expect(result.success).toBe(false);
  });
});
