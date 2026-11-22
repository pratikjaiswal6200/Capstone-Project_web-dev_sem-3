# Debugging

- If the frontend opens but sign-in fails, confirm the API terminal reached its startup message and check `GET /api/health`.
- If MongoDB startup fails, verify the connection string, reachability and index initialization. Run the seed after setting the local database and demo password.
- Compare `X-Request-Id` on the response with the corresponding server log. The request logger excludes request bodies and tokens.
- For HTTP 409 during attendance correction, reload the session before editing again.
- For a missing live notice, verify audience membership and Socket.IO account identity. Reload REST history to confirm the persisted result.
- If 3D fails, verify WebGL support. The aerial view and landmark list remain available.
