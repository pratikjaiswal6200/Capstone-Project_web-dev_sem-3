# MongoDB setup

Start a local MongoDB 8 server, choose the `krmu_campus` database and set `MONGODB_URI` in `.env`. Use `npm run seed` to populate fictional demonstration accounts and academic records. The seed is opt-in, checks the local database name and uses deterministic IDs so re-running it fills missing seeded records without replacing existing data.

Run `MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm test` to verify workflows in a temporary database. Its random name isolates it from the demonstration data.
