import Link from "next/link";
import BlogCard from "@/components/blog/BlogCard";
import type { BlogPost } from "@/lib/blog/types";

interface Props {
  posts: BlogPost[];
}

const LatestPosts = ({ posts }: Props) => {
  if (posts.length === 0) return null;

  return (
    <section className="w-full py-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#000D36] lg:text-3xl">
            Aus dem Blog
          </h2>
          <p className="mt-1 text-sm text-[#556987]">
            Einblicke, Tipps und Neuigkeiten aus der Swibble-Welt.
          </p>
        </div>
        <Link
          href="/blog"
          className="shrink-0 text-sm font-medium text-[#b718ec] transition-all duration-300 hover:tracking-[0.5px]"
        >
          Alle Beiträge →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
};

export default LatestPosts;
