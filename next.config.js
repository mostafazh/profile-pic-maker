/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: '*.twimg.com',
      },
      {
        hostname: 'avatars.githubusercontent.com',
      },
      {
        hostname: 'secure.gravatar.com',
      },
      {
        hostname: 'gitlab.com',
      },
      {
        hostname: 'cdn.bsky.app',
        pathname: '/img/avatar/plain/**',
      },
      {
        // Instagram avatars are proxied through wsrv.nl to add CORS headers.
        hostname: 'wsrv.nl',
      },
      {
        // Stable Facebook Page picture URL (302s to a fresh signed fbcdn URL).
        hostname: 'graph.facebook.com',
        pathname: '/*/picture',
      },
      {
        hostname: 'media.licdn.com',
        pathname: '/dms/image/**',
      },
      {
        // Fallback avatar resolver for Facebook and LinkedIn.
        hostname: 'unavatar.io',
      },
    ],
  },
};

module.exports = nextConfig;
