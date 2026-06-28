import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { useState } from "react";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import { getAllPosts } from "@/lib/blog/posts";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { formatDate } from "@/lib/blog/format";
import type { BlogPost } from "@/lib/blog/types";

interface Props {
  posts: BlogPost[];
  configured: boolean;
}

const AdminDashboard = ({ posts, configured }: Props) => {
  const router = useRouter();
  const [items, setItems] = useState(posts);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const handleTogglePublished = async (id: string, next: boolean) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: next }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Aktualisieren fehlgeschlagen.");
      }
      setItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, published: next } : p)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setBusyId(null);
    }
  };

  const renderActions = (post: BlogPost) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Link
        href={`/blog/${post.slug}`}
        target="_blank"
        className="text-[#556987] hover:text-[#b718ec]"
      >
        Ansehen
      </Link>
      <button
        onClick={() => handleTogglePublished(post.id, !post.published)}
        disabled={busyId === post.id}
        className="text-[#556987] hover:text-[#b718ec] disabled:opacity-50"
      >
        {post.published ? "Verstecken" : "Anzeigen"}
      </button>
      <Link
        href={`/admin/edit/${post.id}`}
        className="text-[#b718ec] hover:underline"
      >
        Bearbeiten
      </Link>
      <button
        onClick={() => handleDelete(post.id, post.title)}
        disabled={busyId === post.id}
        className="text-red-500 hover:underline disabled:opacity-50"
      >
        {busyId === post.id ? "…" : "Löschen"}
      </button>
    </div>
  );

  const renderStatus = (post: BlogPost) => (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        post.published
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {post.published ? "Sichtbar" : "Versteckt"}
    </span>
  );

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Beitrag „${title}" wirklich löschen?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Löschen fehlgeschlagen.");
      }
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Head>
        <title>CMS – Swibble</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#000D36]">Blog verwalten</h1>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <Link
              href="/admin/new"
              className="rounded-[10px] bg-[#B718EC] px-4 py-2 text-sm font-medium text-[#F0FDF4] transition duration-200 hover:scale-95"
            >
              + Neuer Beitrag
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-[#556987] hover:text-[#b718ec]"
            >
              Abmelden
            </button>
          </div>
        </div>

        {!configured && (
          <p className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            Firebase ist noch nicht konfiguriert. Lege die FIREBASE_* Variablen in
            <code className="mx-1">.env.local</code> an, um Beiträge zu speichern.
          </p>
        )}

        {items.length === 0 ? (
          <p className="rounded-xl bg-[#FDF5FF] p-6 text-center text-[#556987]">
            Noch keine Beiträge. Erstelle deinen ersten Beitrag.
          </p>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="flex flex-col gap-4 sm:hidden">
              {items.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-[#F0E4F5] bg-white p-4 text-[#2A3342]"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h2 className="font-semibold">{post.title}</h2>
                    {renderStatus(post)}
                  </div>
                  <p className="text-xs text-[#8a7791]">
                    {post.author} · {formatDate(post.createdAt)}
                    {post.updatedAt > post.createdAt
                      ? ` · Geändert ${formatDate(post.updatedAt)}`
                      : ""}
                  </p>
                  <div className="mt-3 border-t border-[#F0E4F5] pt-3 text-sm">
                    {renderActions(post)}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-hidden rounded-xl border border-[#F0E4F5] bg-white sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FDF5FF] text-[#556987]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Titel</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                      Autor
                    </th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                      Veröffentlicht
                    </th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                      Geändert
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((post) => (
                    <tr
                      key={post.id}
                      className="border-t border-[#F0E4F5] text-[#2A3342]"
                    >
                      <td className="px-4 py-3 font-medium">{post.title}</td>
                      <td className="px-4 py-3">{renderStatus(post)}</td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {post.author}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {formatDate(post.createdAt)}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {post.updatedAt > post.createdAt
                          ? formatDate(post.updatedAt)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {renderActions(post)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }

  const configured = isFirebaseConfigured();
  const posts = configured
    ? await getAllPosts("newest", { includeHidden: true })
    : [];

  return { props: { posts, configured } };
};

export default AdminDashboard;
