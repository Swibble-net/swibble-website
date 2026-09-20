import { LANDING_PAGES } from "@/lib/landing";
import { LANDING_LINKS, landingPath } from "@/lib/landing/links";

export interface RelatedService {
  href: string;
  /** Short nav label, e.g. "Social Media". */
  label: string;
  /** Service name, e.g. "Social-Media-Marketing". */
  title: string;
  text: string;
}

const MAX_RELATED = 2;

// Most specific page first, so a shopping-center case study leads to the industry page.
const PRIORITY = [
  "shopping-center-marketing",
  "live-events",
  "social-media-marketing",
  "ux-ui-design",
  "software-entwicklung",
];

// Fallback for posts no landing page references yet (matched against slug and title).
const KEYWORDS: Record<string, RegExp> = {
  "shopping-center-marketing": /einkaufszentr|shopping|center|mall/,
  "live-events": /event|messe|360|fotobox|live-content/,
  "social-media-marketing": /social|tiktok|reel|instagram|shorts/,
  "ux-ui-design": /design|\bux\b|\bui\b|brand/,
  "software-entwicklung": /software|\bapp\b|web-app|website|entwicklung/,
};

/**
 * Landing pages that fit a blog post: pages that feature the post as a case study come
 * first, keyword matches fill up. Empty when nothing fits.
 */
export function relatedServices(post: { slug: string; title: string }): RelatedService[] {
  const haystack = `${post.slug} ${post.title}`.toLowerCase();
  const byPriority = (a: string, b: string) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b);

  const featured = LANDING_PAGES.filter((page) =>
    page.proof.caseStudies.includes(post.slug),
  ).map((page) => page.slug);
  const byKeyword = LANDING_PAGES.map((page) => page.slug).filter(
    (slug) => !featured.includes(slug) && KEYWORDS[slug]?.test(haystack),
  );

  return [...featured.sort(byPriority), ...byKeyword.sort(byPriority)]
    .slice(0, MAX_RELATED)
    .flatMap((slug) => {
      const page = LANDING_PAGES.find((candidate) => candidate.slug === slug);
      const link = LANDING_LINKS.find((candidate) => candidate.slug === slug);
      if (!page || !link) return [];
      return [
        {
          href: landingPath(slug),
          label: link.label,
          title: page.service.name,
          text: page.service.description,
        },
      ];
    });
}
