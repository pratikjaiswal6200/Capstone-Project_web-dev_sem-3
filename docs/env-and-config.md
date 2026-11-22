# Environment and configuration

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Required MongoDB connection string. |
| `JWT_ACCESS_SECRET` | Required, at least 32 characters. |
| `JWT_REFRESH_SECRET` | Required, at least 32 characters and different from access secret. |
| `PORT` | HTTP port, default 4000. |
| `BIND_ADDRESS` | Interface, default 127.0.0.1. |
| `PUBLIC_ORIGIN` | Exact permitted browser origin. HTTPS required in production. |
| `NODE_ENV` | Set to production to require secure refresh cookies and a configured origin. |
| `DEMO_SEED_PASSWORD` | Explicit local-only seed password. |
| `MONGODB_TEST_URI` | Optional URI for integration tests with a separate disposable database. |

Copy `.env.example` into a local `.env`. The sample frontend needs no environment variables. Development and preview use a Vite proxy for `/api` and `/socket.io`.
