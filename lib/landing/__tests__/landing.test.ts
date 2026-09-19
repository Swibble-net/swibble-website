import { describe, expect, it } from "vitest";
import { LANDING_PAGES, getLandingPage } from "@/lib/landing";
import { LANDING_LINKS, landingPath } from "@/lib/landing/links";
import {
  CASE_STUDY_FALLBACKS,
  resolveCaseStudies,
} from "@/lib/landing/caseStudies";
import { companyLogos } from "@/lib/companiesLogos";
import { crawlablePaths } from "@/lib/sitemapPaths";
import { NAV_LINKS, SERVICE_LINKS } from "@/lib/navLinks";
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from "@/lib/jsonLd";
import {
  FOLLOWER_ACCOUNTS,
  fallbackSnapshot,
  formatFollowers,
  isPlausibleCount,
  parseFollowerCount,
  resolveFacts,
} from "@/lib/landing/followers";

// <SEO> appends this to every title that does not start with the brand.
const TITLE_SUFFIX = " | Swibble UG";

describe("landing page definitions", () => {
  it("registers exactly the pages listed in LANDING_LINKS", () => {
    expect(LANDING_PAGES.map((p) => p.slug).sort()).toEqual(
      LANDING_LINKS.map((l) => l.slug).sort(),
    );
    expect(new Set(LANDING_PAGES.map((p) => p.slug)).size).toBe(LANDING_PAGES.length);
    expect(getLandingPage("does-not-exist")).toBeUndefined();
  });

  it.each(LANDING_PAGES.map((page) => [page.slug, page] as const))(
    "%s has complete SEO data and content",
    (slug, page) => {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);

      expect(page.seo.title.length).toBeGreaterThan(10);
      expect((page.seo.title + TITLE_SUFFIX).length).toBeLessThanOrEqual(60);
      expect(page.seo.description.length).toBeGreaterThanOrEqual(120);
      expect(page.seo.description.length).toBeLessThanOrEqual(160);

      expect(page.hero.title.length).toBeGreaterThan(20);
      expect(page.hero.text.length).toBeGreaterThan(80);
      expect(page.hero.visualAlt.length).toBeGreaterThan(20);

      expect(page.services.items.length).toBeGreaterThanOrEqual(4);
      expect(page.process.steps.map((s) => s.title)).toEqual([
        "Erstgespräch",
        "Konzept",
        "Umsetzung",
      ]);

      expect(page.faq.length).toBeGreaterThanOrEqual(4);
      expect(page.faq.length).toBeLessThanOrEqual(6);
      for (const { question, answer } of page.faq) {
        expect(question.endsWith("?")).toBe(true);
        expect(answer.length).toBeGreaterThan(40);
      }
    },
  );

  it.each(LANDING_PAGES.map((page) => [page.slug, page] as const))(
    "%s only references known case studies, logos and images",
    (_slug, page) => {
      const { caseStudies, references = [], logos = [] } = page.proof;
      expect(caseStudies.length + references.length).toBeGreaterThan(0);
      for (const slug of caseStudies) {
        expect(CASE_STUDY_FALLBACKS[slug]?.slug).toBe(slug);
      }
      const knownLogos = companyLogos.map((logo) => logo.alt);
      for (const logo of logos) expect(knownLogos).toContain(logo);
      for (const reference of references) expect(reference.imageAlt).not.toBe("");
    },
  );

  it("does not duplicate copy between pages", () => {
    const seen = new Map<string, string>();
    for (const page of LANDING_PAGES) {
      const texts = [
        page.seo.title,
        page.seo.description,
        page.hero.title,
        page.hero.text,
        page.proof.text,
        page.closing.text,
        ...page.services.items.map((i) => i.text),
        ...page.process.steps.map((s) => s.text),
        ...page.faq.flatMap((f) => [f.question, f.answer]),
      ];
      for (const text of texts) {
        expect(seen.get(text), `"${text}" is used twice`).toBeUndefined();
        seen.set(text, page.slug);
      }
    }
  });
});

