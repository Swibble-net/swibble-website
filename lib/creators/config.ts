// Swibble Creator pages (/creator, /creator/<slug>): limits and pure helpers.

import { CREATOR_ROLES, type CreatorRole } from "@/lib/applications/config";
import { isValidHandle, normalizeHandle, type SocialPlatform } from "@/lib/applications/handles";
import { normalizePortfolioUrl } from "@/lib/applications/validation";
import { slugify } from "@/lib/blog/slug";
import type {
  CreatorProfile,
  CreatorProfileInput,
  CreatorReference,
  PublicCreator,
} from "./types";

export const NAME_MAX_LENGTH = 60;
export const CITY_MAX_LENGTH = 80;
export const TAGLINE_MAX_LENGTH = 120;
export const SLUG_MAX_LENGTH = 60;
export const REFERENCES_MAX = 12;
export const REFERENCE_NAME_MAX_LENGTH = 60;
export const REFERENCE_DETAIL_MAX_LENGTH = 80;
export const VIDEO_TITLE_MAX_LENGTH = 80;

export const PHOTOS_MAX = 40;
export const VIDEOS_MAX = 24;

/** Photos are resized in the admin's browser: large + thumbnail as JPEG. */
export const PHOTO_LARGE_MAX_SIDE = 2000;
export const PHOTO_THUMB_MAX_SIDE = 640;
export const PHOTO_LARGE_MAX_BYTES = Math.round(1.6 * 1024 * 1024);
export const PHOTO_THUMB_MAX_BYTES = 250 * 1024;

/**
 * Uploaded videos travel in 4 MB pieces (Vercel's request limit) and are
 * joined in storage: 500 MB per video. Larger productions come through the
 * Swibble app as a compressed web copy.
 */
export const VIDEO_CHUNK_BYTES = 4 * 1024 * 1024;
export const VIDEO_MAX_CHUNKS = 125;
export const VIDEO_MAX_BYTES = VIDEO_CHUNK_BYTES * VIDEO_MAX_CHUNKS;
export const VIDEO_COVER_MAX_BYTES = 1024 * 1024;
export const VIDEO_CONTENT_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

export function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX_LENGTH && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Number of upload pieces for a video of the given size. */
export function videoChunkCount(size: number): number {
  return Math.max(1, Math.ceil(size / VIDEO_CHUNK_BYTES));
}

/**
 * Default display name: first name plus initial ("Testina T."). The full
 * name can be set in the CMS; the default keeps the surname off the web.
 */
export function defaultCreatorName(firstName: string, lastName: string): string {
  const initial = lastName.trim().charAt(0);
  return `${firstName.trim()}${initial ? ` ${initial.toUpperCase()}.` : ""}`.trim();
}

export function slugBase(name: string): string {
  return (slugify(name) || "creator").slice(0, SLUG_MAX_LENGTH).replace(/-+$/, "");
}

/* ── Media URLs (served by /api/creator-media) ─────────────────────────── */

const mediaBase = (creatorId: string) => `/api/creator-media/${encodeURIComponent(creatorId)}`;
export const photoUrl = (creatorId: string, photoId: string) => `${mediaBase(creatorId)}/photo-${photoId}`;
export const thumbUrl = (creatorId: string, photoId: string) => `${mediaBase(creatorId)}/thumb-${photoId}`;
export const videoFileUrl = (creatorId: string, videoId: string) => `${mediaBase(creatorId)}/video-${videoId}`;
export const videoCoverUrl = (creatorId: string, videoId: string) => `${mediaBase(creatorId)}/cover-${videoId}`;
export const setcardUrl = (creatorId: string) => `${mediaBase(creatorId)}/setcard`;

/** Parses the file part of a media URL. */
export function parseMediaFile(
  file: string,
):
  | { kind: "photo" | "thumb" | "video" | "cover"; id: string }
  | { kind: "setcard" }
  | null {
  if (file === "setcard") return { kind: "setcard" };
  const match = /^(photo|thumb|video|cover)-([A-Za-z0-9_-]{1,64})$/.exec(file);
  return match ? { kind: match[1] as "photo" | "thumb" | "video" | "cover", id: match[2] } : null;
}

/** Visitors only see videos that can actually play. */
export function isPlayableVideo(video: CreatorProfile["videos"][number]): boolean {
  return video.status === "ready" && (video.source === "upload" ? Boolean(video.path) : Boolean(video.videoUrl));
}

