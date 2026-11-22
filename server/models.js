import mongoose from 'mongoose';
import { roles, statusLabels } from '../shared/sample.js';

const { Schema, model } = mongoose;
const ref = (collection, required = true) => ({ type: Schema.Types.ObjectId, ref: collection, required });
const fields = { timestamps: true };
const user = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  code: { type: String, required: true, uppercase: true, trim: true, unique: true },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  role: { type: String, required: true, enum: roles },
  passwordHash: { type: String, required: true, select: false },
}, fields);
user.index({ role: 1, department: 1, name: 1 });
export const User = model('User', user);

const course = new Schema({
  code: { type: String, required: true, uppercase: true, trim: true, unique: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  credits: { type: Number, required: true, min: 1, max: 30 },
}, fields);
course.index({ department: 1, title: 1 });
export const Course = model('Course', course);

const section = new Schema({
  courseId: ref('Course'),
  facultyId: ref('User'),
  name: { type: String, required: true, trim: true, maxlength: 48 },
  term: { type: String, required: true, trim: true, maxlength: 48 },
}, fields);
section.index({ courseId: 1, name: 1, term: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
section.index({ facultyId: 1, courseId: 1 });
export const Section = model('Section', section);

const enrollment = new Schema({
  studentId: ref('User'),
  sectionId: ref('Section'),
}, fields);
enrollment.index({ sectionId: 1, studentId: 1 }, { unique: true });
enrollment.index({ studentId: 1, sectionId: 1 });
export const Enrollment = model('Enrollment', enrollment);

const attendanceRecord = new Schema({
  studentId: ref('User'),
  status: { type: String, enum: Object.keys(statusLabels), required: true },
}, { _id: false });
const correction = new Schema({
  editedBy: ref('User'),
  editedAt: { type: Date, default: Date.now, required: true },
  reason: { type: String, maxlength: 300, required: true },
  previousRecords: [attendanceRecord],
}, { _id: false });
const attendance = new Schema({
  sectionId: ref('Section'),
  courseId: ref('Course'),
  date: { type: String, required: true },
  slot: { type: String, required: true },
  markedBy: ref('User'),
  revision: { type: Number, min: 1, default: 1, required: true },
  records: { type: [attendanceRecord], required: true },
  corrections: { type: [correction], select: false },
}, fields);
attendance.index({ sectionId: 1, date: -1, slot: 1 }, { unique: true });
attendance.index({ 'records.studentId': 1, date: -1 });
export const Attendance = model('Attendance', attendance);

const announcement = new Schema({
  authorId: ref('User'),
  title: { type: String, required: true, maxlength: 140 },
  body: { type: String, required: true, maxlength: 2500 },
  audience: { type: String, required: true, enum: ['university', 'section', 'course'] },
  category: { type: String, required: true, enum: ['Academic', 'Campus', 'Event'] },
  targetId: { type: Schema.Types.ObjectId, default: null },
}, fields);
announcement.index({ audience: 1, targetId: 1, createdAt: -1 });
export const Announcement = model('Announcement', announcement);

const session = new Schema({
  userId: ref('User'),
  refreshDigest: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, fields);
session.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
session.index({ userId: 1 });
export const Session = model('Session', session);

export const models = [User, Course, Section, Enrollment, Attendance, Announcement, Session];
export const idOf = value => String(value?._id ?? value);
export function dto(document) {
  const { _id, __v, passwordHash, corrections, ...item } = document.toObject ? document.toObject() : document;
  return { id: String(_id), ...item };
}
