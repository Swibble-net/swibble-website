import type { GetServerSideProps } from "next";

const SITE_URL = "https://swibble.net";

const crawlablePaths = [
  { path: "", priority: "1.0", changefreq: "weekly" },
  { path: "/card", priority: "0.5", changefreq: "monthly" },
  { path: "/redirect/poster", priority: "0.3", changefreq: "monthly" },
];

function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const urls = crawlablePaths
    .map(
      ({ path, priority, changefreq }) => `
  <url>
    <loc>${SITE_URL}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    )
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default Sitemap;
