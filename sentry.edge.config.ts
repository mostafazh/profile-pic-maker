// This file configures the initialization of Sentry for edge features
// (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://4a6b1cf4e6a502d96b70523febe8115d@o4509248403931136.ingest.de.sentry.io/4511576394432592',

  // Capture errors only — do not collect personally identifiable information
  // (no IP addresses, request bodies, cookies, or user identifiers).
  sendDefaultPii: false,

  // Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console
  // while you're setting up Sentry.
  debug: false,
});
