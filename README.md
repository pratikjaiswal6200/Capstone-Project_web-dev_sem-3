# KRMU Campus

University Campus Management System for the Backend Development capstone. The workspace combines an interactive campus explorer with student, faculty, course, section, attendance and announcement workflows.

## Run the sample workspace

If you have the standalone `KRMU-Campus-Preview.html`, open it in a browser to try the sample without installing dependencies. From a source checkout, `npm run preview:file` generates this file after you install dependencies.

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The sample starts as an administrator using fictional records. The profile menu lets you try the faculty and student views. Sample changes are saved in your browser. The campus explorer has a photo-style aerial rendering and an orbitable Three.js model. Both are approximate visualizations.

## Run the database-backed workspace

1. Start MongoDB 8 locally. For example, use `docker run --rm -p 127.0.0.1:27017:27017 mongo:8` in a dedicated terminal.
2. Copy `.env.example` to `.env`. Set two different secrets, each generated with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Set `DEMO_SEED_PASSWORD` to a password for the fictional accounts.
3. Run `npm run seed`, then `npm run api` in a dedicated terminal.
4. Run `npm run dev` in another terminal. In the profile menu, choose **Sign in to API**. Use `admin@campus.example`, `faculty@campus.example` or `student@campus.example` with the demo seed password you configured.

`npm run build` builds static assets into `dist/`. `npm start` serves the compiled frontend and API together. The API uses port 4000 by default. The development proxy is configured in [vite.config.js](vite.config.js).

## Verify

```sh
npm test
npm run test:integration
npm run build
```

The first command checks validation, role scoping, attendance calculations and Express requests in memory. The integration runner starts a disposable local MongoDB using an installed `mongod` binary and records the result in `integration-test.log`. It exercises login, authorization, persisted attendance and announcements, reports, token rotation and live Socket.IO events over WebSocket. Set `MONGOD_BINARY` to point to a local executable or set `MONGODB_TEST_URI` to use an existing test server. The runner uses a uniquely named test database.

## Documentation

| Document | Content |
| --- | --- |
| [Project overview](docs/00_PROJECT_OVERVIEW.md) | Scope, roles and workflows |
| [API contract](docs/01_API_CONTRACT.md) | Endpoints, inputs, errors and events |
| [Frontend phase](docs/02_FRONTEND_PHASE.md) | UI, campus sources and acceptance checks |
| [Implementation map](docs/07_IMPLEMENTATION_MAP.md) | Phase ownership and source locations |
| [Architecture](docs/architecture.md) | Request flow and consistency guarantees |
| [Data model](docs/data-model.md) | MongoDB collections and relationships |
| [Project review](docs/PROJECT_REVIEW.md) | Demo walkthrough and verification status |