describe("landing page integration", () => {
  it("lists every landing page in the sitemap and the navigation", () => {
    const sitemap = crawlablePaths.map((entry) => entry.path);
    const services = NAV_LINKS.find((link) => link.children)?.children ?? [];
    for (const { slug } of LANDING_PAGES) {
      expect(sitemap).toContain(landingPath(slug));
      expect(services.map((link) => link.href)).toContain(landingPath(slug));
    }
    expect(SERVICE_LINKS).toHaveLength(LANDING_PAGES.length);
    expect(new Set(sitemap).size).toBe(sitemap.length);
  });

  it("builds Service, BreadcrumbList and FAQPage JSON-LD", () => {
    const page = LANDING_PAGES[0];
    const path = landingPath(page.slug);

    expect(serviceJsonLd({ ...page.service, path })).toMatchObject({
      "@type": "Service",
      url: `https://www.swibble.net${path}`,
      provider: { "@id": "https://www.swibble.net/#organization" },
    });

    const breadcrumb = breadcrumbJsonLd([
      { name: "Startseite", path: "/" },
      { name: page.service.name, path },
    ]);
    expect(breadcrumb.itemListElement.map((item) => item.item)).toEqual([
      "https://www.swibble.net",
      `https://www.swibble.net${path}`,
    ]);
    expect(breadcrumb.itemListElement.map((item) => item.position)).toEqual([1, 2]);

    const faq = faqJsonLd(page.faq);
    expect(faq.mainEntity).toHaveLength(page.faq.length);
    expect(faq.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: page.faq[0].question,
      acceptedAnswer: { "@type": "Answer", text: page.faq[0].answer },
    });
  });
});

describe("resolveCaseStudies", () => {
  const slug = "case-study-aquis-plaza-aachen";
  const fallback = CASE_STUDY_FALLBACKS[slug];

  it("falls back to the static copy without CMS data", () => {
    expect(resolveCaseStudies([slug, "unknown-slug"], [])).toEqual([fallback]);
  });

  it("prefers CMS data and keeps the requested order", () => {
    const other = "case-study-rushfood-aachen";
    const result = resolveCaseStudies(
      [other, slug],
      [
        {
          slug,
          title: "Neuer Titel",
          excerpt: "Eigener Teaser aus dem CMS.",
          coverImage:
            "https://firebasestorage.googleapis.com/v0/b/bucket/o/cover.jpg?alt=media",
          coverImageAlt: "Alt aus dem CMS",
        },
      ],
    );
    expect(result.map((study) => study.slug)).toEqual([other, slug]);
    expect(result[1]).toMatchObject({
      title: "Neuer Titel",
      excerpt: "Eigener Teaser aus dem CMS.",
      coverImageAlt: "Alt aus dem CMS",
    });
    expect(result[1].coverImage).toContain("firebasestorage.googleapis.com");
  });

  it("ignores truncated excerpts and covers from hosts next/image may not load", () => {
    const [study] = resolveCaseStudies(
      [slug],
      [
        {
          slug,
          title: "",
          excerpt: "Automatisch gekürzter Text…",
          coverImage: "https://evil.example/cover.jpg",
          coverImageAlt: "Fremdes Bild",
        },
      ],
    );
    expect(study).toEqual(fallback);
  });
});

describe("follower counts", () => {
  const html =
    '<script>{"userInfo":{"user":{"uniqueId":"aquisplaza.aachen","nickname":"AQUIS PLAZA"},"stats":{"followerCount":107200,"heartCount":1}}}</script>';

  it("reads the count of the requested profile only", () => {
    expect(parseFollowerCount(html, "aquisplaza.aachen")).toBe(107200);
    expect(parseFollowerCount(html, "AquisPlaza.Aachen")).toBe(107200);
    expect(parseFollowerCount(html, "billstedtcenter")).toBeNull();
    expect(parseFollowerCount("<html>captcha</html>", "aquisplaza.aachen")).toBeNull();
    expect(parseFollowerCount(html.replace("107200", "0"), "aquisplaza.aachen")).toBeNull();
  });

  it("keeps the previous value when a new one is implausible", () => {
    expect(isPlausibleCount(108000, 107200)).toBe(true);
    expect(isPlausibleCount(70, 107200)).toBe(false);
    expect(isPlausibleCount(null, 107200)).toBe(false);
    expect(isPlausibleCount(5_000_000, 107200)).toBe(false);
  });

  it("formats numbers the German way and sorts facts by reach", () => {
    expect(formatFollowers(107200)).toBe("107.200");
    const snapshot = fallbackSnapshot();
    snapshot.counts.olympia = 60_000;
    const facts = resolveFacts(
      [
        { account: "rushfood", label: "R" },
        { account: "billstedt", label: "B" },
        { account: "olympia", label: "O" },
        { account: "aquis", label: "A" },
      ],
      snapshot,
    );
    expect(facts.map((fact) => fact.label)).toEqual(["A", "O", "B", "R"]);
    expect(facts[1].value).toBe("60.000");
    expect(facts[0].start).toBe("0");
    expect(resolveFacts([{ account: "myzeil", label: "M" }], snapshot)[0].start).toBe("5.293");
    expect(resolveFacts(undefined, snapshot)).toEqual([]);
  });

  it("only uses accounts that have a fallback", () => {
    for (const page of LANDING_PAGES) {
      for (const fact of page.proof.facts ?? []) {
        expect(FOLLOWER_ACCOUNTS[fact.account].fallback).toBeGreaterThan(0);
      }
    }
  });
});
