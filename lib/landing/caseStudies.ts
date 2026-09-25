import type { BlogPost } from "@/lib/blog/types";
import type { LandingCaseStudy } from "@/lib/landing/types";

// Static copies of the blog case studies. They keep the landing pages complete when
// Firebase is not reachable at build time; live CMS data replaces title, excerpt and cover.
export const CASE_STUDY_FALLBACKS: Record<string, LandingCaseStudy> = {
  "case-study-aquis-plaza-aachen": {
    slug: "case-study-aquis-plaza-aachen",
    title: "Case Study: Aquis Plaza Aachen",
    excerpt:
      "Wie das Aquis Plaza Aachen mit authentischen TikTok-Videos, einem festen Moderator und einer klaren Strategie neue Besucher begeistert.",
    coverImage: null,
    coverImageAlt:
      "Smartphone mit einem TikTok-Video aus dem Aquis Plaza Aachen: Moderator interviewt zwei Besucherinnen",
    fallbackImage: "aquis",
  },
  "case-study-olympia-einkaufszentrum-munchen": {
    slug: "case-study-olympia-einkaufszentrum-munchen",
    title: "Case Study: Olympia-Einkaufszentrum München",
    excerpt:
      "Mehr Sichtbarkeit für das OEZ: Video-Content für TikTok und Instagram, Store-Vorstellungen und Kampagnen für Events und Aktionen.",
    coverImage: null,
    coverImageAlt:
      "Smartphone mit einem Social-Media-Video für das Olympia-Einkaufszentrum München",
    fallbackImage: "olympia",
  },
  "case-study-billstedt-center-hamburg": {
    slug: "case-study-billstedt-center-hamburg",
    title: "Case Study: Billstedt-Center Hamburg",
    excerpt:
      "Community-Aufbau und lokale Reichweite: TikTok-Challenges mit Gewinnanreizen holen eine junge Zielgruppe ins Center.",
    coverImage: null,
    coverImageAlt:
      "Smartphone mit einem TikTok-Video für das Billstedt-Center Hamburg",
    fallbackImage: "billstedt",
  },
  "case-study-myzeil-frankfurt": {
    slug: "case-study-myzeil-frankfurt",
    title: "Case Study: MyZeil Frankfurt",
    excerpt:
      "Account-Übernahme: Ein bestehender TikTok-Kanal, neu gestartet – 5.292 → 11.200 Follower in 25 Tagen.",
    coverImage: null,
    coverImageAlt:
      "Titelbild „MyZeil Frankfurt: Follower verdoppelt“ mit zwei TikTok-Videos aus dem MyZeil und dem Wert +112 % Follower",
    fallbackImage: "myzeil",
  },
  "case-study-rushfood-aachen": {
    slug: "case-study-rushfood-aachen",
    title: "Case Study: RushFood Aachen",
    excerpt:
      "Wie eine Gastro-Marke mit Trends, Challenges und Food-Content auf TikTok zum Gesprächsthema in Aachen wurde.",
    coverImage: null,
    coverImageAlt:
      "Smartphone mit einem TikTok-Video für RushFood Aachen: Gruppe vor dem Restaurant",
    fallbackImage: "rushfood",
  },
  "live-event-10-jahriger-geburtstag-von-aquis-plaza": {
    slug: "live-event-10-jahriger-geburtstag-von-aquis-plaza",
    title: "Live-Event: 10 Jahre Aquis Plaza",
    excerpt:
      "Konzeption, Organisation und Live-Content zum Jubiläum: 360°-Video-Station, digitales Glücksrad, Bühnenprogramm und Panel-Talk.",
    coverImage: null,
    coverImageAlt:
      "Smartphone mit einem Event-Video aus dem Aquis Plaza Aachen",
    fallbackImage: "aquis",
  },
  "live-content-events-social-media": {
    slug: "live-content-events-social-media",
    title: "Live Content für Events: So wird aus einem Tag Content für Wochen",
    excerpt:
      "Mit einem Live Content Studio werden Keynotes, Interviews und Eventmomente direkt vor Ort zu geplantem Social-Media-Content.",
    coverImage: null,
    coverImageAlt: "Fynn Frings von Swibble mit professioneller Kamera",
    fallbackImage: "fynn",
  },
  "360-grad-video-station-von-swibble": {
    slug: "360-grad-video-station-von-swibble",
    title: "Die 360° Video Station: Dein Event aus jedem Blickwinkel",
    excerpt:
      "Gäste werden zum Mittelpunkt eines dynamischen Rundum-Videos – ein Treffpunkt auf dem Event und teilbarer Content für danach.",
    coverImage: null,
    coverImageAlt: "Fynn Frings von Swibble mit professioneller Kamera",
    fallbackImage: "fynn",
  },
};

// Hosts next/image may optimise (see images.remotePatterns in next.config.js).
// Covers from any other host fall back to the local image.
const OPTIMIZABLE_IMAGE_HOSTS = ["firebasestorage.googleapis.com"];

function isOptimizableCover(url: string | null): url is string {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && OPTIMIZABLE_IMAGE_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

/**
 * Resolves case-study slugs to card data: CMS posts win, the static fallback fills
 * every gap (no Firebase, unpublished post, missing excerpt or cover).
 */
export function resolveCaseStudies(
  slugs: string[],
  posts: Pick<
    BlogPost,
    "slug" | "title" | "excerpt" | "coverImage" | "coverImageAlt"
  >[],
): LandingCaseStudy[] {
  return slugs.flatMap((slug) => {
    const fallback = CASE_STUDY_FALLBACKS[slug];
    if (!fallback) return [];

    const post = posts.find((p) => p.slug === slug);
    if (!post) return [fallback];

    const hasCover = isOptimizableCover(post.coverImage);
    return [
      {
        ...fallback,
        title: post.title || fallback.title,
        // The CMS derives excerpts from the body when none is set; those end with "…"
        // mid-sentence, so the curated fallback reads better on a landing page.
        excerpt:
          post.excerpt && !post.excerpt.endsWith("…")
            ? post.excerpt
            : fallback.excerpt,
        coverImage: hasCover ? post.coverImage : null,
        coverImageAlt:
          hasCover && post.coverImageAlt
            ? post.coverImageAlt
            : fallback.coverImageAlt,
      },
    ];
  });
}
