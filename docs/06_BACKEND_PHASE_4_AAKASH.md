# Backend phase 4 · Aakash

**Scope** · Scoped announcements, Socket.IO and end-to-end verification.

- Maintain announcement validation, historical views and staff publishing permissions.
- Maintain the EventEmitter bridge and Socket.IO recipient calculation in `server/realtime.js`.
- Verify live updates through an enrolled student connection and confirmed denial for out-of-scope audiences.
- Own repeatable release checks in `test/campus.test.js` and the demo walkthrough.

Acceptance requires a stored announcement to refresh a connected recipient's list and remain visible after reconnection.
