import * as Sentry from '@sentry/node';

const enabled = process.env.SENTRY_ENABLED === 'true';
const dsn = process.env.SENTRY_DSN?.trim();
const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';
const release = process.env.SENTRY_RELEASE?.trim() || undefined;

if (enabled && dsn) {
  Sentry.init({
    dsn,
    environment,
    release,
    sendDefaultPii: false,
    attachStacktrace: true,

    // Capture handled errors that DPA intentionally logs with console.error().
    // Express errors, uncaught exceptions, and unhandled rejections remain
    // covered by the SDK's normal Node/Express integrations.
    integrations: [
      Sentry.captureConsoleIntegration({ levels: ['error'] }),
    ],

    beforeSend(event) {
      if (event.request) {
        // Never transmit request bodies.
        delete event.request.data;

        // Query strings may contain tokens, emails, IDs, etc.
        delete event.request.query_string;

        if (event.request.headers) {
          const headers = { ...event.request.headers };

          const sensitiveHeaders = [
            'authorization',
            'cookie',
            'set-cookie',
            'x-api-key',
            'x-auth-token',
            'x-access-token',
          ];

          for (const name of sensitiveHeaders) {
            for (const key of Object.keys(headers)) {
              if (key.toLowerCase() === name) {
                headers[key] = '[Filtered]';
              }
            }
          }

          event.request.headers = headers;
        }

        // Cookies should never be sent separately either.
        delete event.request.cookies;
      }

      // Be conservative with automatically attached user data.
      if (event.user) {
        event.user = event.user.id ? { id: event.user.id } : undefined;
      }

      return event;
    },
  });

  console.log(
    `[bugsink] error reporting enabled for ${environment}; release=${release ?? 'unset'}`
  );
} else {
  console.log('[bugsink] error reporting disabled');
}
