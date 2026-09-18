const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Script/frame sources are an allow-list; images, media and
// connections stay open to any https origin because CMS content (blog HTML, Linkhub,
// app videos) can reference external hosts.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline': Next.js (pages router) and next/script emit inline scripts without a nonce.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https:${isDev ? " ws: http://localhost:*" : ""}`,
  "frame-src https://challenges.cloudflare.com https://player.vimeo.com https://www.youtube-nocookie.com https://www.youtube.com https://www.tiktok.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
}

module.exports = nextConfig
