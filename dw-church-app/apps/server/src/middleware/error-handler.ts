import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { Sentry } from '../config/sentry.js';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, statusCode: number, message: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  request.log.error(error);

  // --- Zod validation error ---
  if (error instanceof ZodError) {
    const body: ErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    };
    void reply.status(400).send(body);
    return;
  }

  // --- Application error ---
  if (error instanceof AppError) {
    const body: ErrorBody = {
      error: { code: error.code, message: error.message },
    };
    void reply.status(error.statusCode).send(body);
    return;
  }

  // --- Prisma known request error ---
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    let status = 500;
    let code = 'DATABASE_ERROR';
    let message = 'A database error occurred';

    switch (error.code) {
      case 'P2002':
        status = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'A record with this value already exists';
        break;
      case 'P2025':
        status = 404;
        code = 'NOT_FOUND';
        message = 'Record not found';
        break;
      case 'P2003':
        status = 400;
        code = 'FOREIGN_KEY_VIOLATION';
        message = 'Referenced record does not exist';
        break;
    }

    if (status >= 500) {
      Sentry.captureException(error);
    }
    const body: ErrorBody = { error: { code, message, details: error.message } };
    void reply.status(status).send(body);
    return;
  }

  // --- Prisma unknown errors ---
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    Sentry.captureException(error);
    const body: ErrorBody = { error: { code: 'DATABASE_ERROR', message: 'A database error occurred', details: error.message } };
    void reply.status(500).send(body);
    return;
  }

  // --- Fastify-level errors (e.g. validation, 404) ---
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    const body: ErrorBody = {
      error: {
        code: (error as FastifyError).code ?? 'REQUEST_ERROR',
        message: error.message,
      },
    };
    void reply.status(error.statusCode).send(body);
    return;
  }

  // --- Fallback ---
  Sentry.captureException(error);
  const body: ErrorBody = {
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  };
  void reply.status(500).send(body);
}
