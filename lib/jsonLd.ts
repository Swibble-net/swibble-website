const SITE_URL = "https://swibble.net";

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE_URL}/#organization`,
  name: "Swibble UG (haftungsbeschränkt)",
  alternateName: "Swibble",
  url: SITE_URL,
  logo: `${SITE_URL}/logo/SwibbleLogo.svg`,
  image: `${SITE_URL}/og-image.png`,
  description:
    "Swibble ist eine Digitalagentur aus Aachen für Social Media, Live-Events, Design & Software-Entwicklung. Wir produzieren viralen Content, begleiten Events und entwickeln individuelle Websites und Apps.",
  email: "info@swibble.net",
  telephone: "+49-178-2632310",
  foundingDate: "2022",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Königstraße 30",
    addressLocality: "Aachen",
    postalCode: "52064",
    addressCountry: "DE",
  },
  areaServed: {
    "@type": "Country",
    name: "Deutschland",
  },
  knowsLanguage: ["de", "en"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Leistungen von Swibble",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Social Media",
          description:
            "Content-Strategie, Produktion von Reels, TikToks und Shorts sowie Betreuung deiner Social-Media-Kanäle.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Live-Events",
          description:
            "Foto- und Videobegleitung sowie Content-Produktion für Events im Unternehmen, auf Messen oder online.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Design",
          description:
            "UX/UI-Design für Software sowie Brand Design, druckbare Medien und Werbematerialien.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Software-Entwicklung",
          description:
            "Entwicklung individueller Websites, Web-Apps und mobiler Apps inklusive Qualitätssicherung.",
        },
      },
    ],
  },
  sameAs: [
    "https://www.linkedin.com/company/swibble",
  ],
};

export const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Swibble",
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "de-DE",
};
