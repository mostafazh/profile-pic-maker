import * as Sentry from '@sentry/nextjs';

/**
 * Report a server-side error to Sentry from the edge runtime. Thin wrapper
 * over the project's @sentry/nextjs setup (see sentry.edge.config.ts) so the
 * shared DSN, the production-only `beforeSend` filter, and the PII-off
 * settings all apply here too.
 */
export async function reportServerError(
  message: string,
  extra?: Record<string, string>,
) {
  Sentry.captureMessage(message, { level: 'error', extra });
  // Edge/serverless runtimes can freeze right after the response is returned,
  // dropping the still-in-flight transport request; flush to force delivery.
  await Sentry.flush(2000);
}
