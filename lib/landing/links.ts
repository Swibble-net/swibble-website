// Slugs and short labels of all landing pages. Kept free of page content so the
// header, footer and sitemap can import it without pulling in the long texts.
export const LANDING_LINKS = [
  { slug: "social-media-marketing", label: "Social Media" },
  { slug: "live-events", label: "Live-Events" },
  { slug: "ux-ui-design", label: "Design" },
  { slug: "software-entwicklung", label: "Software-Entwicklung" },
  { slug: "shopping-center-marketing", label: "Für Shopping-Center" },
] as const;

export type LandingSlug = (typeof LANDING_LINKS)[number]["slug"];

export const landingPath = (slug: string) => `/${slug}`;
