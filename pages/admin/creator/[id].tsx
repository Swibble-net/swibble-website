import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import type { GetServerSideProps } from "next";
import AppVideoPicker from "@/components/admin/AppVideoPicker";
import { SortableGrid, SortableTile, dragHandleClass, moveItem } from "@/components/SortableGrid";
import { isAuthenticated } from "@/lib/adminAuth";
import { CREATOR_ROLES, type CreatorRole } from "@/lib/applications/config";
import {
  PHOTOS_MAX,
  REFERENCES_MAX,
  REFERENCE_DETAIL_MAX_LENGTH,
  REFERENCE_NAME_MAX_LENGTH,
  SLUG_MAX_LENGTH,
  TAGLINE_MAX_LENGTH,
  VIDEOS_MAX,
  VIDEO_TITLE_MAX_LENGTH,
  thumbUrl,
  videoCoverUrl,
} from "@/lib/creators/config";
import { MediaError, uploadCreatorPhoto, uploadCreatorVideo } from "@/lib/creators/clientMedia";
import { listCopyableHomeVideos, type HomeVideoOption } from "@/lib/creators/homeVideos";
import { getCreator } from "@/lib/creators/store";
import type { CreatorProfile, CreatorReference, CreatorVideo } from "@/lib/creators/types";
import { isAppVideoApiConfigured } from "@/lib/videos/appVideos";

interface Props {
  initial: CreatorProfile;
  appVideosAvailable: boolean;
  /** Finished videos of the home page carousel that can be copied */
  homeVideos: HomeVideoOption[];
}

const inputClass =
  "w-full rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm text-[#2A3342] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B718EC]/40";
const labelClass = "mb-1 block text-sm font-medium text-[#2A3342]";
const smallButton =
  "rounded-md border border-[#F0E4F5] bg-white px-2 py-1 text-xs font-medium text-[#556987] transition hover:border-[#b718ec] hover:text-[#b718ec] disabled:opacity-40";
const primaryButton =
  "rounded-[10px] bg-[#B718EC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#a514d6] disabled:cursor-not-allowed disabled:opacity-50";
const outlineButton =
  "rounded-[10px] border border-[#B718EC] px-4 py-2 text-sm font-medium text-[#B718EC] transition hover:bg-[#FDF5FF] disabled:cursor-not-allowed disabled:opacity-50";

