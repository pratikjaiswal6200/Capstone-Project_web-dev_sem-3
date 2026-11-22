import { Announcement, Attendance, Course, Enrollment, Section, User, idOf } from './models.js';
import { forbidden, notFound } from './http.js';

export async function academicScope(user) {
  if (user.role === 'admin') return { sectionIds: null, courseIds: null };
  const filter = user.role === 'faculty' ? { facultyId: user._id } : {
    _id: { $in: await Enrollment.distinct('sectionId', { studentId: user._id }) },
  };
  const sections = await Section.find(filter).select('_id courseId facultyId').lean();
  return {
    sectionIds: sections.map(section => section._id),
    courseIds: [...new Map(sections.map(section => [idOf(section.courseId), section.courseId])).values()],
    facultyIds: sections.map(section => section.facultyId),
  };
}

export async function userScope(user, scope) {
  if (user.role === 'admin') return {};
  const visible = [user._id, ...scope.facultyIds];
  if (user.role === 'faculty') visible.push(...await Enrollment.distinct('studentId', { sectionId: { $in: scope.sectionIds } }));
  return { _id: { $in: visible } };
}

export function noticeScope(user, scope) {
  if (user.role === 'admin') return {};
  return { $or: [
    { audience: 'university' },
    { audience: 'section', targetId: { $in: scope.sectionIds } },
    { audience: 'course', targetId: { $in: scope.courseIds } },
  ] };
}

export async function allowedSection(user, id) {
  const section = await Section.findById(id).lean();
  if (!section) throw notFound();
  if (user.role !== 'admin' && (user.role !== 'faculty' || idOf(section.facultyId) !== idOf(user))) throw forbidden();
  return section;
}

export async function validateAnnouncement(user, payload) {
  if (payload.audience === 'university') {
    if (user.role !== 'admin') throw forbidden();
    return;
  }
  const condition = user.role === 'faculty' ? { facultyId: user._id } : {};
  if (payload.audience === 'section') {
    if (!await Section.exists({ _id: payload.targetId })) throw notFound();
    if (!await Section.exists({ _id: payload.targetId, ...condition })) throw forbidden();
    return;
  }
  if (!await Course.exists({ _id: payload.targetId })) throw notFound();
  if (user.role === 'faculty' && !await Section.exists({ courseId: payload.targetId, ...condition })) throw forbidden();
}

export async function noticeRecipients(notice) {
  if (notice.audience === 'university') return null;
  const sections = await Section.find(notice.audience === 'course' ? { courseId: notice.targetId } : { _id: notice.targetId })
    .select('_id facultyId').lean();
  const [admins, students] = await Promise.all([
    User.distinct('_id', { role: 'admin' }),
    Enrollment.distinct('studentId', { sectionId: { $in: sections.map(section => section._id) } }),
  ]);
  return [...new Set([...admins, ...students, ...sections.map(section => section.facultyId)].map(idOf))];
}

export async function recalculateAttendanceAudience(sectionId, records) {
  const [admins, section, enrolled] = await Promise.all([
    User.distinct('_id', { role: 'admin' }),
    Section.findById(sectionId).select('facultyId').lean(),
    Enrollment.distinct('studentId', { sectionId, studentId: { $in: records.map(record => record.studentId) } }),
  ]);
  return [...new Set([...admins, ...enrolled, ...(section ? [section.facultyId] : [])].map(idOf))];
}

export const referenceChecks = {
  user: id => [Section.exists({ facultyId: id }), Enrollment.exists({ studentId: id }), Attendance.exists({ $or: [{ markedBy: id }, { 'corrections.editedBy': id }] }), Announcement.exists({ authorId: id })],
  course: id => [Section.exists({ courseId: id }), Announcement.exists({ audience: 'course', targetId: id })],
  section: id => [Enrollment.exists({ sectionId: id }), Attendance.exists({ sectionId: id }), Announcement.exists({ audience: 'section', targetId: id })],
};
