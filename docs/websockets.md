# Real-time updates

```mermaid
sequenceDiagram
  participant F as Staff browser
  participant A as Express API
  participant D as MongoDB
  participant S as Socket.IO
  participant U as Recipient browser
  F->>A: Publish announcement
  A->>D: Validate and persist
  D-->>A: Saved announcement
  A-->>F: 201 Created
  A->>S: Emit stored announcement event
  S-->>U: announcement:changed
  U->>A: Reload scoped history
```

The Socket.IO handshake verifies the access token and underlying session. Sockets join server-assigned user and session rooms. Before sending an invalidation, the server checks current audience membership and active sessions. A university announcement can update all active accounts. Other audiences and attendance are limited to authorized recipients. Event payloads are empty, and the recipient reloads authorized REST resources.

Access token expiry disconnects the socket, and logout disconnects its session. On reconnect the frontend retrieves missed changes through REST.
