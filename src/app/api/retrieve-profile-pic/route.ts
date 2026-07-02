import { SocialPlatform } from '@/types';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');
  const platform = searchParams.get('platform') as SocialPlatform;

  let profilePicUrl: string | null = '/user.jpg';

  if (
    !username ||
    !platform ||
    !Object.values(SocialPlatform).includes(platform)
  ) {
    // just return back default image for now - not handling this kind of error yet
    return NextResponse.json({ profilePicUrl }, { status: 200 });
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
    case SocialPlatform.Linkedin:
      profilePicUrl = await fetchLinkedinProfilePic(username);
      break;
  }

  if (profilePicUrl === null) {
    return NextResponse.json({}, { status: 404 });
  }

  return NextResponse.json({ profilePicUrl }, { status: 200 });
}

const fetchTwitterProfilePic = async (username: string) => {
  const endpoint = `https://api.fxtwitter.com/${username}`;
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
  const endpoint = `https://api.github.com/users/${username}`;
  const response = await fetch(endpoint).then((res) =>
    res.ok ? res.json() : null,
  );

  if (response === null) {
    return null;
  }
  return response.avatar_url;
};

const fetchGitlabProfilePic = async (username: string) => {
  const endpoint = `https://gitlab.com/api/v4/users?username=${username}`;
  const response = await fetch(endpoint).then((res) =>
    res.ok ? res.json() : null,
  );

  if (response === null) {
    return null;
  }
  return response[0].avatar_url;
};

const fetchBlueskyProfilePic = async (username: string) => {
  const endpoint = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${username}`;
  const response = await fetch(endpoint).then((res) =>
    res.ok ? res.json() : null,
  );

  if (response === null) {
    return null;
  }
  return response.avatar;
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
      // Instagram CDN URLs are signed/expiring and are served with
      // `cross-origin-resource-policy: same-origin` and no CORS headers, so
      // browsers refuse to load them cross-origin (canvas use would fail).
      // wsrv.nl (images.weserv.nl) re-serves the image with
      // `access-control-allow-origin: *`, which makes it canvas-safe.
      return `https://wsrv.nl/?url=${encodeURIComponent(profilePicUrl)}`;
    }
  }
  return null;
};

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

  return null;
};

const normalizeLinkedinHandle = (input: string) => {
  const trimmed = input.trim();
  // Accept a bare handle, "in/{handle}", "/in/{handle}/", or a full pasted
  // profile URL.
  const urlMatch =
    trimmed.match(/linkedin\.com\/(?:in|pub)\/([^/?#]+)/i) ??
    trimmed.match(/^\/?in\/([^/?#]+)/i);
  const raw =
    urlMatch?.[1] ?? trimmed.replace(/^@/, '').split(/[/?#]/)[0] ?? '';
  const handle = raw.trim();
  return /^[A-Za-z0-9%\-_.]{1,120}$/.test(handle) ? handle : null;
};

// Opportunistic: free and quota-less, but LinkedIn 999-blocks datacenter IPs
// unpredictably; failures fall through to unavatar.
const fetchViaLinkedinOgImage = async (handle: string) => {
  const html = await fetch(
    `https://www.linkedin.com/in/${encodeURIComponent(handle)}`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    },
  )
    .then((res) => (res.ok ? res.text() : null))
    .catch(() => null);

  if (html === null) {
    return null;
  }
  const match =
    html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/);
  const url = match?.[1]?.replace(/&amp;/g, '&') ?? null;
  // Authwall pages either lack og:image or point at a generic
  // static.licdn.com logo.
  if (url === null || !url.includes('media.licdn.com/dms/image')) {
    return null;
  }
  return url;
};

// Fallback: unavatar.io scrapes via its own proxies (immune to our egress IP
// reputation). Keyless; ~25 uncached requests/day per client IP; 404 for
// missing profiles.
const fetchViaUnavatar = async (handle: string) => {
  const endpoint = `https://unavatar.io/linkedin/${encodeURIComponent(handle)}?json&fallback=false`;
  const response: unknown = await fetch(endpoint, {
    signal: AbortSignal.timeout(10000),
  })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  if (response === null || typeof response !== 'object') {
    return null;
  }
  const url = (response as { url?: unknown }).url;
  return typeof url === 'string' && url.startsWith('http') ? url : null;
};

// media.licdn.com URLs are signed; they break when the user changes their
// photo, so they must be re-fetched on demand rather than persisted. The
// photo is only available when the member's public-profile visibility
// exposes it.
const fetchLinkedinProfilePic = async (username: string) => {
  const handle = normalizeLinkedinHandle(username);
  if (handle === null) {
    return null;
  }
  return (
    (await fetchViaLinkedinOgImage(handle)) ?? (await fetchViaUnavatar(handle))
  );
};
