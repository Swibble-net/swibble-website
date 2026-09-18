import Head from "next/head";

const SITE_URL = "https://swibble.net";
const COMPANY_NAME = "Swibble UG";
const TWITTER_HANDLE = "@swibble_net";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: object | object[];
  /** Blog posts: enables og:type=article plus publish/modify dates for reader modes and previews. */
  article?: { publishedTime: string; modifiedTime?: string };
}

export default function SEO({
  title = "Swibble – Social Media, Live-Events, Design & Software",
  description = "Swibble ist deine Digitalagentur für Social Media, Live-Events, Design & Software – bundesweit im Einsatz. Jetzt kostenloses Erstgespräch sichern.",
  canonical,
  ogImage = `${SITE_URL}/og-image.png`,
  noIndex = false,
  jsonLd,
  article,
}: SEOProps) {
  // Titles that already lead with the brand don't get the company suffix (keeps them < 60 chars).
  const fullTitle =
    title.includes(COMPANY_NAME) || title.startsWith("Swibble")
      ? title
      : `${title} | ${COMPANY_NAME}`;

  const schemas = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={`${SITE_URL}${canonical}`} />}
      <meta
        name="robots"
        content={noIndex ? "noindex, nofollow" : "index, follow"}
      />
      <meta
        name="googlebot"
        content={noIndex ? "noindex, nofollow" : "index, follow"}
      />

      {/* Open Graph */}
      <meta property="og:type" content={article ? "article" : "website"} />
      {article && (
        <>
          <meta property="article:published_time" content={article.publishedTime} />
          {article.modifiedTime && (
            <meta property="article:modified_time" content={article.modifiedTime} />
          )}
        </>
      )}
      <meta property="og:site_name" content={COMPANY_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical ? `${SITE_URL}${canonical}` : SITE_URL} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="de_DE" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Head>
  );
}
