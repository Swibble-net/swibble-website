import type { ApplicationRole, ApplicationStatus } from "./config";
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
  /** Applicant ticked "my parents know and agree" */
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

export interface ApplicationConsent {
  contactText: string;
  privacyText: string;
  version: string;
  /** Epoch ms at which the consents were given (server time) */
  givenAt: number;
}

/** Validated, normalised applicant data (output of validateApplication). */
export interface ApplicationData {
  roles: ApplicationRole[];
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
}

export interface Application extends ApplicationData {
  /** Firestore document id */
  id: string;
  /** Display name of the center at submission time */
  centerName: string;
  /** Minor at the time of submission */
  isMinor: boolean;
  ageAtSubmission: number;
  consent: ApplicationConsent;
  consentFile: ApplicationConsentFile | null;
  status: ApplicationStatus;
  /** Internal admin note */
  note: string;
  createdAt: number;
  updatedAt: number;
}

export type ApplicationErrors = Record<string, string>;
