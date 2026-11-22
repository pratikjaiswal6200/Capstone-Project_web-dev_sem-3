import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import 'dotenv/config';
import { sample } from '../shared/sample.js';
import { Announcement, Attendance, Course, Enrollment, Section, User, models } from './models.js';

const uri = process.env.MONGODB_URI || '';
const password = process.env.DEMO_SEED_PASSWORD;
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/krmu_campus(?:\?|$)/.test(uri) || process.env.NODE_ENV === 'production') {
  throw new Error('Seed requires the local krmu_campus database.');
}
if (!password || password.length < 10 || Buffer.byteLength(password) > 72) {
  throw new Error('Set DEMO_SEED_PASSWORD to a 10–72 byte local demonstration password.');
}
const mongoId = key => new mongoose.Types.ObjectId(createHash('sha256').update(`krmu-coursework-v1:${key}`).digest('hex').slice(0, 24));

async function insertMissing(Model, rows, decorate = () => ({})) {
  for (const row of rows) {
    const { id, ...data } = row;
    const entry = { ...data, ...decorate(row) };
    for (const field of ['authorId', 'courseId', 'facultyId', 'sectionId', 'studentId', 'targetId', 'markedBy']) {
      if (typeof entry[field] === 'string') entry[field] = mongoId(entry[field]);
    }
    if (entry.records) entry.records = entry.records.map(record => ({ ...record, studentId: mongoId(record.studentId) }));
    const validated = new Model({ _id: mongoId(id), ...entry });
    await validated.validate();
    const { _id, ...insert } = validated.toObject();
    await Model.updateOne({ _id }, { $setOnInsert: { ...insert, updatedAt: entry.createdAt || new Date(), createdAt: entry.createdAt || new Date() } }, {
      upsert: true, timestamps: false,
    });
  }
}
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all(models.map(Model => Model.init()));
  const passwordHash = await bcrypt.hash(password, 12);
  await insertMissing(User, sample.users, () => ({ passwordHash }));
  await insertMissing(Course, sample.courses);
  await insertMissing(Section, sample.sections);
  await insertMissing(Enrollment, sample.enrollments);
  await insertMissing(Attendance, sample.attendance, row => {
    const section = sample.sections.find(item => item.id === row.sectionId);
    return { courseId: section.courseId, markedBy: section.facultyId };
  });
  await insertMissing(Announcement, sample.announcements, row => ({ createdAt: new Date(row.createdAt) }));
  console.info('Demo campus records are available. Use the configured demo password with admin@campus.example, faculty@campus.example or student@campus.example.');
} finally {
  await mongoose.disconnect();
}
