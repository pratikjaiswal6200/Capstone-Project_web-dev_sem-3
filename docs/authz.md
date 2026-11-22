# Authorization

| Operation | Administrator | Faculty | Student |
| --- | --- | --- | --- |
| Edit own display name | Yes | Yes | Yes |
| Edit academic catalogue and account records | Yes | Read assigned scope | Read enrolled scope |
| Assign faculty and enrol students | Yes | Read assigned rosters | Read own enrolments |
| Read attendance | All | Assigned sections | Own marks in enrolled sections |
| Mark/correct attendance | Any section | Assigned section | — |
| Publish announcements | All audiences | Assigned course or section | — |
| Read notices | All | University and assigned courses/sections | University and enrolled courses/sections |

The server loads the user and active session on each protected request. JWT signing keys are independent, refresh cookies are HttpOnly, and stored refresh digests rotate atomically. Logout deletes the current session. A password hash is omitted from normal Mongoose queries and from output serialization.

Object IDs and audience targets are checked in controllers. The sample role switch changes fictional local views. Real API roles come from the account in MongoDB.
