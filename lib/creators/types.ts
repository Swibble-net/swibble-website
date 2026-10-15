import type { CreatorRole } from "@/lib/applications/config";
import type { ApplicationSocials } from "@/lib/applications/types";

/** A photo on a creator page: a large version and a thumbnail (private bucket). */
export interface CreatorPhoto {
  id: string;
  path: string;
  thumbPath: string;
  width: number;
  height: number;
  /** "application" = sent with the application, "swibble" = added in the CMS */
  origin: "application" | "swibble";
}

export type CreatorVideoStatus = "uploading" | "processing" | "ready" | "failed";

/**
 * A video on a creator page: a web copy from the Swibble app (like the home
 * page carousel) or a file uploaded in the CMS.
 */
export interface CreatorVideo {
  id: string;
  source: "app" | "upload";
  /** Short caption, e.g. the customer */
  title: string;
  status: CreatorVideoStatus;
  /** App videos: job of the web copy, plus its MP4 and cover (trusted URLs) */
  appJobId: string;
  videoUrl: string;
  coverUrl: string;
  /** Uploads: object paths in the private bucket */
  path: string;
  coverPath: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
}

/** Customer or project the creator worked on. */
export interface CreatorReference {
  id: string;
  /** Customer / brand, e.g. "Aquis Plaza" */
  name: string;
  /** What was done, e.g. "TikTok-Serie" */
  detail: string;
  /** Optional link (case study, post) */
  url: string;
}

export interface CreatorProfile {
  /** Firestore document id */
  id: string;
  /** Application the profile was created from ("" = none / deleted) */
  applicationId: string;
  /** URL: /creator/<slug> */
  slug: string;
  /** Only published profiles are public */
  published: boolean;
  name: string;
  roles: CreatorRole[];
  city: string;
  /** One short line under the name */
  tagline: string;
  socials: ApplicationSocials;
  portfolioUrl: string;
  /** Setcard taken over from the application (private bucket path, "" = none) */
  setcardPath: string;
  setcardType: string;
  /** Offer the setcard for download on the public page */
  showSetcard: boolean;
  /** First photo = cover */
  photos: CreatorPhoto[];
  videos: CreatorVideo[];
  references: CreatorReference[];
  createdAt: number;
  updatedAt: number;
}

/** Profile fields editable in the CMS (media have their own endpoints). */
export interface CreatorProfileInput {
  slug: string;
  published: boolean;
  name: string;
  roles: CreatorRole[];
  city: string;
  tagline: string;
  socials: ApplicationSocials;
  portfolioUrl: string;
  showSetcard: boolean;
  references: CreatorReference[];
}

/** What a public page may show — no application link, no storage paths. */
export interface PublicCreator {
  id: string;
  slug: string;
  name: string;
  roles: CreatorRole[];
  city: string;
  tagline: string;
  socials: ApplicationSocials;
  portfolioUrl: string;
  /** Download URL of the setcard, "" when not offered */
  setcardUrl: string;
  photos: Array<{
    id: string;
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
  }>;
  videos: Array<{
    id: string;
    title: string;
    videoUrl: string;
    coverUrl: string;
    width: number;
    height: number;
  }>;
  references: CreatorReference[];
}
