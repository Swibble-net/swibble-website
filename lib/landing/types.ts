import type { FollowerAccount } from "@/lib/landing/followers";

/** Keys of the local images a landing page may use; resolved in components/landing/images.ts. */
export type LandingImageKey =
  | "aquis"
  | "olympia"
  | "billstedt"
  | "myzeil"
  | "rushfood"
  | "littleWorld"
  | "aachenApp"
  | "rydeUp"
  | "square"
  | "konratsWelt"
  | "fynn";

/** Illustrated hero graphic, see components/landing/LandingVisual.tsx. */
export type LandingVisualKey = "social" | "events" | "design" | "software" | "map";

/** Icons of the service cards, see components/landing/icons.ts. */
export type LandingIconKey =
  | "strategy" | "video" | "mic" | "channel" | "trophy" | "chart"
  | "booth" | "program" | "camera360" | "photobox" | "signage" | "live"
  | "ux" | "ui" | "prototype" | "brand" | "print" | "handoff"
  | "website" | "webapp" | "mobile" | "design" | "qa"
  | "store" | "face" | "behind" | "plan";

/** A reference without a blog case study, shown as an unlinked tile. */
export interface LandingReference {
  kicker: string;
  title: string;
  image: LandingImageKey;
  imageAlt: string;
  /** Optional teaser, shown where a case study card has its excerpt. */
  text?: string;
  /** Optional footer line in place of the "read" link, e.g. "Case Study folgt in Kürze". */
  note?: string;
}

export interface LandingFaq {
  question: string;
  /** Plain text: rendered on the page and reused verbatim in the FAQPage JSON-LD. */
  answer: string;
}

export interface LandingPageContent {
  /** URL path without the leading slash; must match an entry in lib/landing/links.ts. */
  slug: string;
  seo: {
    /** Max. ~60 characters including the " | Swibble UG" suffix added by <SEO>. */
    title: string;
    /** ~150 characters. */
    description: string;
  };
  /** Feeds the Service JSON-LD. */
  service: {
    name: string;
    serviceType: string;
    description: string;
  };
  hero: {
    kicker: string;
    /** The page's only H1: the customer's problem, including the focus keyword. */
    title: string;
    text: string;
    visual: LandingVisualKey;
    /** Describes the illustration for screen readers. */
    visualAlt: string;
  };
  proof: {
    title: string;
    text: string;
    /** Blog slugs, clients with the most followers first; each needs a fallback in lib/landing/caseStudies.ts. */
    caseStudies: string[];
    references?: LandingReference[];
    /** TikTok follower counts; the numbers come from lib/landing/followers.ts (refreshed daily). */
    facts?: { account: FollowerAccount; label: string }[];
    /** Only real, published customer quotes. */
    quote?: { text: string; author: string; role: string; href: string };
    /**
     * `alt` values from lib/companiesLogos.ts for a fixed logo row. Without it the page
     * shows the logo carousel of the home page with all clients.
     */
    logos?: string[];
  };
  services: {
    title: string;
    intro: string;
    items: { title: string; text: string; icon: LandingIconKey }[];
  };
  process: {
    title: string;
    intro: string;
    /** Always three steps: Erstgespräch → Konzept → Umsetzung. */
    steps: [LandingStep, LandingStep, LandingStep];
  };
  faq: LandingFaq[];
  closing: {
    title: string;
    text: string;
  };
}

export interface LandingStep {
  title: string;
  text: string;
}

/** Case study as rendered on a landing page (CMS data merged over the static fallback). */
export interface LandingCaseStudy {
  slug: string;
  title: string;
  excerpt: string;
  /** Remote cover from the CMS; null means "use the local fallback image". */
  coverImage: string | null;
  coverImageAlt: string;
  fallbackImage: LandingImageKey;
}

/** Follower facts as rendered: formatted numbers plus the day they were read. */
export interface LandingFacts {
  /** `start`: followers when Swibble took over the channel. */
  items: { value: string; label: string; start: string }[];
  /** e.g. "19.09.2026" */
  date: string;
}
