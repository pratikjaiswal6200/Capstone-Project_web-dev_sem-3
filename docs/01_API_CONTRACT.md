# API contract

All paths are relative to `/api`. JSON requests use `Content-Type: application/json`. Private requests require `Authorization: Bearer <accessToken>` except refresh and logout, which use the refresh cookie.

Success returns `{"data": ...}`. Create operations return 201. Deletes and logout return 204 with an empty body. Paginated lists return `data.items`, `data.total`, `data.page` and `data.limit`. The default page size is 25 and the maximum is 100.

| Method and path | Access | Inputs or result |
| --- | --- | --- |
| GET `/health` | Public | Returns service status after successful server startup. |
| POST `/auth/login` | Public | `email`, `password`. Returns `user` and `accessToken`, sets refresh cookie. |
| POST `/auth/refresh` | Refresh cookie | Rotates cookie and returns new access token and user. |
| POST `/auth/logout` | Refresh cookie | Revokes the current refresh session and clears the cookie. |
| GET / PATCH `/users/me` | Signed-in user | Read profile or update `name`. |
| GET `/users`, `/users/:id` | Signed-in, scoped | Lists relevant people. Filters include `role`, `department` and `q`. |
| POST / PATCH / DELETE `/users[/:id]` | Admin | Create a student/faculty user using `name`, `code`, `email`, `department`, `role`, `password`. Updates accept the four descriptive fields. Use POST on the collection and PATCH/DELETE on the record. |
| GET `/courses[/:id]` | Signed-in, scoped | Lists visible courses. Filters include `q` and `department`. |
| POST / PATCH / DELETE `/courses[/:id]` | Admin | `code`, `title`, `department`, `credits` for create or partial update. |
| GET `/sections[/:id]` | Signed-in, scoped | Classes visible to the caller. Supports `courseId` and `q`. |
| POST / PATCH / DELETE `/sections[/:id]` | Admin | `name`, `term`, `courseId`, `facultyId` for create or partial update. |
| GET `/enrollments[/:id]` | Signed-in, scoped | Optional `sectionId` filter. |
| POST `/enrollments`, DELETE `/enrollments/:id` | Admin | Create using `sectionId` and `studentId`. |
| GET `/attendance[/:id]` | Signed-in, scoped | Filters include `sectionId`, `courseId` and `date`. Students receive only their own mark. |
| POST `/attendance` | Assigned faculty, admin | `sectionId`, `date` in India local time, `slot` in 24-hour HH:mm, and one `records` entry for each enrolled student. |
| PATCH `/attendance/:id` | Assigned faculty, admin | Full original roster in `records`, current `revision` and a `reason` of 5–300 characters. |
| GET `/attendance/:id/audit` | Assigned faculty, admin | Returns prior marks, correction reason, editor and timestamp. |
| GET `/announcements[/:id]` | Signed-in, scoped | List supports `audience` filter. |
| POST / PATCH / DELETE `/announcements[/:id]` | Staff, scoped | Create and edit use `title`, `body`, `category`, `audience`, and `targetId` for section or course. Faculty edit or delete their own notices within assignments. |
| GET `/reports/attendance` | Signed-in, scoped | Accepts `threshold` (default 75), `belowOnly=true`, `courseId` and `sectionId`. |
| GET `/reports/enrollment` | Admin, faculty | `groupBy=section\|course`, default section. Faculty totals cover sections they teach. |

An attendance mark uses `{"studentId":"<student ObjectId>","status":"present"}`. Status is one of `present`, `absent`, `late` and `excused`. Announcement audiences are `university`, `course`, `section`. Categories are `Academic`, `Campus`, `Event`. A university announcement has a null or omitted target.

A scoped GET by ID returns 404 for an invisible record. Role-restricted actions return 403. Invalid field values return 400. Duplicate enrolments, duplicate sessions, conflicting updates and deletion of referenced records return 409. A failed login or invalid/expired access token returns 401. Oversized bodies return 413. Login and session endpoints can return 429.

Example error response:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "A matching campus record already exists.",
    "requestId": "example-request-id"
  }
}
```

Socket.IO uses the same origin and receives a valid access JWT in `handshake.auth.token`. The server sends `announcement:changed` and `attendance:changed` with an empty object to authorized recipients. The client refreshes the scoped REST resources to show the latest data. See [websockets.md](websockets.md).
