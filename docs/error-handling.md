# Error handling

The API returns an error envelope with `code`, `message` and `requestId`. Invalid schema input, JSON and reference fields return 400. Missing or expired authentication returns 401 and insufficient roles or forbidden browser origins return 403. Scoped lookups return 404 for unavailable records. Duplicate indexes and stale revisions return 409.

The handler logs unexpected errors with their request ID and returns a generic 500 message. UI form failures remain inside the form so the entered values can be corrected.
