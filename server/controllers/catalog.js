import bcrypt from 'bcryptjs';
import { Announcement, Attendance, Course, Enrollment, Section, Session, User, dto, idOf } from '../models.js';
import { badInput, conflict, forbidden, notFound, pageQuery, paginated, respond, routeId, safeRegex } from '../http.js';
import { academicScope, referenceChecks, userScope } from '../scope.js';
import { course, enrollment, newUser, profile, section, updateUser } from '../validation.js';

function requireChanges(data) {
  if (!Object.keys(data).length) throw badInput('Provide at least one field to update.');
  return data;
}

export function catalogController(events) {
  const groups = {
    users: {
      Model: User, sort: { name: 1 }, search: ['name', 'email', 'code'], references: referenceChecks.user,
      async filter(req, query, scope) {
        return { ...await userScope(req.user, scope), ...(query.role && { role: query.role }), ...(query.department && { department: query.department }) };
      },
      async create(body) {
        const { password, ...fields } = newUser.parse(body);
        return { ...fields, passwordHash: await bcrypt.hash(password, 12) };
      },
      update: body => requireChanges(updateUser.parse(body)),
      afterDelete: async id => {
        await Session.deleteMany({ userId: id });
        events.emit('user.revoked', String(id));
      },
    },
    courses: {
      Model: Course, sort: { title: 1 }, search: ['title', 'code'], references: referenceChecks.course,
      filter(_req, query, scope) {
        return { ...(scope.courseIds && { _id: { $in: scope.courseIds } }), ...(query.department && { department: query.department }) };
      },
      create: body => course.parse(body),
      update: body => requireChanges(course.partial().parse(body)),
    },
    sections: {
      Model: Section, sort: { term: -1, name: 1 }, search: ['name', 'term'], references: referenceChecks.section,
      filter(_req, query, scope) {
        return { ...(scope.sectionIds && { _id: { $in: scope.sectionIds } }), ...(query.courseId && { courseId: query.courseId }) };
      },
      async create(body) {
        const fields = section.parse(body);
        await validateSection(fields);
        return fields;
      },
      async update(body, current) {
        const changes = requireChanges(section.partial().parse(body));
        if (changes.courseId && changes.courseId.toLowerCase() !== idOf(current.courseId) &&
            (await Promise.all([Attendance.exists({ sectionId: current._id }), Enrollment.exists({ sectionId: current._id }), Announcement.exists({ audience: 'section', targetId: current._id })])).some(Boolean)) {
          throw conflict('A section with attendance, enrolments or announcements cannot move to a different course.');
        }
        await validateSection({ ...current, ...changes });
        return changes;
      },
    },
    enrollments: {
      Model: Enrollment, sort: { createdAt: -1 },
      filter(req, query, scope) {
        return {
          ...(scope.sectionIds && { sectionId: { $in: scope.sectionIds } }),
          ...(req.user.role === 'student' && { studentId: req.user._id }),
          ...(query.sectionId && { $and: [{ sectionId: query.sectionId }] }),
        };
      },
      async create(body) {
        const fields = enrollment.parse(body);
        const [student, target, count] = await Promise.all([
          User.exists({ _id: fields.studentId, role: 'student' }), Section.exists({ _id: fields.sectionId }),
          Enrollment.countDocuments({ sectionId: fields.sectionId }),
        ]);
        if (!student || !target) throw badInput('Select an existing student and section.');
        if (count >= 250) throw conflict('The section already has 250 students.');
        return fields;
      },
      references: (_id, item) => [Attendance.exists({ sectionId: item.sectionId, 'records.studentId': item.studentId })],
    },
  };

  function resource(name) {
    const { Model, sort, search, filter, create, update, references, afterDelete } = groups[name];
    return {
      async list(req, res) {
        const query = pageQuery.parse(req.query);
        const scope = await academicScope(req.user);
        const filters = await filter(req, query, scope);
        if (search && query.q) filters.$or = search.map(key => ({ [key]: safeRegex(query.q) }));
        respond(res, await paginated(Model, query, filters, sort));
      },
      async get(req, res) {
        const scope = await academicScope(req.user);
        const filters = await filter(req, {}, scope);
        const item = await Model.findOne({ $and: [filters, { _id: routeId(req) }] }).lean();
        if (!item) throw notFound();
        respond(res, dto(item));
      },
      async create(req, res) {
        const item = await Model.create(await create(req.body));
        respond(res, dto(item), 201);
      },
      async update(req, res) {
        const id = routeId(req);
        const current = await Model.findById(id).lean();
        if (!current) throw notFound();
        if (name === 'users' && current.role === 'admin') throw forbidden();
        const fields = await update(req.body, current);
        const item = await Model.findByIdAndUpdate(id, fields, { runValidators: true, returnDocument: 'after' }).lean();
        respond(res, dto(item));
      },
      async delete(req, res) {
        const id = routeId(req);
        const item = await Model.findById(id).lean();
        if (!item) throw notFound();
        if (name === 'users' && item.role === 'admin') throw forbidden();
        if (references && (await Promise.all(references(id, item))).some(Boolean)) {
          throw conflict('This record is still used by another campus record.');
        }
        await Model.deleteOne({ _id: id });
        if (afterDelete) await afterDelete(id);
        res.status(204).end();
      },
    };
  }
  return {
    groups: Object.fromEntries(Object.keys(groups).map(name => [name, resource(name)])),
    me(req, res) { respond(res, dto(req.user)); },
    async updateProfile(req, res) {
      const item = await User.findByIdAndUpdate(req.user._id, profile.parse(req.body), { runValidators: true, returnDocument: 'after' }).lean();
      if (!item) throw notFound();
      respond(res, dto(item));
    },
  };
}

async function validateSection(fields) {
  const [courseExists, facultyExists] = await Promise.all([
    Course.exists({ _id: fields.courseId }), User.exists({ _id: fields.facultyId, role: 'faculty' }),
  ]);
  if (!courseExists || !facultyExists) throw badInput('Select an existing course and faculty member.');
}
