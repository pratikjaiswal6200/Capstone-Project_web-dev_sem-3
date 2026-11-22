import { sample } from '../shared/sample.js';

export const sampleAccounts = {
  admin: sample.users[0],
  faculty: sample.users[1],
  student: sample.users[4],
};
export const indiaDate = (value = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(value);
export const displayDate = value => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
}).format(new Date(value));
export const initials = name => name.replace(/^(Dr\.|Prof\.)\s+/, '').split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();

const demoKey = 'krmu-campus-demo-v1';
export function readDemo() {
  try {
    const existing = JSON.parse(localStorage.getItem(demoKey));
    if (existing) return existing;
  } catch {}
  return structuredClone(sample);
}
export function saveDemo(data) {
  localStorage.setItem(demoKey, JSON.stringify(data));
}

export function scopeData(data, user) {
  if (user.role === 'admin') return data;
  const sectionIds = user.role === 'faculty'
    ? data.sections.filter(section => section.facultyId === user.id).map(section => section.id)
    : data.enrollments.filter(entry => entry.studentId === user.id).map(entry => entry.sectionId);
  const sections = data.sections.filter(section => sectionIds.includes(section.id));
  const courses = data.courses.filter(course => sections.some(section => section.courseId === course.id));
  const enrollments = data.enrollments.filter(entry => sectionIds.includes(entry.sectionId) && (user.role === 'faculty' || entry.studentId === user.id));
  return {
    sections, courses, enrollments,
    users: data.users.filter(account => account.id === user.id
      || sections.some(section => section.facultyId === account.id)
      || enrollments.some(entry => entry.studentId === account.id)),
    attendance: data.attendance.filter(session => sectionIds.includes(session.sectionId)).map(session => ({
      ...session, records: user.role === 'student' ? session.records.filter(record => record.studentId === user.id) : session.records,
    })).filter(session => session.records.length),
    announcements: data.announcements.filter(notice => notice.audience === 'university'
      || (notice.audience === 'section' && sectionIds.includes(notice.targetId))
      || (notice.audience === 'course' && courses.some(course => course.id === notice.targetId))),
  };
}

let accessToken;
async function responseData(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error?.message || 'The campus API is unavailable.'), { status: response.status });
  return result.data;
}
async function authRequest(action, body) {
  return responseData(await fetch(`/api/auth/${action}`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
  }));
}
let refreshPending;
async function refresh() {
  if (!refreshPending) {
    refreshPending = authRequest('refresh').then(session => {
      accessToken = session.accessToken;
      return session;
    }).finally(() => { refreshPending = undefined; });
  }
  return refreshPending;
}

export const campusApi = {
  token: () => accessToken,
  restore: refresh,
  async login(credentials) {
    const session = await authRequest('login', credentials);
    accessToken = session.accessToken;
    return session;
  },
  async logout() {
    await authRequest('logout');
    accessToken = undefined;
  },
  async request(route, { method = 'GET', body } = {}) {
    const run = () => fetch(`/api${route}`, {
      method, credentials: 'same-origin',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let result = await run();
    if (result.status === 401) {
      await refresh();
      result = await run();
    }
    return responseData(result);
  },
};

export function attendanceStats(sessions, sections) {
  const counts = new Map();
  for (const session of sessions) {
    const courseId = sections.find(section => section.id === session.sectionId)?.courseId;
    if (!courseId) continue;
    for (const record of session.records) {
      const key = `${courseId}/${record.studentId}`;
      const count = counts.get(key) || { courseId, studentId: record.studentId, total: 0, attended: 0 };
      if (record.status !== 'excused') count.total++;
      if (['present', 'late'].includes(record.status)) count.attended++;
      counts.set(key, count);
    }
  }
  return [...counts.values()].map(row => ({ ...row, percentage: row.total ? Math.round(row.attended / row.total * 1000) / 10 : null }));
}
