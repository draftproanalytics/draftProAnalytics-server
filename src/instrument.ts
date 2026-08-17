import * as Sentry from '@sentry/node';

const enabled = process.env.SENTRY_ENABLED === 'true';
const dsn = process.env.SENTRY_DSN?.trim();

if (enabled && dsn) {
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
    sendDefaultPii: false,
  });

  console.log(
    `[bugsink] error reporting enabled for ${
      process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development'
    }`
  );
} else {
  console.log('[bugsink] error reporting disabled');
}