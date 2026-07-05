import { renderPageHtml } from '@/lib/browser-render';
import { reportServerError } from '@/lib/sentry';
import { SocialPlatform } from '@/types';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');
  const platform = searchParams.get('platform') as SocialPlatform;

  let profilePicUrl: string | null = null;

  if (
    !username ||
    !platform ||
    !Object.values(SocialPlatform).includes(platform)
  ) {
    // The client only sends enum platforms and a non-empty username, so
    // reaching this branch means a client bug or a direct API call — report
    // it instead of masking it with the default image.
    const error = !username ? 'missing_username' : 'invalid_platform';
    await reportServerError(`retrieve-profile-pic: ${error}`, {
      platform: platform ?? '',
      usernameProvided: String(Boolean(username)),
    });
    return NextResponse.json({ error }, { status: 400 });
  }

  switch (platform) {
    case SocialPlatform.Twitter:
      profilePicUrl = await fetchTwitterProfilePic(username);
      break;
    case SocialPlatform.Github:
      profilePicUrl = await fetchGithubProfilePic(username);
      break;
    case SocialPlatform.Gitlab:
      profilePicUrl = await fetchGitlabProfilePic(username);
      break;
    case SocialPlatform.Bluesky:
      profilePicUrl = await fetchBlueskyProfilePic(username);
      break;
    case SocialPlatform.Instagram:
      profilePicUrl = await fetchInstagramProfilePic(username);
      break;
    case SocialPlatform.Facebook:
      profilePicUrl = await fetchFacebookProfilePic(username);
      break;
    case SocialPlatform.Tiktok:
      profilePicUrl = await fetchTiktokProfilePic(username);
      break;
  }

  if (profilePicUrl === null) {
    // Report with the platform so failures are attributable by source in
    // Sentry (which sources fail most), matching the client-side Plausible
    // breakdown. Expected for wrong/private usernames, so keep it low-signal.
    await reportServerError('retrieve-profile-pic: profile_pic_not_found', {
      platform,
    });
    return NextResponse.json(
      { error: 'profile_pic_not_found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ profilePicUrl }, { status: 200 });
}

const fetchTwitterProfilePic = async (username: string) => {
  const endpoint = `https://api.fxtwitter.com/${encodeURIComponent(username)}`;
  const response = await fetch(endpoint).then((res) =>
    res.ok ? res.json() : null,
  );

  if (response === null) {
    return null;
  }
  const smallImageUrl = response.user.avatar_url;

  return smallImageUrl.replace('_normal', '_400x400');
};

const fetchGithubProfilePic = async (username: string) => {
  const endpoint = `https://api.github.com/users/${encodeURIComponent(username)}`;
  const response = await fetch(endpoint).then((res) =>
    res.ok ? res.json() : null,
  );

  if (response === null) {
    return null;
  }
  return response.avatar_url;
};

const fetchGitlabProfilePic = async (username: string) => {
  const endpoint = `https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`;
  const response = await fetch(endpoint).then((res) =>
    res.ok ? res.json() : null,
  );

  if (response === null) {
    return null;
  }
  return response[0].avatar_url;
};

const fetchBlueskyProfilePic = async (username: string) => {
  const endpoint = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(username)}`;
  const response = await fetch(endpoint).then((res) =>
    res.ok ? res.json() : null,
  );

  if (response === null) {
    return null;
  }
  return response.avatar;
};

const extractOgImage = (html: string) => {
  const match =
    html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/);
  return match?.[1]?.replace(/&amp;/g, '&') ?? null;
};

type InstagramWebProfile = {
  data?: {
    user?: {
      profile_pic_url_hd?: string;
      profile_pic_url?: string;
    } | null;
  };
};

const INSTAGRAM_HEADERS = {
  // Public app id used by instagram.com's own web client; the API returns 400 without it.
  'x-ig-app-id': '936619743392459',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  accept: '*/*',
};

const fetchInstagramProfilePic = async (username: string) => {
  // Same endpoint on two hosts; www.instagram.com is the fallback if
  // i.instagram.com is blocked/rate-limited from the current egress IP.
  const hosts = ['https://i.instagram.com', 'https://www.instagram.com'];

  for (const host of hosts) {
    const endpoint = `${host}/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const response = await fetch(endpoint, { headers: INSTAGRAM_HEADERS })
      .then((res) =>
        res.ok ? (res.json() as Promise<InstagramWebProfile>) : null,
      )
      .catch(() => null);

    if (response === null) {
      continue;
    }

    const user = response.data?.user;
    const profilePicUrl =
      user?.profile_pic_url_hd ?? user?.profile_pic_url ?? null;

    if (profilePicUrl) {
      return toCanvasSafeInstagramUrl(profilePicUrl);
    }
  }

  // Fallback: render the linked Threads profile (threads.com/@user) in a real
  // (managed) browser. Threads mirrors the Instagram account and its hydrated
  // page exposes the avatar in up to 640x640 — far better than the 100x100
  // og:image that Instagram's own login wall serves.
  //
  // Identity is safe to trust: Instagram and Threads share ONE unique username
  // namespace, so threads.com/@user is either the same owner as
  // instagram.com/user or does not exist — nobody can register a Threads
  // handle that collides with an existing Instagram handle. Worst case the
  // owner set a different (still their own) photo on Threads, or there is no
  // Threads profile, in which case we fall through to the Instagram render.
  const threadsHtml = await renderPageHtml(
    `https://www.threads.com/@${encodeURIComponent(username)}`,
  );
  if (threadsHtml !== null) {
    const hdAvatar = extractLargestInstagramAvatar(threadsHtml);
    if (hdAvatar !== null) {
      return toCanvasSafeInstagramUrl(hdAvatar);
    }
  }

  // Last resort: render the Instagram profile page itself. Its login wall
  // still exposes the real avatar as og:image — but only at 100x100.
  const igHtml = await renderPageHtml(
    `https://www.instagram.com/${encodeURIComponent(username)}/`,
  );
  if (igHtml !== null) {
    const avatar = extractLargestInstagramAvatar(igHtml);
    if (avatar !== null) {
      return toCanvasSafeInstagramUrl(avatar);
    }
  }
  return null;
};

