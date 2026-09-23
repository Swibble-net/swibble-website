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
  images: {
    // Next's defaults plus 448: the hero photo is ~430 device px wide on common
    // Android phones, which otherwise jumps to the 640 px variant.
    imageSizes: [32, 48, 64, 96, 128, 256, 384, 448],
    // Blog covers uploaded through the CMS; used by next/image on the landing pages.
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/v0/b/**" },
    ],
  },
  async redirects() {
    return [
      // Alias for the application page (/bewerben); the query (?center=…) is carried over.
      { source: "/mitmachen", destination: "/bewerben", permanent: false },
      { source: "/mitmachen/:path*", destination: "/bewerben/:path*", permanent: false },
      // Short links printed on business cards and posters. Real redirects (instead of pages
      // that redirect in the browser) keep them out of search results; the UTM source keeps
      // the scans visible in analytics.
      { source: "/card", destination: "/?utm_source=visitenkarte&utm_medium=qr", permanent: true },
      { source: "/redirect/poster", destination: "/?utm_source=poster&utm_medium=qr", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
}

module.exports = nextConfig
