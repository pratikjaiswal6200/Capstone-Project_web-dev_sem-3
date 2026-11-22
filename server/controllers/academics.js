import { Announcement, Attendance, Course, Enrollment, Section, dto, idOf } from '../models.js';
import { badInput, conflict, forbidden, notFound, objectId, pageQuery, paginated, respond, routeId } from '../http.js';
import { academicScope, allowedSection, noticeScope, validateAnnouncement } from '../scope.js';
import { announcement, correctAttendance, markAttendance } from '../validation.js';
import { z } from 'zod';

export function attendanceDto(session, user) {
  const item = dto(session);
  if (user.role !== 'student') return item;
  const { markedBy, revision, ...summary } = item;
  return { ...summary, records: item.records.filter(record => idOf(record.studentId) === idOf(user)) };
}

export function assertRoster(records, roster) {
  const ids = new Set(records.map(record => record.studentId.toLowerCase()));
  if (ids.size !== records.length || roster.length !== ids.size || roster.some(id => !ids.has(idOf(id)))) {
    throw badInput('Provide one mark for every student on this session roster.');
  }
}

export function academicsController(events) {
  return {
    attendance: {
      async list(req, res) {
        const query = pageQuery.parse(req.query);
        const scope = await academicScope(req.user);
        const filters = {
          ...(scope.sectionIds && { sectionId: { $in: scope.sectionIds } }),
          ...(req.user.role === 'student' && { 'records.studentId': req.user._id }),
          ...(query.sectionId && { $and: [{ sectionId: query.sectionId }] }),
          ...(query.courseId && { courseId: query.courseId }),
          ...(query.date && { date: query.date }),
        };
        respond(res, await paginated(Attendance, query, filters, { date: -1, slot: -1 }, item => attendanceDto(item, req.user)));
      },
      async get(req, res) {
        const scope = await academicScope(req.user);
        const id = routeId(req);
        const item = await Attendance.findOne({
          _id: id, ...(scope.sectionIds && { sectionId: { $in: scope.sectionIds } }),
          ...(req.user.role === 'student' && { 'records.studentId': req.user._id }),
        }).lean();
        if (!item) throw notFound();
        respond(res, attendanceDto(item, req.user));
      },
      async mark(req, res) {
        const fields = markAttendance.parse(req.body);
        const section = await allowedSection(req.user, fields.sectionId);
        const roster = await Enrollment.distinct('studentId', { sectionId: section._id });
        assertRoster(fields.records, roster);
        const item = await Attendance.create({ ...fields, courseId: section.courseId, markedBy: req.user._id });
        events.emit('attendance.changed', item);
        respond(res, attendanceDto(item, req.user), 201);
      },
      async correct(req, res) {
        const input = correctAttendance.parse(req.body);
        const current = await Attendance.findById(routeId(req)).lean();
        if (!current) throw notFound();
        await allowedSection(req.user, current.sectionId);
        assertRoster(input.records, current.records.map(record => record.studentId));
        if (input.revision >= 200) throw conflict('This session has reached the correction history limit.');
        const item = await Attendance.findOneAndUpdate(
          { _id: current._id, revision: input.revision },
          { $set: { records: input.records }, $inc: { revision: 1 },
            $push: { corrections: { editedBy: req.user._id, reason: input.reason, previousRecords: current.records } } },
          { runValidators: true, returnDocument: 'after' },
        ).lean();
        if (!item) throw conflict('The attendance record changed. Reload it before correcting.');
        events.emit('attendance.changed', item);
        respond(res, attendanceDto(item, req.user));
      },
      async audit(req, res) {
        const item = await Attendance.findById(routeId(req)).select('+corrections').lean();
        if (!item) throw notFound();
        await allowedSection(req.user, item.sectionId);
        respond(res, item.corrections || []);
      },
    },
    announcements: {
      async list(req, res) {
        const query = pageQuery.parse(req.query);
        const scope = await academicScope(req.user);
        respond(res, await paginated(Announcement, query, {
          ...noticeScope(req.user, scope),
          ...(query.audience && { audience: query.audience }),
        }, { createdAt: -1 }));
      },
      async get(req, res) {
        const scope = await academicScope(req.user);
        const item = await Announcement.findOne({ _id: routeId(req), ...noticeScope(req.user, scope) }).lean();
        if (!item) throw notFound();
        respond(res, dto(item));
      },
      async publish(req, res) {
        const fields = announcement.parse(req.body);
        await validateAnnouncement(req.user, fields);
        const item = await Announcement.create({ ...fields, authorId: req.user._id });
        events.emit('announcement.changed', { current: item });
        respond(res, dto(item), 201);
      },
      async edit(req, res) {
        const fields = announcement.parse(req.body);
        const previous = await editableNotice(req);
        await validateAnnouncement(req.user, fields);
        const current = await Announcement.findByIdAndUpdate(previous._id, { ...fields, targetId: fields.targetId || null }, {
          runValidators: true, returnDocument: 'after',
        }).lean();
        events.emit('announcement.changed', { previous, current });
        respond(res, dto(current));
      },
      async remove(req, res) {
        const previous = await editableNotice(req);
        await Announcement.deleteOne({ _id: previous._id });
        events.emit('announcement.changed', { previous });
        res.status(204).end();
      },
    },
    reports: {
      async attendance(req, res) {
        const query = z.object({
          threshold: z.coerce.number().min(0).max(100).default(75), courseId: objectId.optional(), sectionId: objectId.optional(),
          belowOnly: z.enum(['true', 'false']).optional(),
        }).strict().parse(req.query);
        const scope = await academicScope(req.user);
        const courseId = query.courseId ? await Course.findById(query.courseId).select('_id').lean() : null;
        const sectionId = query.sectionId ? await Section.findById(query.sectionId).select('_id').lean() : null;
        if ((query.courseId && !courseId) || (query.sectionId && !sectionId)) throw notFound();
        const filter = {
          ...(scope.sectionIds && { sectionId: { $in: scope.sectionIds } }),
          ...(sectionId && { $and: [{ sectionId: sectionId._id }] }),
          ...(courseId && { courseId: courseId._id }),
        };
        const studentFilter = req.user.role === 'student' ? { 'records.studentId': req.user._id } : {};
        const rows = await Attendance.aggregate([
          { $match: { ...filter, ...studentFilter } },
          { $unwind: '$records' },
          { $match: studentFilter },
          { $group: {
            _id: { studentId: '$records.studentId', courseId: '$courseId' },
            total: { $sum: { $cond: [{ $eq: ['$records.status', 'excused'] }, 0, 1] } },
            attended: { $sum: { $cond: [{ $in: ['$records.status', ['present', 'late']] }, 1, 0] } },
          } },
          { $project: {
            _id: 0, studentId: '$_id.studentId', courseId: '$_id.courseId', total: 1, attended: 1,
            percentage: { $cond: [
              { $gt: ['$total', 0] },
              { $divide: [{ $floor: { $add: [{ $divide: [{ $multiply: ['$attended', 1000] }, '$total'] }, .5] } }, 10] },
              null,
            ] },
          } },
          { $set: { belowThreshold: { $and: [{ $ne: ['$percentage', null] }, { $lt: ['$percentage', query.threshold] }] } } },
          ...(query.belowOnly === 'true' ? [{ $match: { belowThreshold: true } }] : []),
          { $sort: { courseId: 1, studentId: 1 } },
        ]);
        respond(res, rows);
      },
      async enrollment(req, res) {
        const { groupBy } = z.object({ groupBy: z.enum(['section', 'course']).default('section') }).strict().parse(req.query);
        const scope = await academicScope(req.user);
        const rows = await Section.aggregate([
          { $match: scope.sectionIds ? { _id: { $in: scope.sectionIds } } : {} },
          { $lookup: {
            from: Enrollment.collection.name,
            localField: '_id', foreignField: 'sectionId', pipeline: [{ $count: 'total' }], as: 'rollup',
          } },
          { $project: { _id: 0, sectionId: '$_id', courseId: 1, name: 1, term: 1,
            count: { $ifNull: [{ $first: '$rollup.total' }, 0] } } },
          ...(groupBy === 'course' ? [
            { $group: { _id: '$courseId', count: { $sum: '$count' }, sectionCount: { $sum: 1 } } },
            { $project: { _id: 0, courseId: '$_id', count: 1, sectionCount: 1 } },
            { $sort: { courseId: 1 } },
          ] : [{ $sort: { courseId: 1, name: 1, term: 1, sectionId: 1 } }]),
        ]);
        respond(res, rows);
      },
    },
  };
}

async function editableNotice(req) {
  const item = await Announcement.findById(routeId(req)).lean();
  if (!item) throw notFound();
  if (req.user.role !== 'admin' && idOf(item.authorId) !== idOf(req.user)) throw forbidden();
  await validateAnnouncement(req.user, item);
  return item;
}
