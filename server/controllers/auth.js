import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { Router } from 'express';
import { dto, Session, User } from '../models.js';
import { errorHandler, HttpError, respond, unauthorized } from '../http.js';
import { credentials } from '../validation.js';

const ACCESS_SECONDS = 15 * 60;
const REFRESH_SECONDS = 7 * 24 * 60 * 60;
const REFRESH_COOKIE = 'krmu_refresh';
const issuer = 'krmu-campus';
const dummyHash = bcrypt.hashSync(randomUUID(), 12);
const digest = value => createHash('sha256').update(value).digest('hex');
const expiry = seconds => new Date(Date.now() + seconds * 1000);

function verify(token, secret, type) {
  if (!token) throw unauthorized();
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience: type });
    if (!decoded || !/^[a-f\d]{24}$/i.test(decoded.sub) || !/^[a-f\d]{24}$/i.test(decoded.sid)) throw unauthorized();
    return decoded;
  } catch {
    throw unauthorized();
  }
}

function sign(userId, sessionId, secret, type, expiresIn) {
  return jwt.sign({ sid: String(sessionId) }, secret, {
    algorithm: 'HS256', audience: type, issuer, subject: String(userId), expiresIn, jwtid: randomUUID(),
  });
}

export function authController(config, events, logger) {
  const router = Router();
  const cookie = { httpOnly: true, secure: config.production, sameSite: 'strict', path: '/api/auth' };
  const rateLimiter = (limit, message) => rateLimit({
    windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (req, res, next) => errorHandler(logger)(new HttpError(429, 'RATE_LIMITED', message), req, res, next),
  });
  const limitLogin = rateLimiter(25, 'Too many login attempts. Try again later.');
  const limitRefresh = rateLimiter(100, 'Too many session requests. Try again later.');

  async function identity(token) {
    const claims = verify(token, config.accessSecret, 'access');
    const [user, active] = await Promise.all([
      User.findById(claims.sub).lean(),
      Session.exists({ _id: claims.sid, userId: claims.sub, expiresAt: { $gt: new Date() } }),
    ]);
    if (!user || !active) throw unauthorized();
    return { user, claims };
  }
  const requireIdentity = async (req, _res, next) => {
    const match = req.get('Authorization')?.match(/^Bearer (.+)$/i);
    const { user } = await identity(match?.[1]);
    req.user = user;
    next();
  };
  function sendSession(res, user, session, refresh) {
    res.cookie(REFRESH_COOKIE, refresh, { ...cookie, maxAge: REFRESH_SECONDS * 1000 });
    respond(res, { user: dto(user), accessToken: sign(user._id, session._id, config.accessSecret, 'access', ACCESS_SECONDS) });
  }

  router.post('/login', limitLogin, async (req, res) => {
    const input = credentials.parse(req.body);
    const user = await User.findOne({ email: input.email }).select('+passwordHash').lean();
    const matches = await bcrypt.compare(input.password, user?.passwordHash || dummyHash);
    if (!user || !matches) throw unauthorized();
    const session = new Session({ userId: user._id, expiresAt: expiry(REFRESH_SECONDS) });
    const refresh = sign(user._id, session._id, config.refreshSecret, 'refresh', REFRESH_SECONDS);
    session.refreshDigest = digest(refresh);
    await session.save();
    sendSession(res, user, session, refresh);
  });

  router.post('/refresh', limitRefresh, async (req, res) => {
    const token = req.cookies[REFRESH_COOKIE];
    const claims = verify(token, config.refreshSecret, 'refresh');
    const user = await User.findById(claims.sub).lean();
    if (!user) throw unauthorized();
    const refresh = sign(claims.sub, claims.sid, config.refreshSecret, 'refresh', REFRESH_SECONDS);
    const session = await Session.findOneAndUpdate(
      { _id: claims.sid, userId: claims.sub, refreshDigest: digest(token), expiresAt: { $gt: new Date() } },
      { refreshDigest: digest(refresh), expiresAt: expiry(REFRESH_SECONDS) },
      { returnDocument: 'after' },
    ).lean();
    if (!session) throw unauthorized();
    sendSession(res, user, session, refresh);
  });

  router.post('/logout', limitRefresh, async (req, res) => {
    const token = req.cookies[REFRESH_COOKIE];
    let claims;
    try { claims = verify(token, config.refreshSecret, 'refresh'); } catch (error) {
      if (error.status !== 401) throw error;
    }
    if (claims) {
      const result = await Session.deleteOne({ _id: claims.sid, userId: claims.sub, refreshDigest: digest(token) });
      if (result.deletedCount) events.emit('session.revoked', claims.sid);
    }
    res.clearCookie(REFRESH_COOKIE, cookie);
    res.status(204).end();
  });

  return { router, requireIdentity, identity };
}
