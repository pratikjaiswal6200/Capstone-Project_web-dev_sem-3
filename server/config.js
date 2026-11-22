import 'dotenv/config';

export function loadConfig(env = process.env) {
  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!env[name] || env[name].length < 32) throw new Error(`${name} must contain at least 32 characters.`);
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) throw new Error('Use distinct JWT secrets.');
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  const production = env.NODE_ENV === 'production';
  const origin = env.PUBLIC_ORIGIN;
  if (production && (!origin || new URL(origin).protocol !== 'https:' || new URL(origin).origin !== origin)) {
    throw new Error('PUBLIC_ORIGIN must be an HTTPS origin in production.');
  }
  const port = Number(env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  return {
    mongoUri: env.MONGODB_URI,
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    production,
    allowedOrigins: new Set([origin, ...(!production ? [
      `http://127.0.0.1:${port}`, `http://localhost:${port}`,
      'http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:4173', 'http://localhost:4173',
    ] : [])].filter(Boolean)),
    port,
    bind: env.BIND_ADDRESS || '127.0.0.1',
  };
}
