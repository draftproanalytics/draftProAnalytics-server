import * as Sentry from '@sentry/node';

const enabled = process.env.SENTRY_ENABLED === 'true';
const dsn = process.env.SENTRY_DSN?.trim();
const environment =
  process.env.APP_ENV ??
  process.env.NODE_ENV ??
  'development';
const release = process.env.SENTRY_RELEASE?.trim() || undefined;

if (enabled && dsn) {
  Sentry.init({
    dsn,
    environment,
    release,
    sendDefaultPii: false,
  });

  console.log(
    `[bugsink] error reporting enabled for ${environment}; release=${release ?? 'unset'}`,
  );
} else {
  console.log('[bugsink] error reporting disabled');
}