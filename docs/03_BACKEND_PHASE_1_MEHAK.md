# Backend phase 1 · Mehak

**Scope** · Express setup, middleware, runtime configuration and accounts.

- Maintain the request pipeline and consistent HTTP envelopes in `server/app.js` and `server/http.js`.
- Maintain environment parsing in `server/config.js` and JWT session flows in `server/controllers/auth.js`.
- Verify invalid credentials, missing tokens, forbidden origins, refresh rotation and logout.
- Maintain profile updates and administrator-controlled account creation. Coordinate account fields with the data phase.

Acceptance requires protected routes to reject invalid sessions, password hashes to stay out of responses and the startup command to reject missing secrets.
