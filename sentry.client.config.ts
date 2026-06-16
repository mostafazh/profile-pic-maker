// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://4a6b1cf4e6a502d96b70523febe8115d@o4509248403931136.ingest.de.sentry.io/4511576394432592',

  // Capture errors only — do not collect personally identifiable information
  // (no IP addresses or user identifiers). Session Replay is intentionally
  // omitted so we never record user sessions, inputs, or screens.
  sendDefaultPii: false,

  // Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console
  // while you're setting up Sentry.
  debug: false,
});
