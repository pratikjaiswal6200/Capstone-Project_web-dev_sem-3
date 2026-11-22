# Data model

| Collection | Fields and relationships |
| --- | --- |
| Users | Unique email and code, role, department, display name, bcrypt password hash. |
| Courses | Unique code, title, department and credits. |
| Sections | Name and term, one course and one faculty user. |
| Enrollments | One section and one student user, unique pair. |
| Attendances | One class session keyed by section, date and start time. Stores course, marker, roster, marks, revision and prior marks for corrections. |
| Announcements | Author, title, category, body, audience and an optional course or section target. |
| Sessions | User, refresh-token digest and expiry timestamp. |

A student can be enrolled in multiple sections. A section has up to 250 students. Historical class marks retain the roster for the recorded class, so later enrolment does not change a saved session. Late counts as attended. Excused marks are excluded from the denominator. If all marks are excused, the percentage is null.
