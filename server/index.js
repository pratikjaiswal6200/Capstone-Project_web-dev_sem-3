import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { models } from './models.js';
import { connectRealtime } from './realtime.js';

const config = loadConfig();
let realtime;
try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all(models.map(Model => Model.init()));
  const runtime = createApp({ config, staticDirectory: fileURLToPath(new URL('../dist', import.meta.url)) });
  const server = createServer(runtime.app);
  realtime = connectRealtime(server, { ...runtime, config });
  await new Promise((ready, reject) => server.once('error', reject).listen(config.port, config.bind, ready));
  console.info(`Campus API listening at http://${config.bind}:${config.port}`);
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    await realtime.close();
    await mongoose.disconnect();
  }
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} catch (error) {
  console.error(`Campus API startup failed: ${error.message}`);
  if (realtime) await realtime.close();
  await mongoose.disconnect();
  process.exitCode = 1;
}
