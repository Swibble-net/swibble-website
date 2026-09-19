import { LANDING_LINKS, landingPath } from "@/lib/landing/links";

// Static, indexable pages of the sitemap; blog posts are appended in pages/sitemap.xml.tsx.
export const crawlablePaths = [
  { path: "", priority: "1.0", changefreq: "weekly" },
  ...LANDING_LINKS.map(({ slug }) => ({
    path: landingPath(slug),
    priority: "0.9",
    changefreq: "monthly",
  })),
  { path: "/blog", priority: "0.8", changefreq: "weekly" },
];
