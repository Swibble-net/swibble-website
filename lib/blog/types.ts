export interface BlogPost {
  /** Firestore document id */
  id: string;
  /** URL-friendly unique identifier used in /blog/[slug] */
  slug: string;
  title: string;
  /** Short plain-text summary shown on the card */
  excerpt: string;
  /** Full post body as raw HTML */
  contentHtml: string;
  /** Optional cover image URL (absolute or rooted at /public) */
  coverImage: string | null;
  author: string;
  /** Publish date — epoch milliseconds */
  createdAt: number;
  /** Last change date — epoch milliseconds */
  updatedAt: number;
}

/** Payload accepted when creating or updating a post via the CMS. */
export interface BlogPostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  contentHtml: string;
  coverImage?: string | null;
  author: string;
}

export type SortOrder = "newest" | "oldest";
