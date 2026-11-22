# REST conventions

Resource nouns use plural paths. Use GET for reads, POST for creation, PATCH for changes and DELETE for removal. Attendance has a dedicated audit subresource. Reporting endpoints return aggregate data filtered by the caller's role. Record IDs are MongoDB ObjectIds. Lists accept one-based pagination and supported filter parameters per the API contract.
