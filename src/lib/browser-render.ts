import { reportServerError } from '@/lib/sentry';

/**
 * Fetch a page's fully rendered HTML via Cloudflare Browser Rendering's REST
 * API (a managed headless Chrome). This is the only way to use a real browser
 * from Pages Functions: Puppeteer/Playwright binaries cannot execute inside
 * the Workers runtime, and the REST endpoint needs no npm dependency or
 * wrangler binding — just an account id and an API token with the
 * "Browser Rendering - Edit" permission.
 *
 * The Workers Free plan includes 10 browser-minutes/day (429 afterwards), so
 * this must stay the LAST tier of every fetch chain, and each render is kept
 * cheap by blocking images/media/fonts/styles — we only parse the rendered
 * DOM for meta tags, never pixels.
 *
 * No-ops (returns null) unless CLOUDFLARE_ACCOUNT_ID and
 * BROWSER_RENDERING_API_TOKEN are configured.
 */
export async function renderPageHtml(url: string): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.BROWSER_RENDERING_API_TOKEN;
  if (!accountId || !token) {
    return null;
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/content`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      url,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      rejectResourceTypes: ['image', 'media', 'font', 'stylesheet'],
      // waitUntil "networkidle0" fails with "execution context was destroyed"
      // on sites that do a JS navigation after load; "load" plus a settle
      // delay is what works in practice.
      gotoOptions: { waitUntil: 'load', timeout: 20000 },
      waitForTimeout: 3000,
    }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);

  if (response === null) {
    return null;
  }

  const body = (await response.json().catch(() => null)) as {
    success?: boolean;
    result?: string;
    errors?: { code?: number }[];
  } | null;

  const rateLimited =
    response.status === 429 ||
    (body?.errors ?? []).some((e) => e.code === 2001);
  if (rateLimited) {
    // Either the per-minute REST rate limit or the daily free-tier
    // browser-minutes quota (resets at UTC midnight).
    await reportServerError('browser-render: rate limited or out of quota', {
      url,
      status: String(response.status),
    });
    return null;
  }

  return body?.success && typeof body.result === 'string' ? body.result : null;
}
