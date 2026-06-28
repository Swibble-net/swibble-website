import { FieldValue } from "firebase-admin/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { slugify } from "@/lib/blog/slug";
import type { BlogPost, BlogPostInput, SortOrder } from "@/lib/blog/types";

const COLLECTION = "posts";

interface PostDocument {
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImage: string | null;
  author: string;
  published?: boolean;
  createdAt: number;
  updatedAt: number;
}

function toPost(id: string, data: PostDocument): BlogPost {
  return {
    id,
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt ?? "",
    contentHtml: data.contentHtml ?? "",
    coverImage: data.coverImage ?? null,
    author: data.author ?? "",
    // Posts created before drafts existed have no flag and stay visible.
    published: data.published ?? true,
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? data.createdAt ?? 0,
  };
}

/** Derives a short plain-text excerpt from an HTML body. */
function deriveExcerpt(html: string, max = 160): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/**
 * Returns posts sorted by publish date. By default only published posts are
 * returned (for visitors); pass `includeHidden` from the CMS to also get
 * drafts. Drafts are filtered in memory to avoid a Firestore composite index.
 * Falls back to an empty list when Firebase is not configured yet.
 */
export async function getAllPosts(
  order: SortOrder = "newest",
  options: { includeHidden?: boolean } = {},
): Promise<BlogPost[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb()
    .collection(COLLECTION)
    .orderBy("createdAt", order === "newest" ? "desc" : "asc")
    .get();

  const posts = snapshot.docs.map((doc) =>
    toPost(doc.id, doc.data() as PostDocument),
  );

  return options.includeHidden ? posts : posts.filter((p) => p.published);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isFirebaseConfigured()) return null;

  const snapshot = await getDb()
    .collection(COLLECTION)
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return toPost(doc.id, doc.data() as PostDocument);
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  if (!isFirebaseConfigured()) return null;

  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return toPost(doc.id, doc.data() as PostDocument);
}

/** Ensures the slug is unique, appending a numeric suffix if needed. */
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "beitrag";
  let candidate = root;

  for (let suffix = 2; ; suffix += 1) {
    const snapshot = await getDb()
      .collection(COLLECTION)
      .where("slug", "==", candidate)
      .limit(1)
      .get();

    const clash = snapshot.docs.find((doc) => doc.id !== ignoreId);
    if (!clash) return candidate;

    candidate = `${root}-${suffix}`;
  }
}

export async function createPost(input: BlogPostInput): Promise<BlogPost> {
  const db = getDb();
  const now = Date.now();
  const slug = await uniqueSlug(input.slug || input.title);

  const data: PostDocument = {
    slug,
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || deriveExcerpt(input.contentHtml),
    contentHtml: input.contentHtml,
    coverImage: input.coverImage?.trim() || null,
    author: input.author.trim(),
    // New posts start as hidden drafts so they can be reviewed first.
    published: input.published ?? false,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection(COLLECTION).add({
    ...data,
    serverCreatedAt: FieldValue.serverTimestamp(),
  });

  return toPost(ref.id, data);
}

export async function updatePost(
  id: string,
  input: BlogPostInput,
): Promise<BlogPost | null> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const current = existing.data() as PostDocument;
  const slug =
    input.slug && input.slug !== current.slug
      ? await uniqueSlug(input.slug, id)
      : current.slug;

  const data: PostDocument = {
    slug,
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || deriveExcerpt(input.contentHtml),
    contentHtml: input.contentHtml,
    coverImage: input.coverImage?.trim() || null,
    author: input.author.trim(),
    published: input.published ?? current.published ?? false,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  };

  await ref.update({ ...data });
  return toPost(id, data);
}

/** Flips just the visibility flag — used by the dashboard quick toggle. */
export async function setPostPublished(
  id: string,
  published: boolean,
): Promise<BlogPost | null> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  await ref.update({ published });
  const updated = await ref.get();
  return toPost(id, updated.data() as PostDocument);
}

export async function deletePost(id: string): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}
