# Indexing

| Index | Query or invariant |
| --- | --- |
| Users `role, department, name` | Role and department directory filters. |
| Users `email` and `code` | Unique login identifier and campus ID. |
| Courses `code` and `department, title` | Unique course code and departmental catalogue. |
| Sections `courseId, name, term` | Unique class section with case-insensitive names and terms. |
| Sections `facultyId, courseId` | Staff assignment scope. |
| Enrolments `sectionId, studentId` and `studentId, sectionId` | Unique enrolment and lookup by student. |
| Attendance `sectionId, date, slot` and `records.studentId, date` | Unique class session and dated student history. |
| Announcements `audience, targetId, createdAt` | Scoped notice history. |
| Sessions `expiresAt` and `userId` | TTL cleanup and user session lookups. |

Unique indexes are initialized before the API begins listening. Small directory text searches use escaped literal matching.