// Real IG avatars live on scontent-*.cdninstagram.com under a t51.<n>-19
// asset path (-19 is the profile-pic asset family; the number changes over
// time: t51.2885-19 historically, t51.82787-19 as of mid-2026), so this also
// filters out the login wall's generic brand-logo og:image. URLs are often
// embedded in JSON-escaped hydration payloads, hence the unescaping. Returns
// the largest sNxN variant on the page.
const extractLargestInstagramAvatar = (html: string) => {
  const unescaped = html
    .replace(/\\\//g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&');
  const candidates =
    unescaped.match(/https:\/\/[^\s"'\\<>]+?t51\.\d+-19\/[^\s"'\\<>]+/g) ?? [];
  let best: { url: string; size: number } | null = null;
  for (const url of candidates) {
    const sizeMatch = url.match(/_s(\d+)x\d+/) ?? url.match(/s(\d+)x\d+/);
    const size = sizeMatch ? Number(sizeMatch[1]) : 0;
    if (best === null || size > best.size) {
      best = { url, size };
    }
  }
  return best?.url ?? null;
};

// Instagram CDN URLs are signed/expiring and are served with
// `cross-origin-resource-policy: same-origin` and no CORS headers, so
// browsers refuse to load them cross-origin (canvas use would fail).
// wsrv.nl (images.weserv.nl) re-serves the image with
// `access-control-allow-origin: *`, which makes it canvas-safe.
const toCanvasSafeInstagramUrl = (profilePicUrl: string) =>
  `https://wsrv.nl/?url=${encodeURIComponent(profilePicUrl)}`;

type FacebookPictureResponse = {
  data?: {
    url?: string;
    is_silhouette?: boolean;
  };
};

const fetchFacebookProfilePic = async (username: string) => {
  const handle = encodeURIComponent(username.trim().replace(/^@/, ''));
  if (handle === '') {
    return null;
  }

  // Keyless Graph API "picture" edge. Reliable from datacenter IPs, but only
  // resolves Facebook Pages — personal profiles return HTTP 400.
  const endpoint = `https://graph.facebook.com/${handle}/picture?width=1024&height=1024&redirect=false`;
  const response: FacebookPictureResponse | null = await fetch(endpoint)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  if (response?.data?.url && response.data.is_silhouette !== true) {
    // Return the stable redirecting URL rather than response.data.url: the
    // fbcdn URL in the response is signed and expires within days, while this
    // URL always 302s to a fresh signed image. Both the 302 and the final
    // fbcdn response send `access-control-allow-origin: *`, so it is safe for
    // client-side canvas use.
    return `https://graph.facebook.com/${handle}/picture?width=1024&height=1024`;
  }

  // Fallback: unavatar.io. Its Facebook provider is paywalled for uncached
  // names (403), but cache hits work — occasionally even for personal
  // profiles. Best-effort only; validate we actually got an image.
  const unavatarUrl = `https://unavatar.io/facebook/${handle}?fallback=false`;
  const probe = await fetch(unavatarUrl).catch(() => null);
  if (
    probe?.ok &&
    (probe.headers.get('content-type') ?? '').startsWith('image/')
  ) {
    return unavatarUrl;
  }

  // Last resort: render the page in a real (managed) browser and read its
  // og:image, which for FB Pages is the profile picture. The Graph edge above
  // is blocked from some datacenter egress IPs even for Pages.
  const html = await renderPageHtml(`https://www.facebook.com/${handle}`);
  if (html !== null) {
    const ogImage = extractOgImage(html);
    if (ogImage !== null && ogImage.includes('fbcdn.net')) {
      // Signed fbcdn URL (expires within days — fine for immediate one-shot
      // use). Proxy through wsrv.nl so it's canvas-safe and already covered
      // by the next/image allowlist.
      return `https://wsrv.nl/?url=${encodeURIComponent(ogImage)}`;
    }
  }

  return null;
};

type TiktokUniversalData = {
  __DEFAULT_SCOPE__?: {
    'webapp.user-detail'?: {
      userInfo?: {
        user?: {
          avatarLarger?: string;
          avatarMedium?: string;
        };
      };
    };
  };
};

// TikTok embeds the full user object (including a 1080x1080 avatarLarger) as
// JSON in the profile page HTML. The avatar URLs are signed/expiring but the
// CDN sends `access-control-allow-origin: *`, so they are canvas-safe as-is.
const extractTiktokAvatar = (html: string) => {
  const match = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (match === null) {
    return null;
  }
  try {
    const data = JSON.parse(match[1]) as TiktokUniversalData;
    const user = data.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user;
    return user?.avatarLarger ?? user?.avatarMedium ?? null;
  } catch {
    return null;
  }
};

const fetchTiktokProfilePic = async (username: string) => {
  // Accept "@handle", a bare handle, or a pasted profile URL.
  const urlMatch = username.match(/tiktok\.com\/@([^/?#]+)/i);
  const raw = urlMatch?.[1] ?? username.trim().replace(/^@/, '');
  const handle = raw.split(/[/?#]/)[0].trim();
  if (handle === '') {
    return null;
  }
  const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(handle)}`;

  // Plain fetch first — the user JSON is in the initial HTML, no JS needed.
  const html = await fetch(profileUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
  })
    .then((res) => (res.ok ? res.text() : null))
    .catch(() => null);
  const direct = html !== null ? extractTiktokAvatar(html) : null;
  if (direct !== null) {
    return direct;
  }

  // Fallback: managed browser render, in case TikTok bot-walls our egress IP.
  const rendered = await renderPageHtml(profileUrl);
  return rendered !== null ? extractTiktokAvatar(rendered) : null;
};
