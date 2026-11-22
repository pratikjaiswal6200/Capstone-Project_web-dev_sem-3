# Project overview

**KRMU Campus** supports routine academic operations for an administrator, a faculty member and a student. The public-facing portion of this capstone is a campus explorer using a generated aerial image and a simplified interactive 3D model informed by the published campus plan.

| Role | Primary workflows |
| --- | --- |
| Administrator | Create and edit student and faculty accounts, maintain courses and sections, assign faculty, enrol students, review attendance and publish university notices. |
| Faculty | View assigned courses and section rosters, mark or correct attendance, publish announcements for assigned courses or sections. |
| Student | View their profile, enrolled classes, their own attendance history and audience-appropriate announcements. |

The stack is React, Vite and Three.js on the frontend, and Node.js, Express, MongoDB, Mongoose and Socket.IO on the backend. Demo records are fictional. The authenticated API uses database accounts and resource-level authorization.

Success for the first release means an evaluator can follow the workflows in [PROJECT_REVIEW.md](PROJECT_REVIEW.md) from seeded accounts and use a repeatable API test command. Production deployment, institutional identity integration and surveyed campus geometry require separate work.
