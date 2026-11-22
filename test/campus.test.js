import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { Duplex } from 'node:stream';
import { IncomingMessage, ServerResponse } from 'node:http';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { io } from 'socket.io-client';
import { sample } from '../shared/sample.js';
import { attendanceStats, scopeData } from '../src/data.js';
import { createApp } from '../server/app.js';
import { assertRoster, attendanceDto } from '../server/controllers/academics.js';
import { safeRegex } from '../server/http.js';
import { Course, Enrollment, Section, User, models } from '../server/models.js';
import { connectRealtime } from '../server/realtime.js';
import { announcement, classDate, markAttendance } from '../server/validation.js';

const logger = { info() {}, error() {} };
const config = {
  production: false,
  allowedOrigins: new Set(['http://localhost:5173']),
  accessSecret: 'campus access secret for verification only',
  refreshSecret: 'campus refresh secret for verification only',
};
const studentId = '507f1f77bcf86cd799439011';
const otherStudentId = '507f1f77bcf86cd799439012';
const sectionId = '507f1f77bcf86cd799439013';

function memoryRequest(app, method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const client = new Duplex({
      read() {},
      write(chunk, _encoding, next) { chunks.push(chunk); next(); },
    });
    Object.defineProperty(client, 'remoteAddress', { value: '127.0.0.1' });
    const req = new IncomingMessage(client);
    req.complete = true;
    req.url = url;
    req.method = method;
    req.headers = { host: 'localhost:4000', ...headers };
    if (body !== undefined) {
      const content = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = Buffer.byteLength(content).toString();
      req.push(content);
    }
    req.push(null);
    const res = new ServerResponse(req);
    res.assignSocket(client);
    res.on('finish', () => {
      const response = Buffer.concat(chunks).toString();
      const text = response.slice(response.indexOf('\r\n\r\n') + 4);
      resolve({ status: res.statusCode, headers: res.getHeaders(), json: text ? JSON.parse(text) : null });
    });
    res.on('error', reject);
    try { app(req, res); } catch (error) { reject(error); }
  });
}

