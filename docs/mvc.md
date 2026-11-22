# Model, view and controller

Mongoose models in `server/models.js` represent persistence. Route registration in `server/app.js` connects middleware to controllers for auth, catalogue and academics. Scope and input rules live in `server/scope.js` and `server/validation.js`. React renders the view and uses `src/data.js` as its API client and sample-store adapter.
