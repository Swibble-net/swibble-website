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
    "Swibble ist eine Digitalagentur aus Aachen, die Unternehmen mit Web- & App-Entwicklung, UX/UI-Design, digitaler Beratung und Qualitätskontrolle dabei unterstützt, ihre digitale Präsenz auf das nächste Level zu bringen.",
  email: "contact@swibble.net",
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
    name: "Digitale Dienstleistungen",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "UX/UI Design",
          description:
            "Entwurf ansprechender Designs für Software, druckbare Medien und Werbematerialien.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Web- & App-Entwicklung",
          description:
            "Entwicklung individueller Web- und Mobilanwendungen, die genau auf dein Unternehmen zugeschnitten sind.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Digitale Beratung",
          description:
            "Strategische Beratung zur Stärkung der Kunden-Unternehmens-Beziehung und digitalen Markenbildung.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Qualitätskontrolle",
          description:
            "Sicherstellung von Sicherheit, Stabilität und Funktionalität deiner Software durch systematische Tests.",
        },
      },
    ],
  },
  sameAs: [
    "https://www.instagram.com/swibble",
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
