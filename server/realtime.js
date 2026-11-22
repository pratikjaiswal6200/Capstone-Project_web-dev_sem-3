import { Server } from 'socket.io';
import { Session, idOf } from './models.js';
import { noticeRecipients, recalculateAttendanceAudience } from './scope.js';

export function connectRealtime(server, { config, events, identity, logger = console }) {
  const io = new Server(server, {
    serveClient: false,
    allowRequest(req, allow) {
      const origin = req.headers.origin;
      allow(null, !origin || config.allowedOrigins.has(origin));
    },
  });

  io.use(async (socket, pass) => {
    try {
      const { user, claims } = await identity(socket.handshake.auth.token);
      socket.data = { userId: idOf(user), sessionId: claims.sid, expiresAt: claims.exp * 1000 };
      pass();
    } catch {
      pass(new Error('UNAUTHORIZED'));
    }
  });
  io.on('connection', socket => {
    socket.join([`user:${socket.data.userId}`, `session:${socket.data.sessionId}`]);
    const timer = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
    socket.on('disconnect', () => clearTimeout(timer));
  });

  async function notify(event, candidates) {
    if (candidates && !candidates.length) return;
    const sockets = await (candidates ? io.in(candidates.map(id => `user:${id}`)) : io).fetchSockets();
    if (!sockets.length) return;
    const active = new Set((await Session.distinct('_id', {
      _id: { $in: sockets.map(socket => socket.data.sessionId) }, expiresAt: { $gt: new Date() },
    })).map(idOf));
    for (const socket of sockets) {
      if (socket.data.expiresAt > Date.now() && active.has(socket.data.sessionId)) socket.emit(event, {});
    }
  }
  const handle = callback => (...args) => callback(...args).catch(error => logger.error({ event: 'realtime', message: error.message }));
  const notice = handle(async ({ previous, current }) => {
    const audiences = await Promise.all([previous, current].filter(Boolean).map(noticeRecipients));
    const candidates = audiences.includes(null) ? null : [...new Set(audiences.flat())];
    await notify('announcement:changed', candidates);
  });
  const attendance = handle(async item => {
    await notify('attendance:changed', await recalculateAttendanceAudience(item.sectionId, item.records));
  });
  const revokeSession = id => io.in(`session:${id}`).disconnectSockets(true);
  const revokeUser = id => io.in(`user:${id}`).disconnectSockets(true);
  events.on('announcement.changed', notice);
  events.on('attendance.changed', attendance);
  events.on('session.revoked', revokeSession);
  events.on('user.revoked', revokeUser);
  return {
    close() {
      events.off('announcement.changed', notice);
      events.off('attendance.changed', attendance);
      events.off('session.revoked', revokeSession);
      events.off('user.revoked', revokeUser);
      return io.close();
    },
  };
}
