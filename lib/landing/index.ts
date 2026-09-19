import { LANDING_LINKS } from "@/lib/landing/links";
import type { LandingPageContent } from "@/lib/landing/types";
import { socialMediaMarketing } from "@/lib/landing/pages/socialMediaMarketing";
import { liveEvents } from "@/lib/landing/pages/liveEvents";
import { uxUiDesign } from "@/lib/landing/pages/uxUiDesign";
import { softwareEntwicklung } from "@/lib/landing/pages/softwareEntwicklung";
import { shoppingCenterMarketing } from "@/lib/landing/pages/shoppingCenterMarketing";

// To add a landing page: create a content file in ./pages, register it here and add
// its slug to LANDING_LINKS (navigation, footer and sitemap follow automatically).
export const LANDING_PAGES: LandingPageContent[] = [
  socialMediaMarketing,
  liveEvents,
  uxUiDesign,
  softwareEntwicklung,
  shoppingCenterMarketing,
];

export function getLandingPage(slug: string): LandingPageContent | undefined {
  return LANDING_PAGES.find((page) => page.slug === slug);
}

/** Short nav label of a page, e.g. for cross-links between landing pages. */
export function landingLabel(slug: string): string {
  return LANDING_LINKS.find((link) => link.slug === slug)?.label ?? slug;
}
