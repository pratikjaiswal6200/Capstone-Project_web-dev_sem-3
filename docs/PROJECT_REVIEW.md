# Project review

## Problem and solution

Routine academic administration spans account, course, attendance and communications workflows. The capstone puts them in one role-based workspace and offers an interactive campus view.

## Demo walkthrough

1. Open the overview and select a landmark in the aerial view. Switch to 3D, orbit and use the camera tour.
2. Sign in to the seeded API as administrator. Open a section's roster and enrol a student. Attempt a duplicate via the API to verify the conflict response.
3. Sign in as faculty. Mark attendance on an assigned section and correct a mark with a reason.
4. Sign in as the student in a separate browser profile. Verify that the student's record contains only their mark. Review the subject summary.
5. Publish a section notice from the faculty profile. Verify the student receives it and that it remains available after refresh.
6. Use the reports screen to check the threshold filter and section enrolment counts.

## Verification

`npm test` covers in-memory API validation and authorization, attendance business rules and scoped demo data. Run the optional MongoDB test with the command in [README.md](../README.md) to exercise persistence, duplicate conflicts, session rotation and WebSockets. The introductory release uses synthetic records and illustrative campus visuals.

The initial browser check confirmed the local sample opens, the 3D tour focuses Block A, the administrator can open the student form, and the student view shows scoped attendance. The production build passed.

On 22 November 2026, `npm run test:integration` passed all seven checks with a disposable MongoDB instance. The end-to-end test verified stored attendance and announcements, role-scoped reads, corrections, report results, token rotation, live Socket.IO events over WebSocket and disconnection after logout.
