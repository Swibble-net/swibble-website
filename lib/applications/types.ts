import type {
  AnyApplicationRole,
  ApplicationPool,
  ApplicationStatus,
  GuardianMethod,
} from "./config";
import type { ConsentFileType } from "./fileType";

export interface ApplicationSocials {
  /** Handles are stored without the leading @ */
  tiktok: string;
  instagram: string;
  snapchat: string;
  youtube: string;
}

export interface ApplicationGuardian {
  name: string;
  phone: string;
  email: string;
  /** Optional postal address (online signing / paper form) */
  address: string;
  /** "signature" = signed online, "upload" = photo/PDF of the paper form */
  method: GuardianMethod;
  /** The confirmation checkbox of the chosen method was ticked */
  confirmed: boolean;
}

/** Metadata of the privately stored parental consent file ("Muttizettel"). */
export interface ApplicationConsentFile {
  /** Object path inside the private storage bucket — never a public URL */
  path: string;
  contentType: ConsentFileType["mime"];
  extension: ConsentFileType["extension"];
  size: number;
}

/** A video sent with a creator pool application (private bucket). */
export interface ApplicationVideo {
  path: string;
  contentType: string;
  size: number;
  /** Frame taken from the video in the browser ("" = none) */
  coverPath: string;
}

/**
 * Files a creator pool application announced when it was stored; they are
 * uploaded one by one with the token afterwards.
 */
export interface PendingUpload {
  /** sha256 of the upload token (the token itself only goes to the browser) */
  tokenHash: string;
  expiresAt: number;
  photos: number;
  videos: Array<{ size: number; contentType: string }>;
  setcard: boolean;
  /** Parental consent document (minors) */
  consent: boolean;
}

export interface ApplicationConsent {
  contactText: string;
  privacyText: string;
  /** Publication / marketing release (mandatory since consent version v3) */
  mediaText: string;
  /** Minors: wording of the ticked guardian confirmation */
  guardianText: string;
  /** Minors who signed online: full text of the signed declaration */
  guardianDeclaration: string;
  /** Creator pool: full text of the release the applicant signed online */
  creatorRelease: string;
  version: string;
  /** Epoch ms at which the consents were given (server time) */
  givenAt: number;
}

/** Validated, normalised applicant data (output of validateApplication). */
export interface ApplicationData {
  roles: AnyApplicationRole[];
  firstName: string;
  lastName: string;
  /** ISO date, YYYY-MM-DD */
  birthDate: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
  socials: ApplicationSocials;
  about: string;
  /** Linkhub slug the applicant came from; "" = unknown / doesn't matter */
  center: string;
  guardian: ApplicationGuardian | null;
  /** Creator pool: optional link to a website / online portfolio ("" = none) */
  portfolioUrl: string;
}

export interface Application extends ApplicationData {
  /** Firestore document id */
  id: string;
  /** Which page the application came from (missing in old documents = "videos") */
  pool: ApplicationPool;
  /** Display name of the center at submission time */
  centerName: string;
  /** Minor at the time of submission */
  isMinor: boolean;
  ageAtSubmission: number;
  consent: ApplicationConsent;
  consentFile: ApplicationConsentFile | null;
  /** Optional photos the applicant added (private bucket, same rules) */
  photos: ApplicationConsentFile[];
  /** Creator pool: the release signed online, rendered as one document */
  releaseFile: ApplicationConsentFile | null;
  /** Creator pool: optional setcard / portfolio (PDF or image) */
  setcardFile: ApplicationConsentFile | null;
  /** Creator pool: optional videos */
  videos: ApplicationVideo[];
  /** Stored, but the files never arrived completely (upload aborted) */
  incomplete: boolean;
  /** Only while the files are being uploaded */
  pendingUpload: PendingUpload | null;
  status: ApplicationStatus;
  /** Internal admin note */
  note: string;
  createdAt: number;
  updatedAt: number;
}

export type ApplicationErrors = Record<string, string>;
