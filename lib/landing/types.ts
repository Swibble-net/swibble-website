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

/** A reference without a blog case study, shown as an unlinked tile. */
export interface LandingReference {
  kicker: string;
  title: string;
  image: LandingImageKey;
  imageAlt: string;
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
    image: LandingImageKey;
    imageAlt: string;
  };
  proof: {
    title: string;
    text: string;
    /** Blog slugs; each needs a fallback entry in lib/landing/caseStudies.ts. */
    caseStudies: string[];
    references?: LandingReference[];
    /** Short facts that are documented in the blog case studies. */
    facts?: { value: string; label: string }[];
    /** Only real, published customer quotes. */
    quote?: { text: string; author: string; href: string };
    /** `alt` values from lib/companiesLogos.ts. */
    logos: string[];
  };
  services: {
    title: string;
    intro: string;
    items: { title: string; text: string }[];
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
