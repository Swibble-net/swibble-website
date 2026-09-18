import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import { getAllVideos, getVideoSettings } from "@/lib/videos/videos";
import { isAppVideoApiConfigured } from "@/lib/videos/appVideos";
import AppVideoPicker from "@/components/admin/AppVideoPicker";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import type { Video } from "@/lib/videos/types";

interface Props {
  videos: Video[];
  configured: boolean;
  appConfigured: boolean;
  soundEnabled: boolean;
}

/** Only local files are editable; the TikTok cover route is shown as "automatic" (empty). */
function localCoverName(coverPath: string): string {
  return coverPath.startsWith("/video-covers/")
    ? coverPath.replace("/video-covers/", "")
    : "";
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MB`;
}

const inputClass =
  "w-full rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm text-[#2A3342] focus:outline-none";

const AdminVideos = ({
  videos,
  configured,
  appConfigured,
  soundEnabled: initialSound,
}: Props) => {
  const router = useRouter();
  const [items, setItems] = useState(videos);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState("");
  const [coverDrafts, setCoverDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      videos.map((video) => [
        video.id,
        localCoverName(video.coverPath),
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(initialSound);
  const [savingSound, setSavingSound] = useState(false);

  const toLogin = useCallback(() => {
    router.push("/admin/login");
  }, [router]);

  // Poll while the Swibble app is still compressing a chosen video.
  const processingIds = items
    .filter((video) => video.source === "app" && video.status === "processing")
    .map((video) => video.id)
    .join(",");
  useEffect(() => {
    if (!processingIds) return;
    const timer = setInterval(async () => {
      for (const id of processingIds.split(",")) {
        try {
          const res = await fetch(
            `/api/admin/app-videos/status?id=${encodeURIComponent(id)}`,
          );
          if (!res.ok) continue;
          const data = await res.json();
          if (data.video) {
            setItems((prev) =>
              prev.map((video) => (video.id === id ? data.video : video)),
            );
          }
        } catch {
          /* Transient network errors are retried on the next tick. */
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [processingIds]);

  const handleSoundToggle = async () => {
    const next = !soundEnabled;
    setSavingSound(true);
    try {
      const res = await fetch("/api/videos/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soundEnabled: next }),
      });
      if (res.status === 401) return toLogin();
      if (!res.ok) throw new Error("Speichern fehlgeschlagen.");
      setSoundEnabled(next);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setSavingSound(false);
    }
  };

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
        [data.video.id]: localCoverName(data.video.coverPath),
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

        {/* Swibble app + sound setting */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#F0E4F5] bg-white p-4">
            <p className="mb-1 text-sm font-semibold text-[#000D36]">
              Aus der Swibble-App
            </p>
            <p className="mb-3 text-xs text-[#8a7791]">
              Fertiges Video wählen – es wird automatisch auf 720p komprimiert
              und bekommt ein Cover.
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={!appConfigured || !configured}
              className="w-full rounded-[10px] bg-[#B718EC] px-5 py-2 text-sm font-medium text-[#F0FDF4] transition duration-200 hover:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Video aus Swibble-App wählen
            </button>
            {!appConfigured && (
              <p className="mt-2 text-xs text-amber-700">
                Verbindung fehlt: <code>SWIBBLE_APP_VIDEO_API_URL</code> und{" "}
                <code>SWIBBLE_APP_VIDEO_API_KEY</code> setzen.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-[#F0E4F5] bg-white p-4">
            <p className="mb-1 text-sm font-semibold text-[#000D36]">Ton</p>
            <p className="mb-3 text-xs text-[#8a7791]">
              Videos starten immer stumm. Ist der Ton erlaubt, erscheint beim
              Hovern ein Lautsprecher-Symbol; es läuft nie mehr als ein Video
              mit Ton.
            </p>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-[#2A3342]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#B718EC]"
                checked={soundEnabled}
                disabled={savingSound || !configured}
                onChange={handleSoundToggle}
              />
              Besucher dürfen den Ton einschalten
            </label>
          </div>
        </div>

        {/* Add form */}
        <form
          onSubmit={handleAdd}
          className="mb-8 rounded-xl border border-[#F0E4F5] bg-white p-4"
        >
          <p className="mb-3 text-sm font-semibold text-[#000D36]">
            YouTube-, Vimeo- oder TikTok-Link hinzufügen
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
              placeholder="Link von YouTube, Vimeo oder TikTok"
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
            TikTok-Links (auch Kurzlinks) bringen ihr Cover automatisch mit.
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
                  {video.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.coverUrl}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : video.coverPath.startsWith("/api/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.coverPath}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : video.coverPath ? (
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
                  {video.source === "app" ? (
                    <p className="mb-3 text-xs text-[#8a7791]">
                      <span className="mr-2 rounded bg-[#FDF5FF] px-1.5 py-0.5 font-medium text-[#B718EC]">
                        Swibble-App
                      </span>
                      {video.status === "processing" &&
                        "Wird komprimiert … das dauert meist 1–3 Minuten."}
                      {video.status === "failed" &&
                        "Komprimierung fehlgeschlagen – bitte entfernen und erneut wählen."}
                      {video.status === "ready" &&
                        `${video.width}×${video.height} · ${Math.round(video.duration)} s · ${formatSize(video.size)}${video.hasAudio ? "" : " · ohne Ton"}`}
                    </p>
                  ) : (
                    <>
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
                    </>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <a
                      href={video.source === "app" ? video.videoUrl : video.embedUrl}
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

      {pickerOpen && (
        <AppVideoPicker
          onClose={() => setPickerOpen(false)}
          onUnauthorized={toLogin}
          onAdded={(video) =>
            setItems((prev) =>
              prev.some((item) => item.id === video.id)
                ? prev.map((item) => (item.id === video.id ? video : item))
                : [...prev, video],
            )
          }
        />
      )}
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  const configured = isFirebaseConfigured();
  const [videos, settings] = configured
    ? await Promise.all([getAllVideos(), getVideoSettings()])
    : [[], { soundEnabled: false }];
  return {
    props: {
      videos,
      configured,
      appConfigured: isAppVideoApiConfigured(),
      soundEnabled: settings.soundEnabled,
    },
  };
};

export default AdminVideos;
