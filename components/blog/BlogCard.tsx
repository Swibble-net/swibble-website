import Link from "next/link";
import { formatDate, toIsoDate } from "@/lib/blog/format";
import type { BlogPost } from "@/lib/blog/types";

interface Props {
  post: BlogPost;
}

const BlogCard = ({ post }: Props) => {
  const changed = post.updatedAt && post.updatedAt > post.createdAt;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#F0E4F5] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      {post.coverImage ? (
        // Cover images can be arbitrary external URLs entered in the CMS, so a
        // plain <img> avoids next/image domain configuration headaches.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt={post.title}
          className="h-48 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-[#FDF5FF] to-[#F3D9FF]">
          <span className="text-2xl font-bold text-[#b718ec]">Swibble</span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-x-2 text-xs text-[#8a7791]">
          <span className="font-medium text-[#556987]">{post.author}</span>
          {post.author && <span aria-hidden>·</span>}
          <time dateTime={toIsoDate(post.createdAt)}>
            {formatDate(post.createdAt)}
          </time>
        </div>

        <h2 className="mb-2 text-lg font-bold text-[#000D36] transition group-hover:text-[#b718ec]">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-[#556987]">
            {post.excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-medium text-[#b718ec] transition group-hover:underline">
            Weiterlesen →
          </span>
          {changed && (
            <span className="text-[11px] text-[#a99fb0]">
              Aktualisiert {formatDate(post.updatedAt)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default BlogCard;
