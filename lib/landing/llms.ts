import { LANDING_PAGES } from "@/lib/landing";
import { landingPath } from "@/lib/landing/links";

export const LLMS_FAQ_START = "<!-- faq:start (generated from lib/landing, do not edit by hand) -->";
export const LLMS_FAQ_END = "<!-- faq:end -->";

/**
 * FAQ block of public/llms-full.txt, so AI assistants can read the answers without
 * parsing the pages. Regenerate with: UPDATE_LLMS=1 pnpm test
 */
export function renderLlmsFaq(): string {
  const sections = LANDING_PAGES.map((page) => {
    const items = page.faq
      .map(({ question, answer }) => `**${question}**\n${answer}`)
      .join("\n\n");
    return `### ${page.service.name} — https://www.swibble.net${landingPath(page.slug)}\n\n${items}`;
  });
  return [LLMS_FAQ_START, "", ...sections.flatMap((section) => [section, ""]), LLMS_FAQ_END].join("\n");
}
