import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { constants, createWriteStream } from 'node:fs';
import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { mongo } from 'mongoose';

const root = new URL('../', import.meta.url);
const report = createWriteStream(new URL('integration-test.log', root));
let daemon;
let testRun;
let dbPath;
let mongoLog;

function output(message) {
  console.info(message);
  report.write(`${message}\n`);
}

async function findMongo() {
  if (process.env.MONGOD_BINARY) return process.env.MONGOD_BINARY;
  const binary = process.platform === 'win32' ? 'mongod.exe' : 'mongod';
  const paths = (process.env.PATH || '').split(delimiter).filter(Boolean).map(directory => join(directory, binary));
  const cache = join(homedir(), '.cache', 'mongodb-binaries');
  const cached = await readdir(cache, { withFileTypes: true }).catch(() => []);
  paths.push(...cached.filter(file => file.isFile() && /^mongod(?:-[\w-]+-\d+\.\d+\.\d+)?(?:\.exe)?$/.test(file.name))
    .map(file => join(cache, file.name)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })));
  for (const path of paths) {
    try {
      await access(path, constants.X_OK);
      return path;
    } catch {
      // Try the next installation.
    }
  }
  throw new Error('MongoDB was not found. Install mongod, set MONGOD_BINARY, or set MONGODB_TEST_URI for a test server.');
}

async function loopbackPort() {
  const probe = createServer();
  const listening = once(probe, 'listening');
  probe.listen(0, '127.0.0.1');
  await listening;
  const { port } = probe.address();
  await new Promise(resolve => probe.close(resolve));
  return port;
}

async function startMongo() {
  const port = await loopbackPort();
  const executable = await findMongo();
  dbPath = await mkdtemp(join(tmpdir(), 'krmu-integration-'));
  mongoLog = join(dbPath, 'mongod.log');
  daemon = spawn(executable, ['--dbpath', dbPath, '--bind_ip', '127.0.0.1', '--port', String(port), '--nounixsocket', '--logpath', mongoLog], { stdio: 'ignore' });
  let launchError;
  daemon.on('error', error => { launchError = error; });
  const uri = `mongodb://127.0.0.1:${port}/?directConnection=true`;
  const deadline = Date.now() + 12000;
  let probeError;
  while (!launchError && daemon.exitCode === null && daemon.signalCode === null && Date.now() < deadline) {
    const client = new mongo.MongoClient(uri, { serverSelectionTimeoutMS: 500 });
    try {
      await client.connect();
      return uri;
    } catch (error) {
      probeError = error;
    } finally {
      await client.close();
    }
    await delay(150);
  }
  throw launchError || new Error(`Disposable MongoDB did not start${probeError ? `: ${probeError.message}` : '.'}`);
}

function stop() {
  testRun?.kill();
  daemon?.kill();
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
  // Probe even with an explicit MongoDB URI. Socket.IO also needs a loopback port.
  const configuredUri = process.env.MONGODB_TEST_URI;
  if (configuredUri) await loopbackPort();
  const uri = configuredUri || await startMongo();
  output(`Running MongoDB and WebSocket integration checks (${new Date().toISOString()}).`);
  testRun = spawn(process.execPath, ['--test', 'test/campus.test.js'], {
    cwd: root,
    env: { ...process.env, MONGODB_TEST_URI: uri },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const [stream, terminal] of [[testRun.stdout, process.stdout], [testRun.stderr, process.stderr]]) {
    stream.pipe(terminal, { end: false });
    stream.pipe(report, { end: false });
  }
  const [code] = await once(testRun, 'close');
  process.exitCode = code ?? 1;
  output(`Integration test exit code: ${process.exitCode}`);
} catch (error) {
  process.exitCode = 1;
  output(`Integration test could not start: ${error.message}`);
  if (mongoLog) {
    const diagnostics = await readFile(mongoLog, 'utf8').catch(() => '');
    const failures = diagnostics.split('\n').filter(line => /"s":"[EF]"/.test(line));
    if (failures.length) output(failures.slice(-3).join('\n'));
  }
} finally {
  if (daemon?.pid && daemon.exitCode === null && daemon.signalCode === null) {
    const exited = once(daemon, 'exit');
    daemon.kill();
    await exited;
  }
  if (dbPath) await rm(dbPath, { recursive: true, force: true });
  report.end();
}
