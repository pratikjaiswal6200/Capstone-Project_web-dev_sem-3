import { randomUUID } from 'node:crypto';
import { ZodError, z } from 'zod';
import { dto } from './models.js';

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const notFound = () => new HttpError(404, 'NOT_FOUND', 'Campus record not found.');
export const forbidden = () => new HttpError(403, 'FORBIDDEN', 'This action is unavailable for your account.');
export const conflict = message => new HttpError(409, 'CONFLICT', message);
export const badInput = message => new HttpError(400, 'VALIDATION_ERROR', message);
export const unauthorized = () => new HttpError(401, 'UNAUTHORIZED', 'Sign in to continue.');

export function requestLog(logger) {
  return (req, res, next) => {
    const requestId = randomUUID();
    const started = performance.now();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => logger.info?.({ requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(performance.now() - started) }));
    next();
  };
}
export function errorHandler(logger) {
  return (error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.issues.map(issue => `${issue.path.join('.') || 'request'}: ${issue.message}`).join('; '), requestId: req.requestId } });
    }
    if (error.code === 11000) error = conflict('A matching campus record already exists.');
    if (error.name === 'ValidationError' || error.name === 'CastError') error = badInput('A campus field has an invalid value.');
    if (error.type === 'entity.parse.failed') error = badInput('Send a valid JSON request body.');
    if (error.type === 'entity.too.large') error = new HttpError(413, 'BODY_TOO_LARGE', 'The request body is too large.');
    if (!(error instanceof HttpError)) {
      logger.error?.({ requestId: req.requestId, name: error.name, message: error.message });
      error = new HttpError(500, 'INTERNAL_ERROR', 'The campus request could not be completed.');
    }
    res.status(error.status).json({ error: { code: error.code, message: error.message, requestId: req.requestId } });
  };
}

export function secureOrigin(config) {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.headers.origin;
    if ((origin && !config.allowedOrigins.has(origin)) || req.get('Sec-Fetch-Site') === 'cross-site') return next(forbidden());
    next();
  };
}

export const respond = (res, data, status = 200) => res.status(status).json({ data });
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB ObjectId.');
export const routeId = req => objectId.parse(req.params.id);
export const only = (...roles) => (req, _res, next) => roles.includes(req.user.role) ? next() : next(forbidden());
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  role: z.enum(['admin', 'faculty', 'student']).optional(),
  courseId: objectId.optional(),
  sectionId: objectId.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  audience: z.enum(['university', 'section', 'course']).optional(),
}).strict();
export const safeRegex = text => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

export async function paginated(Model, query, filters, sort, serialize = dto) {
  const conditions = { ...filters };
  const [items, total] = await Promise.all([
    Model.find(conditions).sort({ ...sort, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Model.countDocuments(conditions),
  ]);
  return { items: items.map(serialize), total, page: query.page, limit: query.limit };
}

export function serializeWrites() {
  let pending = Promise.resolve();
  return handler => (req, res, next) => {
    const operation = pending.then(() => handler(req, res));
    pending = operation.catch(() => {});
    operation.catch(next);
  };
}
