import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.weather\.gov\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "nws-weather",
        expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 },
        networkTimeoutSeconds: 6,
      },
    },
    {
      urlPattern: ({ request, url }) =>
        url.pathname.startsWith("/api/rules/evaluate"),
      handler: "NetworkOnly",
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};

export default withPWA(nextConfig);