const Card = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="rounded-xl border border-[#F0E4F5] bg-white p-5">
    <h2 className="text-base font-semibold text-[#000D36]">{title}</h2>
    {hint && <p className="mt-0.5 text-xs text-[#8a7791]">{hint}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

type FormState = {
  slug: string;
  published: boolean;
  name: string;
  roles: CreatorRole[];
  city: string;
  tagline: string;
  socials: CreatorProfile["socials"];
  publicSocials: CreatorProfile["publicSocials"];
  portfolioUrl: string;
  showPortfolio: boolean;
  showSetcard: boolean;
  references: CreatorReference[];
};

const formOf = (c: CreatorProfile): FormState => ({
  slug: c.slug,
  published: c.published,
  name: c.name,
  roles: c.roles,
  city: c.city,
  tagline: c.tagline,
  socials: c.socials,
  publicSocials: c.publicSocials,
  portfolioUrl: c.portfolioUrl,
  showPortfolio: c.showPortfolio,
  showSetcard: c.showSetcard,
  references: c.references,
});

const STATUS_LABEL: Record<CreatorVideo["status"], string> = {
  uploading: "Upload unvollständig",
  processing: "Wird in der Swibble-App komprimiert – meist 1–3 Minuten, dann erscheint das Cover",
  ready: "",
  failed: "Fehlgeschlagen",
};

function move<T>(list: T[], index: number, by: number): T[] {
  const target = index + by;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const AdminCreatorEditor = ({ initial, appVideosAvailable, homeVideos }: Props) => {
  const router = useRouter();
  const [creator, setCreator] = useState(initial);
  const [form, setForm] = useState<FormState>(formOf(initial));
  const [saved, setSaved] = useState<FormState>(formOf(initial));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [photoProgress, setPhotoProgress] = useState("");
  const [videoProgress, setVideoProgress] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);
  const [copying, setCopying] = useState("");

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const base = `/api/admin/creators/${creator.id}`;

  const unauthorized = useCallback(() => router.push("/admin/login"), [router]);

  const call = async (url: string, init: RequestInit): Promise<CreatorProfile | null> => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(url, {
        ...init,
        headers: init.body ? { "Content-Type": "application/json" } : undefined,
      });
      if (res.status === 401) {
        unauthorized();
        return null;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Das hat nicht geklappt.");
      if (data.creator) setCreator(data.creator);
      return data.creator ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
      return null;
    }
  };

  // While the Swibble app is still making web copies, ask again every few seconds.
  const processing = creator.videos.some((v) => v.source === "app" && v.status === "processing");
  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(async () => {
      const res = await fetch(base).catch(() => null);
      if (res?.ok) setCreator((await res.json()).creator);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [processing, base]);

  /* ── profile ──────────────────────────────────────────────────────── */

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const copyHomeVideo = async (option: HomeVideoOption) => {
    setCopying(option.id);
    const updated = await call(`${base}/media`, {
      method: "POST",
      body: JSON.stringify({ type: "homeVideo", videoId: option.id, title: option.accountName }),
    });
    setCopying("");
    if (updated) setHomeOpen(false);
  };

  const save = async (next: FormState = form) => {
    setBusy(true);
    const updated = await call(base, { method: "PUT", body: JSON.stringify(next) });
    setBusy(false);
    if (updated) {
      setForm(formOf(updated));
      setSaved(formOf(updated));
      setMessage("Gespeichert.");
    }
  };

  const togglePublished = () => {
    if (dirty && !confirm("Ungespeicherte Änderungen werden mitgespeichert. Fortfahren?")) return;
    save({ ...form, published: !saved.published });
  };

  const updateReference = (index: number, patch: Partial<CreatorReference>) =>
    set(
      "references",
      form.references.map((ref, i) => (i === index ? { ...ref, ...patch } : ref)),
    );

  /* ── media ────────────────────────────────────────────────────────── */

  const handlePhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length === 0) return;
    setError("");
    setMessage("");
    const free = PHOTOS_MAX - creator.photos.length;
    if (files.length > free) setError(`Höchstens ${PHOTOS_MAX} Fotos – ${files.length - free} übersprungen.`);
    try {
      const list = files.slice(0, Math.max(0, free));
      for (const [index, file] of list.entries()) {
        setPhotoProgress(`Foto ${index + 1} von ${list.length} wird hochgeladen …`);
        setCreator(await uploadCreatorPhoto(creator.id, file));
      }
    } catch (err) {
      if (err instanceof MediaError && err.unauthorized) return unauthorized();
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setPhotoProgress("");
    }
  };

  const handleVideo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    try {
      setVideoProgress("Video wird vorbereitet …");
      const updated = await uploadCreatorVideo(creator.id, file, "", (phase, done, total) =>
        setVideoProgress(
          phase === "compress"
            ? `Wird verkleinert … ${Math.round((done / total) * 100)} %`
            : `Upload ${Math.round((done / total) * 100)} % (${Math.max(1, Math.round(total / 1024 ** 2))} MB)`,
        ),
      );
      setCreator(updated);
      setMessage("Video hochgeladen.");
    } catch (err) {
      if (err instanceof MediaError && err.unauthorized) return unauthorized();
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      // The aborted entry is gone on the server; reload the list.
      const res = await fetch(base).catch(() => null);
      if (res?.ok) setCreator((await res.json()).creator);
    } finally {
      setVideoProgress("");
    }
  };

  const reorder = (kind: "photos" | "videos", ids: string[]) =>
    call(`${base}/media`, { method: "PATCH", body: JSON.stringify({ type: "order", kind, ids }) });

  /** Drag and drop: show the new order at once, then save it. */
  const movePhoto = (from: number, to: number) => {
    const photos = moveItem(creator.photos, from, to);
    setCreator((current) => ({ ...current, photos }));
    void reorder("photos", photos.map((p) => p.id));
  };

  const removeMedia = (kind: "photo" | "video", id: string) => {
    if (!confirm(kind === "photo" ? "Foto entfernen?" : "Video von der Seite entfernen?")) return;
    call(`${base}/media?${kind}=${encodeURIComponent(id)}`, { method: "DELETE" });
  };

  const setHidden = (kind: "photo" | "video", id: string, hidden: boolean) =>
    call(`${base}/media`, { method: "PATCH", body: JSON.stringify({ type: "visibility", kind, id, hidden }) });

  const savePhotoCaption = (photoId: string, caption: string) =>
    call(`${base}/media`, { method: "PATCH", body: JSON.stringify({ type: "photoCaption", photoId, caption }) });

  const saveVideoTitle = (videoId: string, title: string) =>
    call(`${base}/media`, { method: "PATCH", body: JSON.stringify({ type: "videoTitle", videoId, title }) });

  const handleDelete = async () => {
    if (!confirm(`Creator-Seite von ${creator.name} endgültig löschen?\n\nAlle Fotos, Videos und Texte der Seite werden entfernt. Die Bewerbung bleibt erhalten.`)) return;
    setBusy(true);
    const res = await fetch(base, { method: "DELETE" });
    setBusy(false);
    if (res.status === 401) return unauthorized();
    if (res.ok) router.push("/admin/creator");
    else setError("Löschen fehlgeschlagen.");
  };

  const publicUrl = `/creator/${saved.slug}`;
  const coverId = creator.photos.find((p) => !p.hidden)?.id;

  return (
    <>
      <Head>
        <title>{`${creator.name} – Creator – Swibble CMS`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-24">
        <Link href="/admin/creator" className="text-sm font-medium text-[#556987] hover:text-[#b718ec]">
          ← Alle Creator
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-[#000D36]">{creator.name}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              saved.published ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"
            }`}
          >
            {saved.published ? "Online" : "Entwurf"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={togglePublished} disabled={busy} className={saved.published ? outlineButton : primaryButton}>
            {saved.published ? "Offline nehmen" : "Veröffentlichen"}
          </button>
          <Link href={publicUrl} target="_blank" className={outlineButton}>
            {saved.published ? "Seite ansehen" : "Vorschau"}
          </Link>
          {creator.applicationId && (
            <Link href={`/admin/bewerbungen/${creator.applicationId}`} className={outlineButton}>
              Zur Bewerbung
            </Link>
          )}
        </div>
        {!creator.applicationId && creator.consentConfirmedAt > 0 && (
          <p className="text-xs text-[#556987]">
            Ohne Bewerbung angelegt · Einverständnis bestätigt am{" "}
            {new Date(creator.consentConfirmedAt).toLocaleDateString("de-DE", {
              dateStyle: "medium",
              timeZone: "Europe/Berlin",
            })}
          </p>
        )}

        <div aria-live="polite">
          {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Photos */}
        <Card
          title={`Fotos (${creator.photos.length})`}
          hint="Zum Sortieren ein Foto ziehen (am Handy gedrückt halten). Das erste sichtbare Foto ist das Titelbild, die übrigen erscheinen mit den Videos unter „Arbeiten & Referenzen“. „Auf der Seite“ ausschalten blendet ein Foto aus, ohne es zu löschen."
        >
          {creator.photos.length > 0 && (
            <SortableGrid
              ids={creator.photos.map((p) => p.id)}
              onMove={movePhoto}
              className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4"
            >
              {creator.photos.map((photo, index) => (
                <SortableTile key={photo.id} id={photo.id} className="flex flex-col gap-1.5 bg-white">
                  {({ handle, dragging }) => (
                <>
                  <div
                    {...handle}
                    aria-label={`Foto ${index + 1}, zum Verschieben ziehen`}
                    className={`relative rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] ${dragHandleClass} ${dragging ? "shadow-xl" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- private media route, admin only */}
                    <img
                      src={thumbUrl(creator.id, photo.id)}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      className={`pointer-events-none aspect-[4/5] w-full rounded-lg border border-[#F0E4F5] object-cover ${photo.hidden ? "opacity-40 grayscale" : ""}`}
                    />
                    {photo.id === coverId && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-[#B718EC] px-2 py-0.5 text-[10px] font-medium text-white">
                        Titelbild
                      </span>
                    )}
                    {photo.hidden && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-[#000D36] px-2 py-0.5 text-[10px] font-medium text-white">
                        Ausgeblendet
                      </span>
                    )}
                    {photo.origin === "swibble" && (
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[#556987]">
                        Swibble
                      </span>
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-[#556987]">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-[#B718EC]"
                      checked={!photo.hidden}
                      onChange={(e) => setHidden("photo", photo.id, !e.target.checked)}
                    />
                    Auf der Seite
                  </label>
                  {photo.id !== coverId && (
                    <input
                      aria-label={`Bildunterschrift Foto ${index + 1}`}
                      className="w-full rounded-md bg-[#F6F6F6] px-2 py-1 text-xs text-[#2A3342] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B718EC]/40"
                      defaultValue={photo.caption}
                      maxLength={VIDEO_TITLE_MAX_LENGTH}
                      placeholder="z. B. Kunde · Projekt"
                      onBlur={(e) => {
                        if (e.target.value.trim() !== photo.caption) savePhotoCaption(photo.id, e.target.value);
                      }}
                    />
                  )}
                  <div className="flex flex-wrap gap-1">
                    {photo.id !== coverId && !photo.hidden && (
                      <button type="button" className={smallButton}
                        onClick={() => reorder("photos", [photo.id, ...creator.photos.filter((p) => p.id !== photo.id).map((p) => p.id)])}>
                        Titelbild
                      </button>
                    )}
                    <button type="button" className={smallButton} aria-label="Foto entfernen" onClick={() => removeMedia("photo", photo.id)}>
                      ✕
                    </button>
                  </div>
                </>
                  )}
                </SortableTile>
              ))}
            </SortableGrid>
          )}
          <label className={`${outlineButton} inline-block cursor-pointer ${photoProgress ? "pointer-events-none opacity-50" : ""}`}>
            + Fotos hochladen
            <input type="file" accept="image/*,.heic,.heif" multiple className="sr-only" onChange={handlePhotos} disabled={Boolean(photoProgress)} />
          </label>
          {photoProgress && <p className="mt-2 text-xs text-[#556987]" aria-live="polite">{photoProgress}</p>}
        </Card>

        {/* Videos */}
        <Card
          title={`Videos (${creator.videos.length})`}
          hint="Aus der Swibble-App oder als Datei – beides wird automatisch verkleinert."
        >
          {creator.videos.length > 0 && (
            <ul className="mb-4 flex flex-col gap-3">
              {creator.videos.map((video, index) => {
                const cover = video.source === "app" ? video.coverUrl : video.coverPath ? videoCoverUrl(creator.id, video.id) : "";
                return (
                  <li
                    key={video.id}
                    className={`flex gap-3 rounded-lg border border-[#F0E4F5] p-2 ${video.hidden ? "bg-[#F6F6F6]" : ""}`}
                  >
                    <div
                      className={`flex h-24 w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#FDF5FF] text-lg ${video.hidden ? "opacity-40 grayscale" : ""}`}
                    >
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element -- cover from the app or the private media route
                        <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden>{video.status === "processing" ? "⏳" : "🎬"}</span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <input
                        aria-label="Bildunterschrift"
                        className={inputClass}
                        defaultValue={video.title}
                        maxLength={VIDEO_TITLE_MAX_LENGTH}
                        placeholder="Bildunterschrift, z. B. Kunde · Projekt"
                        onBlur={(e) => {
                          if (e.target.value.trim() !== video.title) saveVideoTitle(video.id, e.target.value);
                        }}
                      />
                      <label className="flex items-center gap-1.5 text-xs text-[#556987]">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-[#B718EC]"
                          checked={!video.hidden}
                          onChange={(e) => setHidden("video", video.id, !e.target.checked)}
                        />
                        Auf der Seite
                      </label>
                      <p className="text-xs text-[#8a7791]">
                        {video.source === "app" ? "Swibble-App" : "Upload"}
                        {STATUS_LABEL[video.status] && (
                          <span className={video.status === "failed" || video.status === "uploading" ? "text-red-600" : ""}>
                            {" "}· {STATUS_LABEL[video.status]}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <button type="button" className={smallButton} disabled={index === 0} aria-label="Nach oben"
                          onClick={() => reorder("videos", move(creator.videos, index, -1).map((v) => v.id))}>
                          ↑
                        </button>
                        <button type="button" className={smallButton} disabled={index === creator.videos.length - 1} aria-label="Nach unten"
                          onClick={() => reorder("videos", move(creator.videos, index, 1).map((v) => v.id))}>
                          ↓
                        </button>
                        <button type="button" className={smallButton} onClick={() => removeMedia("video", video.id)}>
                          Entfernen
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {appVideosAvailable && (
              <button type="button" className={outlineButton} disabled={creator.videos.length >= VIDEOS_MAX} onClick={() => setPickerOpen(true)}>
                + Aus Swibble-App
              </button>
            )}
            {homeVideos.length > 0 && (
              <button type="button" className={outlineButton} disabled={creator.videos.length >= VIDEOS_MAX} aria-expanded={homeOpen} onClick={() => setHomeOpen((open) => !open)}>
                + Von der Startseite
              </button>
            )}
            <label className={`${outlineButton} inline-block cursor-pointer ${videoProgress || creator.videos.length >= VIDEOS_MAX ? "pointer-events-none opacity-50" : ""}`}>
              + Video hochladen
              <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm" className="sr-only" onChange={handleVideo} disabled={Boolean(videoProgress)} />
            </label>
          </div>
          {videoProgress && <p className="mt-2 text-xs text-[#556987]" aria-live="polite">{videoProgress}</p>}
          {homeOpen && (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {homeVideos.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={Boolean(copying)}
                    onClick={() => copyHomeVideo(option)}
                    className="group flex w-full flex-col gap-1 text-left disabled:opacity-50"
                  >
                    <span className="block aspect-[9/16] w-full overflow-hidden rounded-md bg-[#FDF5FF] ring-1 ring-[#F0E4F5] group-hover:ring-[#B718EC]">
                      {option.coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- cover of a home page video
                        <img src={option.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="line-clamp-2 text-xs text-[#2A3342]">
                      {copying === option.id ? "Wird übernommen …" : option.accountName || option.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Profile */}
        <Card title="Profil">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="c-name">Name (öffentlich nur der Vorname)</label>
                <input id="c-name" className={inputClass} value={form.name} maxLength={60} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="c-city">Wohnort</label>
                <input id="c-city" className={inputClass} value={form.city} maxLength={80} onChange={(e) => set("city", e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="c-slug">Adresse</label>
              <div className="flex items-center gap-1 text-sm text-[#8a7791]">
                <span className="shrink-0">swibble.net/creator/</span>
                <input
                  id="c-slug"
                  className={inputClass}
                  value={form.slug}
                  maxLength={SLUG_MAX_LENGTH}
                  onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                />
              </div>
            </div>

            <fieldset>
              <legend className={labelClass}>Rollen</legend>
              <div className="flex flex-wrap gap-4">
                {CREATOR_ROLES.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm text-[#2A3342]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#B718EC]"
                      checked={form.roles.includes(role.id)}
                      onChange={() =>
                        set(
                          "roles",
                          form.roles.includes(role.id)
                            ? form.roles.filter((r) => r !== role.id)
                            : CREATOR_ROLES.map((r) => r.id).filter((r) => r === role.id || form.roles.includes(r)),
                        )
                      }
                    />
                    {role.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className={labelClass} htmlFor="c-tagline">Kurzbeschreibung</label>
              <input
                id="c-tagline"
                className={inputClass}
                value={form.tagline}
                maxLength={TAGLINE_MAX_LENGTH}
                placeholder="z. B. Lifestyle & Fashion, Englisch fließend"
                onChange={(e) => set("tagline", e.target.value)}
              />
              <p className="mt-1 text-right text-xs text-[#8a7791]">{form.tagline.length} / {TAGLINE_MAX_LENGTH}</p>
            </div>

            <p className="-mb-2 text-xs text-[#8a7791]">
              Kanäle und Portfolio sind intern. Auf der Seite erscheint nur, was du mit
              „auf der Seite zeigen“ freigibst – sonst laufen Anfragen nur über Swibble.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(["instagram", "tiktok", "youtube", "snapchat"] as const).map((platform) => (
                <div key={platform}>
                  <label className={labelClass} htmlFor={`c-${platform}`}>
                    {{ instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", snapchat: "Snapchat" }[platform]}
                  </label>
                  <input
                    id={`c-${platform}`}
                    className={inputClass}
                    value={form.socials[platform]}
                    placeholder="name"
                    onChange={(e) => set("socials", { ...form.socials, [platform]: e.target.value })}
                  />
                  <label className="mt-1 flex items-center gap-2 text-xs text-[#556987]">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-[#B718EC]"
                      disabled={!form.socials[platform].trim()}
                      checked={form.publicSocials.includes(platform) && Boolean(form.socials[platform].trim())}
                      onChange={(e) =>
                        set(
                          "publicSocials",
                          e.target.checked
                            ? [...form.publicSocials, platform]
                            : form.publicSocials.filter((p) => p !== platform),
                        )
                      }
                    />
                    auf der Seite zeigen
                  </label>
                </div>
              ))}
            </div>

            <div>
              <label className={labelClass} htmlFor="c-portfolio">Portfolio / Website</label>
              <input id="c-portfolio" className={inputClass} value={form.portfolioUrl} onChange={(e) => set("portfolioUrl", e.target.value)} />
              <label className="mt-1 flex items-center gap-2 text-xs text-[#556987]">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-[#B718EC]"
                  disabled={!form.portfolioUrl.trim()}
                  checked={form.showPortfolio && Boolean(form.portfolioUrl.trim())}
                  onChange={(e) => set("showPortfolio", e.target.checked)}
                />
                auf der Seite zeigen
              </label>
            </div>

            {creator.setcardPath && (
              <label className="flex items-center gap-2 text-sm text-[#2A3342]">
                <input type="checkbox" className="h-4 w-4 accent-[#B718EC]" checked={form.showSetcard} onChange={(e) => set("showSetcard", e.target.checked)} />
                Setcard aus der Bewerbung zum Download anbieten
              </label>
            )}
          </div>
        </Card>

        {/* References */}
        <Card
          title="Weitere Referenzen"
          hint="Nur für Kunden ohne Fotos oder Videos – erscheinen klein unter der Galerie. Mit Bildern einfach als Bildunterschrift eintragen."
        >
          <div className="flex flex-col gap-2">
            {form.references.map((ref, index) => (
              <div key={ref.id} className="grid grid-cols-1 gap-2 rounded-lg border border-[#F0E4F5] p-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input aria-label="Kunde" className={inputClass} placeholder="Kunde, z. B. Aquis Plaza" value={ref.name} maxLength={REFERENCE_NAME_MAX_LENGTH} onChange={(e) => updateReference(index, { name: e.target.value })} />
                <input aria-label="Was" className={inputClass} placeholder="Was, z. B. TikTok-Serie" value={ref.detail} maxLength={REFERENCE_DETAIL_MAX_LENGTH} onChange={(e) => updateReference(index, { detail: e.target.value })} />
                <input aria-label="Link" className={inputClass} placeholder="Link (optional)" value={ref.url} onChange={(e) => updateReference(index, { url: e.target.value })} />
                <button type="button" className={smallButton} aria-label="Referenz entfernen" onClick={() => set("references", form.references.filter((_, i) => i !== index))}>
                  ✕
                </button>
              </div>
            ))}
            {form.references.length < REFERENCES_MAX && (
              <button
                type="button"
                className="rounded-lg border border-dashed border-[#d8c7e0] py-2 text-sm font-medium text-[#b718ec] hover:border-[#b718ec] hover:bg-[#FDF5FF]"
                onClick={() => set("references", [...form.references, { id: `new-${Date.now()}`, name: "", detail: "", url: "" }])}
              >
                + Referenz
              </button>
            )}
          </div>
        </Card>

        <section className="rounded-xl border border-red-200 bg-red-50/50 p-5">
          <h2 className="text-base font-semibold text-red-700">Creator-Seite löschen</h2>
          <p className="mt-1 text-sm text-[#556987]">
            Entfernt die Seite mit allen Fotos und Videos. Die Bewerbung bleibt. Bei Widerruf die
            Bewerbung löschen – das entfernt auch diese Seite.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="mt-3 rounded-[10px] border border-red-500 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
          >
            Seite löschen
          </button>
        </section>
      </section>

      {/* Save bar for the text fields */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#F0E4F5] bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="text-sm text-[#556987]">Ungespeicherte Änderungen</p>
            <div className="flex gap-2">
              <button type="button" className={outlineButton} onClick={() => setForm(saved)} disabled={busy}>
                Verwerfen
              </button>
              <button type="button" className={primaryButton} onClick={() => save()} disabled={busy}>
                {busy ? "Speichern …" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pickerOpen && (
        <AppVideoPicker
          addUrl={`${base}/media`}
          addFields={{ type: "appVideo" }}
          onClose={() => setPickerOpen(false)}
          onAdded={async () => {
            const res = await fetch(base).catch(() => null);
            if (res?.ok) setCreator((await res.json()).creator);
          }}
          onUnauthorized={unauthorized}
        />
      )}
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  const id = typeof ctx.params?.id === "string" ? ctx.params.id : "";
  const creator = id ? await getCreator(id) : null;
  if (!creator) return { notFound: true };
  return {
    props: {
      initial: creator,
      appVideosAvailable: isAppVideoApiConfigured(),
      homeVideos: await listCopyableHomeVideos().catch(() => []),
    },
  };
};

export default AdminCreatorEditor;
