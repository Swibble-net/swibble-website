import Link from "next/link";
import type { GetServerSideProps } from "next";
import SEO from "@/components/SEO";
import { formatDate, toIsoDate } from "@/lib/blog/format";
import { getPostBySlug } from "@/lib/blog/posts";
import { isAuthenticated } from "@/lib/adminAuth";
import type { BlogPost } from "@/lib/blog/types";

interface Props {
  post: BlogPost;
}

const SITE_URL = "https://swibble.net";

const BlogPostPage = ({ post }: Props) => {
  const changed = post.updatedAt && post.updatedAt > post.createdAt;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ? [post.coverImage] : undefined,
    author: { "@type": "Organization", name: post.author || "Swibble" },
    datePublished: new Date(post.createdAt).toISOString(),
    dateModified: new Date(post.updatedAt || post.createdAt).toISOString(),
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <>
      <SEO
        title={`${post.title} – Swibble Blog`}
        description={post.excerpt}
        canonical={`/blog/${post.slug}`}
        ogImage={post.coverImage ?? undefined}
        jsonLd={articleJsonLd}
        noIndex={!post.published}
      />

      <article className="mx-auto w-full max-w-3xl">
        {!post.published && (
          <p className="mb-4 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
            Entwurf-Vorschau – dieser Beitrag ist für Besucher noch nicht
            sichtbar.
          </p>
        )}

        <Link
          href="/blog"
          className="text-sm font-medium text-[#b718ec] hover:underline"
        >
          ← Zurück zum Blog
        </Link>

        <header className="mt-6 mb-8">
          <h1 className="text-3xl font-bold text-[#000D36] lg:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-[#8a7791]">
            <span className="font-medium text-[#556987]">{post.author}</span>
            {post.author && <span aria-hidden>·</span>}
            <time dateTime={toIsoDate(post.createdAt)}>
              {formatDate(post.createdAt)}
            </time>
            {changed && (
              <>
                <span aria-hidden>·</span>
                <span>Aktualisiert {formatDate(post.updatedAt)}</span>
              </>
            )}
          </div>
        </header>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt={post.title}
            className="mb-8 max-h-[420px] w-full rounded-2xl object-cover"
          />
        )}

        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug;
  if (typeof slug !== "string") {
    return { notFound: true };
  }

  const post = await getPostBySlug(slug);
  if (!post) {
    return { notFound: true };
  }

  // Drafts are only viewable by a logged-in admin (for preview).
  if (!post.published && !isAuthenticated(ctx.req)) {
    return { notFound: true };
  }

  return { props: { post } };
};

export default BlogPostPage;