test('Express health, protected routes, JSON parsing and origin validation', async () => {
  const { app } = createApp({ config, logger });
  const health = await memoryRequest(app, 'GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.json.data.status, 'ok');
  assert.ok(health.headers['x-request-id']);
  const privateRequest = await memoryRequest(app, 'GET', '/api/attendance');
  assert.equal(privateRequest.status, 401);
  assert.equal(privateRequest.json.error.code, 'UNAUTHORIZED');
  const login = await memoryRequest(app, 'POST', '/api/auth/login', { email: 'bogus' });
  assert.equal(login.status, 400);
  const malformed = await memoryRequest(app, 'POST', '/api/auth/login', '{"email":');
  assert.equal(malformed.status, 400);
  const foreign = await memoryRequest(app, 'POST', '/api/auth/refresh', {}, { origin: 'https://unrelated.example' });
  assert.equal(foreign.status, 403);
});

test('attendance validation rejects duplicate marks, invalid times and impossible dates', () => {
  const mark = { sectionId, date: '2024-02-29', slot: '09:00', records: [{ studentId, status: 'present' }] };
  assert.equal(markAttendance.safeParse(mark).success, true);
  assert.equal(markAttendance.safeParse({ ...mark, slot: '25:00' }).success, false);
  assert.equal(markAttendance.safeParse({ ...mark, records: [mark.records[0], mark.records[0]] }).success, false);
  assert.equal(classDate.safeParse('2025-02-29').success, false);
  assert.equal(classDate.safeParse('2099-12-31').success, false);
  assert.throws(() => assertRoster(mark.records, [studentId, otherStudentId]), /every student/);
});

test('student attendance DTO excludes peer records and correction information', () => {
  const privateSession = { _id: sectionId, markedBy: otherStudentId, revision: 2,
    corrections: [{ reason: 'Corrected' }], records: [{ studentId, status: 'late' }, { studentId: otherStudentId, status: 'absent' }] };
  const result = attendanceDto(privateSession, { _id: studentId, role: 'student' });
  assert.deepEqual(result.records, [{ studentId, status: 'late' }]);
  for (const key of ['revision', 'markedBy', 'corrections']) assert.equal(Object.hasOwn(result, key), false);
});

test('sample workspace scopes courses, announcements and attendance by role', () => {
  const student = sample.users.find(user => user.id === 'student-3');
  const scoped = scopeData(sample, student);
  assert.deepEqual(scoped.sections.map(section => section.id), ['section-3']);
  assert.ok(scoped.attendance.every(session => session.records.every(record => record.studentId === student.id)));
  assert.ok(!scoped.announcements.some(notice => notice.id === 'notice-3'));
  const faculty = scopeData(sample, sample.users.find(user => user.id === 'faculty-1'));
  assert.deepEqual(faculty.sections.map(section => section.id), ['section-1', 'section-2']);
  assert.ok(faculty.announcements.some(notice => notice.id === 'notice-3'));
});

test('summary counts late as attended and removes excused from the denominator', () => {
  const sessions = ['present', 'absent', 'late', 'excused'].map(status => ({ sectionId, records: [{ studentId, status }] }));
  assert.deepEqual(attendanceStats(sessions, [{ id: sectionId, courseId: 'course' }]), [
    { studentId, courseId: 'course', total: 3, attended: 2, percentage: 66.7 },
  ]);
});

test('scoped announcements require a target and search treats punctuation literally', () => {
  const fields = { title: 'Campus update', body: 'A longer message', category: 'Campus', audience: 'course' };
  assert.equal(announcement.safeParse(fields).success, false);
  assert.equal(announcement.safeParse({ ...fields, targetId: sectionId }).success, true);
  assert.equal(announcement.safeParse({ ...fields, audience: 'university', targetId: sectionId }).success, false);
  assert.equal(safeRegex('[.*]').test('abc'), false);
  assert.equal(safeRegex('[.*]').test('test [.*] here'), true);
});

test('MongoDB and Socket.IO workflow', { skip: !process.env.MONGODB_TEST_URI, timeout: 25000 }, async t => {
  await mongoose.connect(process.env.MONGODB_TEST_URI, {
    dbName: `krmu_test_${new mongoose.Types.ObjectId()}`, serverSelectionTimeoutMS: 5000,
  });
  let realtime;
  let socket;
  t.after(async () => {
    try {
      socket?.disconnect();
      await realtime?.close();
    } finally {
      try {
        await mongoose.connection.dropDatabase();
      } finally {
        await mongoose.disconnect();
      }
    }
  });
  await Promise.all(models.map(Model => Model.init()));
  const password = 'integration-check-2026';
  const passwordHash = await bcrypt.hash(password, 4);
  const [faculty, student, another, otherFaculty] = await User.create([
    { name: 'Faculty One', email: 'faculty@example.test', code: 'FAC1', role: 'faculty' },
    { name: 'Student One', email: 'student@example.test', code: 'STU1', role: 'student' },
    { name: 'Student Two', email: 'second@example.test', code: 'STU2', role: 'student' },
    { name: 'Faculty Two', email: 'other@example.test', code: 'FAC2', role: 'faculty' },
  ].map(user => ({ ...user, department: 'Computer Science', passwordHash })));
  const course = await Course.create({ code: 'CSE201', title: 'Data Structures', credits: 4, department: 'Computer Science' });
  const [section, outsider] = await Section.create([
    { name: 'A1', facultyId: faculty.id }, { name: 'A2', facultyId: otherFaculty.id },
  ].map(item => ({ ...item, term: 'Autumn', courseId: course.id })));
  await Enrollment.create([{ studentId: student.id, sectionId: section.id }, { studentId: another.id, sectionId: section.id }]);

  const runtime = createApp({ config, logger });
  const server = createServer(runtime.app);
  realtime = connectRealtime(server, { ...runtime, config, logger });
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function api(path, { method = 'GET', token, cookie, body } = {}) {
    const result = await fetch(origin + '/api' + path, {
      method, body: body === undefined ? undefined : JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...(cookie && { Cookie: cookie }) },
    });
    return { status: result.status, body: result.status === 204 ? null : await result.json(), cookie: result.headers.get('set-cookie')?.split(';')[0] };
  }
  const login = email => api('/auth/login', { method: 'POST', body: { email, password } });
  const [facultySession, studentSession] = await Promise.all([login(faculty.email), login(student.email)]);
  assert.equal(facultySession.status, 200);
  assert.equal(studentSession.status, 200);
  const facultyToken = facultySession.body.data.accessToken;
  const studentToken = studentSession.body.data.accessToken;
  socket = io(origin, { auth: { token: studentToken }, transports: ['websocket'], reconnection: false, timeout: 5000 });
  await once(socket, 'connect', { signal: AbortSignal.timeout(6000) });
  assert.equal(socket.io.engine.transport.name, 'websocket');
  const records = [{ studentId: student.id, status: 'present' }, { studentId: another.id, status: 'absent' }];
  const input = { sectionId: section.id, date: '2024-02-29', slot: '09:00', records };
  const post = (path, token, body) => api(path, { method: 'POST', token, body });
  assert.equal((await post('/attendance', studentToken, input)).status, 403);
  assert.equal((await post('/attendance', facultyToken, { ...input, sectionId: outsider.id })).status, 403);
  const [marked] = await Promise.all([
    post('/attendance', facultyToken, input).then(response => {
      assert.equal(response.status, 201, JSON.stringify(response.body));
      return response;
    }),
    once(socket, 'attendance:changed', { signal: AbortSignal.timeout(5000) }).then(payload => assert.deepEqual(payload, [{}])),
  ]);
  assert.equal((await post('/attendance', facultyToken, input)).status, 409);
  const id = marked.body.data.id;
  const own = await api(`/attendance/${id}`, { token: studentToken });
  assert.deepEqual(own.body.data.records, [{ studentId: student.id, status: 'present' }]);
  const correction = { method: 'PATCH', token: facultyToken, body: { records, revision: 1, reason: 'Corrected after roll call' } };
  assert.equal((await api(`/attendance/${id}`, correction)).status, 200);
  assert.equal((await api(`/attendance/${id}`, correction)).status, 409);
  assert.equal((await api(`/attendance/${id}/audit`, { token: facultyToken })).body.data.length, 1);
  assert.equal((await api('/reports/attendance?threshold=75', { token: studentToken })).body.data[0].percentage, 100);
  assert.equal((await api('/reports/enrollment?groupBy=course', { token: facultyToken })).body.data[0].count, 2);
  assert.equal((await api(`/attendance/${new mongoose.Types.ObjectId()}`, { token: facultyToken })).status, 404);
  const [notice] = await Promise.all([
    post('/announcements', facultyToken, {
      title: 'Lab moved to room 204', body: 'Please report to room 204.', category: 'Academic', audience: 'section', targetId: section.id,
    }).then(response => {
      assert.equal(response.status, 201, JSON.stringify(response.body));
      return response.body.data;
    }),
    once(socket, 'announcement:changed', { signal: AbortSignal.timeout(5000) }).then(payload => assert.deepEqual(payload, [{}])),
  ]);
  const visibleNotice = await api(`/announcements/${notice.id}`, { token: studentToken });
  assert.equal(visibleNotice.status, 200);
  assert.equal(visibleNotice.body.data.title, notice.title);
  const refreshed = await api('/auth/refresh', { method: 'POST', cookie: facultySession.cookie });
  assert.equal(refreshed.status, 200);
  assert.equal((await api('/auth/refresh', { method: 'POST', cookie: facultySession.cookie })).status, 401);
  assert.equal((await api('/auth/logout', { method: 'POST', cookie: refreshed.cookie })).status, 204);
  assert.equal((await api('/users/me', { token: refreshed.body.data.accessToken })).status, 401);
  const [logout] = await Promise.all([
    api('/auth/logout', { method: 'POST', cookie: studentSession.cookie }),
    once(socket, 'disconnect', { signal: AbortSignal.timeout(5000) }),
  ]);
  assert.equal(logout.status, 204);
});
