import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import { getAllVideos } from "@/lib/videos/videos";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import type { Video } from "@/lib/videos/types";

interface Props {
  videos: Video[];
  configured: boolean;
}

const inputClass =
  "w-full rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm text-[#2A3342] focus:outline-none";

const AdminVideos = ({ videos, configured }: Props) => {
  const router = useRouter();
  const [items, setItems] = useState(videos);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState("");
  const [coverDrafts, setCoverDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      videos.map((video) => [
        video.id,
        video.coverPath.replace("/video-covers/", ""),
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!url.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title: title.trim() || undefined,
          cover: cover.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Speichern fehlgeschlagen.");

      setItems((prev) => [...prev, data.video]);
      setCoverDrafts((prev) => ({
        ...prev,
        [data.video.id]: data.video.coverPath.replace("/video-covers/", ""),
      }));
      setUrl("");
      setTitle("");
      setCover("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  };

  const handleCoverSave = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover: coverDrafts[id] ?? "" }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Speichern fehlgeschlagen.");

      setItems((prev) =>
        prev.map((video) => (video.id === id ? data.video : video)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Video wirklich entfernen?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Löschen fehlgeschlagen.");
      }
      setItems((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Videos verwalten – Swibble CMS</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className="mx-auto w-full max-w-4xl">
        {/* Section nav */}
        <div className="mb-6 flex gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-[#F0E4F5] px-3 py-1.5 text-sm font-medium text-[#556987] transition hover:border-[#b718ec] hover:text-[#b718ec]"
          >
            Blog
          </Link>
          <Link
            href="/admin/linkhub"
            className="rounded-lg border border-[#F0E4F5] px-3 py-1.5 text-sm font-medium text-[#556987] transition hover:border-[#b718ec] hover:text-[#b718ec]"
          >
            Linkhub
          </Link>
          <span className="rounded-lg bg-[#B718EC] px-3 py-1.5 text-sm font-medium text-white">
            Videos
          </span>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-[#000D36]">
          Videos verwalten
        </h1>

        {!configured && (
          <p className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            Firebase ist noch nicht konfiguriert. Lege die{" "}
            <code className="mx-1">FIREBASE_*</code> Variablen in{" "}
            <code>.env.local</code> an.
          </p>
        )}

        {/* Add form */}
        <form
          onSubmit={handleAdd}
          className="mb-8 rounded-xl border border-[#F0E4F5] bg-white p-4"
        >
          <p className="mb-3 text-sm font-semibold text-[#000D36]">
            Neues Video hinzufügen
          </p>
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              aria-label="Video-URL"
              type="url"
              className={inputClass}
              placeholder="https://youtube.com/… oder https://vimeo.com/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <input
              aria-label="Titel"
              className={inputClass}
              placeholder="Titel (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              aria-label="Cover-Dateiname"
              className={inputClass}
              placeholder="Cover-Dateiname, z. B. projekt.webp"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-[10px] bg-[#B718EC] px-5 py-2 text-sm font-medium text-[#F0FDF4] transition duration-200 hover:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "…" : "Hinzufügen"}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#8a7791]">
            Lege Covers zuerst in{" "}
            <code className="font-mono">public/video-covers</code> ab und trage
            nur den Dateinamen ein. Unterstützt werden AVIF, JPG, PNG und WebP.
          </p>
        </form>

        {/* List */}
        {items.length === 0 ? (
          <p className="rounded-xl bg-[#FDF5FF] p-6 text-center text-[#556987]">
            Noch keine Videos. Füge dein erstes Video hinzu.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((video, i) => (
              <div
                key={video.id}
                className="grid gap-4 rounded-xl border border-[#F0E4F5] bg-white p-4 sm:grid-cols-[5rem_1fr]"
              >
                <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-[#FDF5FF]">
                  {video.coverPath ? (
                    <Image
                      src={video.coverPath}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[#b718ec]">
                      ▶
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#000D36]">
                    {video.title || `Video ${i + 1}`}
                  </p>
                  <p className="mb-3 max-w-md truncate text-xs text-[#8a7791]">
                    {video.embedUrl}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      aria-label={`Cover für ${video.title || `Video ${i + 1}`}`}
                      className={`${inputClass} min-w-48 flex-1`}
                      placeholder="Cover-Dateiname"
                      value={coverDrafts[video.id] ?? ""}
                      onChange={(e) =>
                        setCoverDrafts((prev) => ({
                          ...prev,
                          [video.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleCoverSave(video.id)}
                      disabled={busyId === video.id}
                      className="rounded-lg border border-[#B718EC] px-3 py-2 text-sm text-[#B718EC] disabled:opacity-50"
                    >
                      Cover speichern
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <a
                      href={video.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#556987] hover:text-[#b718ec]"
                    >
                      Ansehen
                    </a>
                    <button
                      onClick={() => handleDelete(video.id)}
                      disabled={busyId === video.id}
                      className="text-red-500 hover:underline disabled:opacity-50"
                    >
                      {busyId === video.id ? "…" : "Löschen"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
  const videos = configured ? await getAllVideos() : [];
  return { props: { videos, configured } };
};

export default AdminVideos;