export function toPublicCreator(profile: CreatorProfile): PublicCreator {
  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
    roles: profile.roles,
    city: profile.city,
    tagline: profile.tagline,
    socials: profile.socials,
    portfolioUrl: profile.portfolioUrl,
    setcardUrl: profile.showSetcard && profile.setcardPath ? setcardUrl(profile.id) : "",
    photos: profile.photos.map((photo) => ({
      id: photo.id,
      url: photoUrl(profile.id, photo.id),
      thumbUrl: thumbUrl(profile.id, photo.id),
      width: photo.width,
      height: photo.height,
    })),
    videos: profile.videos.filter(isPlayableVideo).map((video) => ({
      id: video.id,
      title: video.title,
      videoUrl: video.source === "upload" ? videoFileUrl(profile.id, video.id) : video.videoUrl,
      coverUrl:
        video.source === "upload"
          ? video.coverPath
            ? videoCoverUrl(profile.id, video.id)
            : ""
          : video.coverUrl,
      width: video.width,
      height: video.height,
    })),
    references: profile.references,
  };
}

/* ── Validation of the CMS form ────────────────────────────────────────── */

// Control characters and angle brackets never belong in a short text.
const FORBIDDEN_TEXT = /[\u0000-\u001f\u007f<>]/;

function line(value: unknown, max: number): string | null {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (text.length > max || FORBIDDEN_TEXT.test(text)) return null;
  return text;
}

export type CreatorInputResult =
  | { ok: true; value: CreatorProfileInput }
  | { ok: false; message: string };

/** Validates and normalises the profile form of the CMS. */
export function validateCreatorInput(input: unknown, newId: () => string): CreatorInputResult {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const fail = (message: string): CreatorInputResult => ({ ok: false, message });

  const name = line(raw.name, NAME_MAX_LENGTH);
  if (!name) return fail("Bitte gib einen Namen an (max. 60 Zeichen).");

  const slug = typeof raw.slug === "string" ? raw.slug.trim().toLowerCase() : "";
  if (!isValidSlug(slug)) {
    return fail("Die Adresse darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.");
  }

  const allowedRoles = CREATOR_ROLES.map((r) => r.id);
  const rawRoles = Array.isArray(raw.roles) ? raw.roles : [];
  const roles = allowedRoles.filter((id) => rawRoles.includes(id)) as CreatorRole[];
  if (roles.length === 0) return fail("Bitte wähle mindestens eine Rolle.");

  const city = line(raw.city, CITY_MAX_LENGTH);
  if (city === null) return fail("Bitte prüfe den Wohnort.");
  const tagline = line(raw.tagline, TAGLINE_MAX_LENGTH);
  if (tagline === null) return fail(`Die Kurzbeschreibung darf höchstens ${TAGLINE_MAX_LENGTH} Zeichen haben.`);

  const rawSocials =
    raw.socials && typeof raw.socials === "object" ? (raw.socials as Record<string, unknown>) : {};
  const socials = { tiktok: "", instagram: "", snapchat: "", youtube: "" };
  for (const platform of Object.keys(socials) as SocialPlatform[]) {
    const handle = normalizeHandle(platform, rawSocials[platform]);
    if (handle && !isValidHandle(platform, handle)) return fail(`Bitte prüfe das ${platform}-Profil.`);
    socials[platform] = handle;
  }

  const portfolioUrl = normalizePortfolioUrl(raw.portfolioUrl);
  if (portfolioUrl === null) return fail("Der Portfolio-Link ist ungültig.");

  const rawReferences = Array.isArray(raw.references) ? raw.references : [];
  if (rawReferences.length > REFERENCES_MAX) return fail(`Höchstens ${REFERENCES_MAX} Referenzen.`);
  const references: CreatorReference[] = [];
  for (const item of rawReferences) {
    const ref = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const refName = line(ref.name, REFERENCE_NAME_MAX_LENGTH);
    const detail = line(ref.detail, REFERENCE_DETAIL_MAX_LENGTH);
    const url = normalizePortfolioUrl(ref.url);
    if (refName === null || detail === null || url === null) return fail("Bitte prüfe die Referenzen.");
    if (!refName) continue; // empty rows are dropped
    references.push({
      id: isValidId(ref.id) ? ref.id : newId(),
      name: refName,
      detail,
      url,
    });
  }

  return {
    ok: true,
    value: {
      slug,
      published: raw.published === true,
      name,
      roles,
      city,
      tagline,
      socials,
      portfolioUrl,
      showSetcard: raw.showSetcard === true,
      references,
    },
  };
}
