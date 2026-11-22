import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { authController } from './controllers/auth.js';
import { catalogController } from './controllers/catalog.js';
import { academicsController } from './controllers/academics.js';
import { errorHandler, notFound, only, requestLog, respond, secureOrigin, serializeWrites } from './http.js';

export function createApp({ config, events = new EventEmitter(), logger = console, staticDirectory }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: { upgradeInsecureRequests: config.production ? [] : null, imgSrc: ["'self'", 'data:'] },
    },
    strictTransportSecurity: config.production,
  }));
  const api = Router();
  api.use(requestLog(logger), secureOrigin(config), express.json({ limit: '160kb' }), cookieParser());
  api.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const auth = authController(config, events, logger);
  const catalog = catalogController(events);
  const academic = academicsController(events);
  const write = serializeWrites();
  const admin = only('admin');
  const staff = only('admin', 'faculty');

  api.get('/health', (_req, res) => respond(res, { status: 'ok' }));
  api.use('/auth', auth.router);
  api.use(auth.requireIdentity);
  api.get('/users/me', catalog.me);
  api.patch('/users/me', write(catalog.updateProfile));
  for (const [name, controllers] of Object.entries(catalog.groups)) {
    api.get(`/${name}`, controllers.list);
    api.get(`/${name}/:id`, controllers.get);
    api.post(`/${name}`, admin, write(controllers.create));
    if (name !== 'enrollments') api.patch(`/${name}/:id`, admin, write(controllers.update));
    api.delete(`/${name}/:id`, admin, write(controllers.delete));
  }
  api.get('/attendance', academic.attendance.list);
  api.get('/attendance/:id', academic.attendance.get);
  api.post('/attendance', staff, write(academic.attendance.mark));
  api.patch('/attendance/:id', staff, write(academic.attendance.correct));
  api.get('/attendance/:id/audit', staff, academic.attendance.audit);
  api.get('/announcements', academic.announcements.list);
  api.get('/announcements/:id', academic.announcements.get);
  api.post('/announcements', staff, write(academic.announcements.publish));
  api.patch('/announcements/:id', staff, write(academic.announcements.edit));
  api.delete('/announcements/:id', staff, write(academic.announcements.remove));
  api.get('/reports/attendance', academic.reports.attendance);
  api.get('/reports/enrollment', staff, academic.reports.enrollment);
  api.use((_req, _res, next) => next(notFound()));
  api.use(errorHandler(logger));
  app.use('/api', api);

  if (staticDirectory) {
    app.use(express.static(staticDirectory, { index: 'index.html' }));
    app.get('/', (_req, res) => res.sendFile(join(staticDirectory, 'index.html')));
  }
  return { app, events, identity: auth.identity };
}
