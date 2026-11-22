# Node.js notes

The project uses ESM modules and the Node HTTP server for Express and Socket.IO. Configuration is read from environment variables at startup. Startup waits for the Mongo connection and indexes. Signal handlers close the live socket server and disconnect MongoDB. The test suite uses `node:test`. An internal EventEmitter bridges persistence events to connected clients.
