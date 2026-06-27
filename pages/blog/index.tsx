import { useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import SEO from "@/components/SEO";
import BlogCard from "@/components/blog/BlogCard";
import { getAllPosts } from "@/lib/blog/posts";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import type { BlogPost, SortOrder } from "@/lib/blog/types";

interface Props {
  posts: BlogPost[];
  configured: boolean;
}

const Blog = ({ posts, configured }: Props) => {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<SortOrder>("newest");

  const visiblePosts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? posts.filter(
          (post) =>
            post.title.toLowerCase().includes(term) ||
            post.excerpt.toLowerCase().includes(term) ||
            post.author.toLowerCase().includes(term),
        )
      : posts;

    return [...filtered].sort((a, b) =>
      order === "newest"
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt,
    );
  }, [posts, query, order]);

  return (
    <>
      <SEO
        title="Blog – Swibble"
        description="Einblicke aus der Welt der Digitalagentur Swibble: Tipps zu Design, Web- & App-Entwicklung, Beratung und mehr."
        canonical="/blog"
      />

      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-[#b718ec] lg:text-5xl">Blog</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#556987] lg:text-lg">
            Einblicke, Tipps und Neuigkeiten aus der Swibble-Welt.
          </p>
        </header>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Beiträge durchsuchen…"
            aria-label="Beiträge durchsuchen"
            className="h-12 w-full rounded-lg bg-[#F6F6F6] pl-4 placeholder:text-sm placeholder:text-[#CEC3D2] focus:outline-none sm:max-w-sm"
          />

          <div className="flex items-center gap-2">
            <label htmlFor="order" className="text-sm text-[#556987]">
              Sortieren:
            </label>
            <select
              id="order"
              value={order}
              onChange={(e) => setOrder(e.target.value as SortOrder)}
              className="h-12 rounded-lg bg-[#F6F6F6] px-3 text-sm text-[#2A3342] focus:outline-none"
            >
              <option value="newest">Neueste zuerst</option>
              <option value="oldest">Älteste zuerst</option>
            </select>
          </div>
        </div>

        {!configured ? (
          <p className="rounded-xl bg-[#FDF5FF] p-6 text-center text-[#556987]">
            Der Blog wird gerade eingerichtet. Schau bald wieder vorbei.
          </p>
        ) : visiblePosts.length === 0 ? (
          <p className="rounded-xl bg-[#FDF5FF] p-6 text-center text-[#556987]">
            {posts.length === 0
              ? "Es wurden noch keine Beiträge veröffentlicht."
              : "Keine Beiträge gefunden."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const configured = isFirebaseConfigured();
  const posts = configured ? await getAllPosts("newest") : [];

  return {
    props: { posts, configured },
  };
};

export default Blog;
