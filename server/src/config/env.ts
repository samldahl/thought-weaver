import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    console.error(
      `Missing required environment variable: ${name}\n` +
        'Copy .env.example to .env and fill it in before starting the server.'
    );
    process.exit(1);
  }

  return value;
}

/**
 * Validated configuration.
 *
 * MONGODB_URI and SESSION_SECRET are required rather than defaulted — a missing
 * session secret used to fall back to a shared literal, which let anyone forge a
 * session cookie, and a missing database URI silently pointed at localhost.
 */
export const env = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: required('MONGODB_URI'),
  SESSION_SECRET: required('SESSION_SECRET'),
};

// AI features return a handled error when this is absent, so it stays optional.
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set — AI synthesis and clustering will be unavailable.');
}
