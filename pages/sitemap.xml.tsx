import type { GetServerSideProps } from "next";
import { getAllPosts } from "@/lib/blog/posts";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { toIsoDate } from "@/lib/blog/format";

const SITE_URL = "https://swibble.net";

const crawlablePaths = [
  { path: "", priority: "1.0", changefreq: "weekly" },
  { path: "/blog", priority: "0.8", changefreq: "weekly" },
  { path: "/card", priority: "0.5", changefreq: "monthly" },
  { path: "/redirect/poster", priority: "0.3", changefreq: "monthly" },
];

function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const staticUrls = crawlablePaths
    .map(
      ({ path, priority, changefreq }) => `
  <url>
    <loc>${SITE_URL}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    )
    .join("");

  let postUrls = "";
  if (isFirebaseConfigured()) {
    const posts = await getAllPosts("newest");
    postUrls = posts
      .map(
        (post) => `
  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${toIsoDate(post.updatedAt || post.createdAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
      )
      .join("");
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${postUrls}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default Sitemap;
