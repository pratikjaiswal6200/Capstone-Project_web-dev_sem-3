# Backend phase 2 · Pratik

**Scope** · Models, catalogue, teaching assignments and enrolment.

- Maintain Mongoose schemas in `server/models.js`, resource handlers in `server/controllers/catalog.js` and academic scopes in `server/scope.js`.
- Create course and section management around validated course and faculty references.
- Maintain duplicate enrolment handling and reference checks before deleting records.
- Keep sample fixture and Mongo seed fields aligned.

Acceptance requires the administrator to assign a faculty member, enrol a student once and confirm that scoped faculty/student accounts can read the associated class.
