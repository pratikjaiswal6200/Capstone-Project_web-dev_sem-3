import { z } from 'zod';
import { statusLabels } from '../shared/sample.js';
import { objectId } from './http.js';

const nameOf = max => z.string().trim().min(2).max(max);
const code = z.string().trim().toUpperCase().regex(/^[A-Z\d][A-Z\d_-]{1,23}$/);
const email = z.string().trim().toLowerCase().pipe(z.email().max(180));
const department = nameOf(100);
const password = z.string().min(10).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must fit within 72 UTF-8 bytes.');
export const credentials = z.strictObject({ email, password: z.string().min(1).refine(value => Buffer.byteLength(value, 'utf8') <= 72) });
export const profile = z.strictObject({ name: nameOf(100) });
export const newUser = z.strictObject({ name: nameOf(100), email, code, department, role: z.enum(['student', 'faculty']), password });
export const updateUser = newUser.omit({ password: true, role: true }).partial();
export const course = z.strictObject({ title: nameOf(120), code, department, credits: z.number().int().min(1).max(30) });
export const section = z.strictObject({ name: nameOf(48), term: nameOf(48), courseId: objectId, facultyId: objectId });
export const enrollment = z.strictObject({ studentId: objectId, sectionId: objectId });

export const classDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).format();
  return value >= '2000-01-01' && value <= today;
}, 'Use a valid class date on or before today in India.');
const records = z.array(z.strictObject({ studentId: objectId, status: z.enum(Object.keys(statusLabels)) })).min(1).max(250)
  .refine(items => new Set(items.map(item => item.studentId.toLowerCase())).size === items.length, 'Each student can occur only once.');
export const markAttendance = z.strictObject({ sectionId: objectId, date: classDate, slot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), records });
export const correctAttendance = z.strictObject({ records, reason: z.string().trim().min(5).max(300), revision: z.number().int().min(1) });
export const announcement = z.strictObject({
  title: nameOf(140), body: z.string().trim().min(5).max(2500),
  audience: z.enum(['university', 'section', 'course']), category: z.enum(['Academic', 'Campus', 'Event']),
  targetId: objectId.nullable().optional(),
}).refine(item => item.audience === 'university' ? !item.targetId : !!item.targetId, { path: ['targetId'], message: 'Select a target for the chosen audience.' });
