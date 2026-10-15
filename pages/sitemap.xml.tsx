import type { GetServerSideProps } from "next";
import { getAllPosts } from "@/lib/blog/posts";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { toIsoDate } from "@/lib/blog/format";
import { crawlablePaths } from "@/lib/sitemapPaths";
import { getPublishedCreators } from "@/lib/creators/store";

const SITE_URL = "https://www.swibble.net";

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

  let creatorUrls = "";
  try {
    creatorUrls = (await getPublishedCreators())
      .map(
        (creator) => `
  <url>
    <loc>${SITE_URL}/creator/${creator.slug}</loc>
    <lastmod>${toIsoDate(creator.updatedAt || creator.createdAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`,
      )
      .join("");
  } catch {
    // The sitemap works without the creator pages.
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${postUrls}${creatorUrls}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default Sitemap;
