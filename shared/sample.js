export const departments = ['Computer Science', 'Management', 'Architecture', 'Humanities', 'Applied Sciences'];
export const roles = ['admin', 'faculty', 'student'];
export const roleLabels = { admin: 'Administrator', faculty: 'Faculty', student: 'Student' };
export const statusLabels = { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' };

export const sample = {
  users: [
    { id: 'admin-1', code: 'ADM001', name: 'Pratik Kumar', email: 'admin@campus.example', role: 'admin', department: 'Administration' },
    { id: 'faculty-1', code: 'FAC101', name: 'Dr. Meera Sharma', email: 'faculty@campus.example', role: 'faculty', department: 'Computer Science' },
    { id: 'faculty-2', code: 'FAC102', name: 'Prof. Arjun Bhatia', email: 'arjun@campus.example', role: 'faculty', department: 'Management' },
    { id: 'faculty-3', code: 'FAC103', name: 'Dr. Priya Menon', email: 'priya@campus.example', role: 'faculty', department: 'Architecture' },
    { id: 'student-1', code: 'KRMU24001', name: 'Aanya Verma', email: 'student@campus.example', role: 'student', department: 'Computer Science' },
    { id: 'student-2', code: 'KRMU24002', name: 'Kabir Singh', email: 'kabir@campus.example', role: 'student', department: 'Computer Science' },
    { id: 'student-3', code: 'KRMU24003', name: 'Ishita Gupta', email: 'ishita@campus.example', role: 'student', department: 'Management' },
    { id: 'student-4', code: 'KRMU24004', name: 'Rohan Mehta', email: 'rohan@campus.example', role: 'student', department: 'Architecture' },
    { id: 'student-5', code: 'KRMU24005', name: 'Sana Khan', email: 'sana@campus.example', role: 'student', department: 'Computer Science' },
    { id: 'student-6', code: 'KRMU24006', name: 'Aditya Rao', email: 'aditya@campus.example', role: 'student', department: 'Management' },
  ],
  courses: [
    { id: 'course-1', code: 'CSE201', title: 'Data Structures', department: 'Computer Science', credits: 4 },
    { id: 'course-2', code: 'CSE230', title: 'Database Systems', department: 'Computer Science', credits: 4 },
    { id: 'course-3', code: 'MGT110', title: 'Principles of Management', department: 'Management', credits: 3 },
    { id: 'course-4', code: 'ARC204', title: 'Architectural Design Studio', department: 'Architecture', credits: 5 },
  ],
  sections: [
    { id: 'section-1', name: 'Section A', term: 'Autumn 2026', courseId: 'course-1', facultyId: 'faculty-1' },
    { id: 'section-2', name: 'Section A', term: 'Autumn 2026', courseId: 'course-2', facultyId: 'faculty-1' },
    { id: 'section-3', name: 'Section B', term: 'Autumn 2026', courseId: 'course-3', facultyId: 'faculty-2' },
    { id: 'section-4', name: 'Section A', term: 'Autumn 2026', courseId: 'course-4', facultyId: 'faculty-3' },
  ],
  enrollments: [
    ...['student-1', 'student-2', 'student-5'].flatMap(studentId => ['section-1', 'section-2'].map(sectionId => ({ studentId, sectionId }))),
    { studentId: 'student-3', sectionId: 'section-3' },
    { studentId: 'student-6', sectionId: 'section-3' },
    { studentId: 'student-4', sectionId: 'section-4' },
  ].map((entry, index) => ({ id: `enrollment-${index + 1}`, ...entry })),
  attendance: [
    { id: 'attendance-1', sectionId: 'section-1', date: '2026-11-18', slot: '09:00', records: [
      { studentId: 'student-1', status: 'present' }, { studentId: 'student-2', status: 'late' }, { studentId: 'student-5', status: 'absent' },
    ] },
    { id: 'attendance-2', sectionId: 'section-2', date: '2026-11-19', slot: '10:30', records: [
      { studentId: 'student-1', status: 'present' }, { studentId: 'student-2', status: 'present' }, { studentId: 'student-5', status: 'present' },
    ] },
    { id: 'attendance-3', sectionId: 'section-3', date: '2026-11-20', slot: '11:00', records: [
      { studentId: 'student-3', status: 'present' }, { studentId: 'student-6', status: 'present' },
    ] },
  ].map(entry => ({ ...entry, revision: 1 })),
  announcements: [
    { id: 'notice-1', title: 'End-semester examination schedule', body: 'The examination timetable is ready. Check the notice board in your academic block for your reporting time and room.', audience: 'university', category: 'Academic', authorId: 'admin-1', createdAt: '2026-11-21T09:30:00+05:30' },
    { id: 'notice-2', title: 'Campus library hours extended', body: 'The library will remain open until 9 pm on weekdays during the examination period.', audience: 'university', category: 'Campus', authorId: 'admin-1', createdAt: '2026-11-20T13:00:00+05:30' },
    { id: 'notice-3', title: 'Database Systems lab briefing', body: 'Bring your project schema and attend the lab briefing at the beginning of the next scheduled session.', audience: 'course', targetId: 'course-2', category: 'Academic', authorId: 'faculty-1', createdAt: '2026-11-18T12:00:00+05:30' },
  ],
};

export const mapLocations = [
  { id: 'block-a', label: 'Block A', category: 'Academic', details: 'One of the university’s main academic blocks.', x: 38, y: 47, world: [-20, 9, 9] },
  { id: 'block-b', label: 'Block B', category: 'Academic', details: 'Academic building near the central campus grounds.', x: 59, y: 29, world: [9, 8, -9] },
  { id: 'block-c', label: 'Block C', category: 'Academic', details: 'Academic building on the east side of the overview model.', x: 81, y: 39, world: [25, 8, 9] },
  { id: 'sports', label: 'Football Ground', category: 'Sports', details: 'Open campus ground for football and student recreation.', x: 81, y: 72, world: [21, 1, 29] },
  { id: 'gate', label: 'Main Entry', category: 'Access', details: 'Campus entrance from the Sohna–Gurugram highway.', x: 17, y: 80, world: [-25, 2, 33] },
];
