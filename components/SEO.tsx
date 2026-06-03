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
}

export default function SEO({
  title = "Swibble – Digitalagentur aus Aachen",
  description = "Swibble ist deine Digitalagentur aus Aachen. Wir helfen Unternehmen mit Design, Web- & App-Entwicklung, Beratung und Qualitätskontrolle dabei, den nächsten Meilenstein in der digitalen Welt zu erreichen.",
  canonical,
  ogImage = `${SITE_URL}/og-image.png`,
  noIndex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = title.includes(COMPANY_NAME)
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
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
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
