export interface LinkhubLink {
  /** Stable id used as React key and for in-place editing */
  id: string;
  icon: string;
  label: string;
  sublabel: string;
  href: string;
  /** Open in new tab */
  external: boolean;
  /** Render as the purple accent card */
  accent: boolean;
}

export interface LinkhubProfile {
  /** Firestore document id */
  id: string;
  /** URL slug used in /linkhub/[slug] */
  slug: string;
  /** Display name shown at the top of the page */
  name: string;
  /** Optional tagline under the name */
  subtitle: string;
  links: LinkhubLink[];
  createdAt: number;
  updatedAt: number;
}

/** Payload accepted by the CMS when creating or updating a profile */
export interface LinkhubProfileInput {
  name: string;
  slug?: string;
  subtitle?: string;
  links: Array<{
    id?: string;
    icon: string;
    label: string;
    sublabel?: string;
    href: string;
    external?: boolean;
    accent?: boolean;
  }>;
}
