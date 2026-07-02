import type { NextFunction, Request, Response } from 'express';

const sanitizeString = (value: string): string => {
  return value
    .replace(/<\/?script[^>]*>/gi, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
};

const sanitizeUnknown = (input: unknown): unknown => {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeUnknown(item));
  }

  if (input && typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = sanitizeUnknown(value);
    }

    return result;
  }

  return input;
};

export const sanitizationMiddleware = (request: Request, _response: Response, next: NextFunction): void => {
  request.body = sanitizeUnknown(request.body) as Request['body'];

  const sanitizedQuery = sanitizeUnknown(request.query);
  if (sanitizedQuery && typeof sanitizedQuery === 'object') {
    Object.assign(request.query as Record<string, unknown>, sanitizedQuery as Record<string, unknown>);
  }

  const sanitizedParams = sanitizeUnknown(request.params);
  if (sanitizedParams && typeof sanitizedParams === 'object') {
    Object.assign(request.params as Record<string, unknown>, sanitizedParams as Record<string, unknown>);
  }

  next();
};
