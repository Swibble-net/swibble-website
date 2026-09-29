import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useRef, useState } from "react";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import { PDF_MAX_BYTES } from "@/lib/pitchdecks/config";
import { listPitchDecks, storeProblem } from "@/lib/pitchdecks/store";
import type { PitchDeck } from "@/lib/pitchdecks/types";

interface Props {
  decks: PitchDeck[];
  problem: string | null;
}

type Phase =
  | { step: "idle" }
  | { step: "processing"; done: number; total: number }
  | { step: "uploading"; sent: number; total: number }
  | { step: "done"; slug: string; pdfSize: number; originalSize: number; compressed: boolean };

// Uploads that never completed (tab closed mid-upload) show up after this.
const STALE_UPLOAD_MS = 30 * 60 * 1000;

const inputClass =
  "w-full rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm text-[#2A3342] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B718EC]/40";
const navLinkClass =
  "rounded-lg border border-[#F0E4F5] px-3 py-1.5 text-sm font-medium text-[#556987] transition hover:border-[#b718ec] hover:text-[#b718ec]";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MB`;
}

const formatDateTime = (ms: number) =>
  new Date(ms).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

const publicUrl = (slug: string) =>
  `${typeof window === "undefined" ? "" : window.location.origin}/pitch/${slug}`;

const titleFromFileName = (name: string) =>
  name
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .trim();

const AdminPitchDecks = ({ decks, problem }: Props) => {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(decks);
  const [file, setFile] = useState<File | null>(null);
  const [customer, setCustomer] = useState("");
  const [title, setTitle] = useState("");
  const [compress, setCompress] = useState(true);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const working = phase.step === "processing" || phase.step === "uploading";

  const handleFile = (chosen: File | null) => {
    setError(null);
    setFile(chosen);
    if (chosen && !title.trim()) setTitle(titleFromFileName(chosen.name));
  };

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(slug));
      setCopied(slug);
      setTimeout(() => setCopied((c) => (c === slug ? null : c)), 2000);
    } catch {
      prompt("Link kopieren:", publicUrl(slug));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Bitte wähle ein PDF aus.");
    if (!customer.trim()) return setError("Bitte gib den Kunden an.");
    if (!title.trim()) return setError("Bitte gib einen Titel an.");

    try {
      // Loaded on demand: pdf.js and pdf-lib are only needed here.
      const [{ processPdf }, { uploadDeck }] = await Promise.all([
        import("@/lib/pitchdecks/processPdf"),
        import("@/lib/pitchdecks/upload"),
      ]);

      setPhase({ step: "processing", done: 0, total: 0 });
      const deck = await processPdf(file, {
        compress,
        title: title.trim(),
        onProgress: (done, total) => setPhase({ step: "processing", done, total }),
      });
      if (deck.pdf.size > PDF_MAX_BYTES) {
        throw new Error(
          `Das PDF ist auch komprimiert noch ${formatSize(deck.pdf.size)} groß (max. ${formatSize(PDF_MAX_BYTES)}).`,
        );
      }

      const result = await uploadDeck(
        deck,
        { customer: customer.trim(), title: title.trim() },
        (sent, total) => setPhase({ step: "uploading", sent, total }),
      );

      const created: PitchDeck = {
        id: result.id,
        slug: result.slug,
        customer: customer.trim(),
        title: title.trim(),
        status: "ready",
        folder: "",
        pages: deck.slides.map((s) => s.size),
        pdfSize: deck.pdf.size,
        originalSize: deck.originalSize,
        compressed: deck.compressed,
        views: 0,
        lastViewedAt: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setItems((prev) => [created, ...prev]);
      setPhase({
        step: "done",
        slug: result.slug,
        pdfSize: deck.pdf.size,
        originalSize: deck.originalSize,
        compressed: deck.compressed,
      });
      setFile(null);
      setCustomer("");
      setTitle("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      if ((err as { unauthorized?: boolean }).unauthorized) {
        router.push("/admin/login");
        return;
      }
      setPhase({ step: "idle" });
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    }
  };

  const handleDelete = async (deck: PitchDeck) => {
    if (!confirm(`Präsentation „${deck.title}" für ${deck.customer} löschen? Der Link funktioniert danach nicht mehr.`)) {
      return;
    }
    setBusyId(deck.id);
    try {
      const res = await fetch(`/api/admin/pitchdecks/${deck.id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Löschen fehlgeschlagen.");
      }
      setItems((prev) => prev.filter((d) => d.id !== deck.id));
      if (phase.step === "done" && phase.slug === deck.slug) setPhase({ step: "idle" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setBusyId(null);
    }
  };

  const visible = items.filter(
    (d) => d.status === "ready" || now - d.createdAt > STALE_UPLOAD_MS,
  );

  return (
    <>
      <Head>
        <title>Pitchdecks – Swibble CMS</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href="/admin" className={navLinkClass}>
            Blog
          </Link>
          <Link href="/admin/linkhub" className={navLinkClass}>
            Linkhub
          </Link>
          <Link href="/admin/videos" className={navLinkClass}>
            Videos
          </Link>
          <Link href="/admin/bewerbungen" className={navLinkClass}>
            Bewerbungen
          </Link>
          <span className="rounded-lg bg-[#B718EC] px-3 py-1.5 text-sm font-medium text-white">
            Pitchdecks
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#000D36]">Pitchdecks</h1>
          <p className="mt-1 text-sm text-[#556987]">
            PDF hochladen, Link an den Kunden schicken. Die Seite ist nicht in Suchmaschinen
            und nur über den Link erreichbar.
          </p>
        </div>

        {problem && (
          <p className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            Hochladen ist hier nicht möglich: {problem}
          </p>
        )}

        {/* Upload */}
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-[#F0E4F5] bg-white p-5 text-[#2A3342]"
        >
          <h2 className="mb-4 font-semibold text-[#000D36]">Neue Präsentation</h2>

          <label
            className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
              file ? "border-[#B718EC] bg-[#FDF5FF]" : "border-[#E8D7EF] hover:border-[#B718EC]"
            } ${working || problem ? "pointer-events-none opacity-60" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              disabled={working || !!problem}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <span className="font-medium text-[#000D36]">{file.name}</span>
                <span className="text-xs text-[#8a7791]">
                  {formatSize(file.size)} · Klicken zum Ändern
                </span>
              </>
            ) : (
              <>
                <span className="font-medium text-[#000D36]">PDF auswählen oder hierher ziehen</span>
                <span className="text-xs text-[#8a7791]">Keynote, PowerPoint, Canva … als PDF exportiert</span>
              </>
            )}
          </label>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-[#556987]">Kunde</span>
              <input
                className={inputClass}
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="z. B. Kaisergarten Aachen"
                maxLength={80}
                disabled={working}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-[#556987]">Titel</span>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Social-Media-Konzept 2027"
                maxLength={120}
                disabled={working}
              />
            </label>
          </div>

          <label className="mb-5 flex items-start gap-2 text-sm text-[#2A3342]">
            <input
              type="checkbox"
              className="mt-0.5 accent-[#B718EC]"
              checked={compress}
              onChange={(e) => setCompress(e.target.checked)}
              disabled={working}
            />
            <span>
              PDF komprimieren (empfohlen)
              <span className="block text-xs text-[#8a7791]">
                Folien werden als Bilder neu gespeichert, Links bleiben klickbar, Text ist danach
                nicht mehr markierbar. Ist das Original kleiner, bleibt es unverändert.
              </span>
            </span>
          </label>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {working && (
            <div className="mb-4" aria-live="polite">
              <div className="mb-1 flex justify-between text-xs text-[#556987]">
                <span>
                  {phase.step === "processing"
                    ? phase.total
                      ? `Folie ${Math.min(phase.done + 1, phase.total)} von ${phase.total} wird verarbeitet …`
                      : "PDF wird geöffnet …"
                    : "Wird hochgeladen …"}
                </span>
                {phase.step === "uploading" && (
                  <span>
                    {formatSize(phase.sent)} / {formatSize(phase.total)}
                  </span>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F3E8F8]">
                <div
                  className="h-full rounded-full bg-[#B718EC] transition-all"
                  style={{
                    width: `${
                      phase.step === "processing"
                        ? phase.total ? (phase.done / phase.total) * 100 : 2
                        : phase.total ? (phase.sent / phase.total) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {phase.step === "done" && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">
              <p className="font-medium">Fertig! Die Präsentation ist online.</p>
              <p className="mt-1 text-green-700">
                {phase.compressed
                  ? `PDF komprimiert: ${formatSize(phase.originalSize)} → ${formatSize(phase.pdfSize)}`
                  : `PDF unverändert (${formatSize(phase.pdfSize)})${
                      compress ? ", das Original war bereits kleiner." : "."
                    }`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="break-all rounded bg-white px-2 py-1 text-xs text-[#2A3342]">
                  {publicUrl(phase.slug)}
                </code>
                <button
                  type="button"
                  onClick={() => copyLink(phase.slug)}
                  className="rounded-lg bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800"
                >
                  {copied === phase.slug ? "Kopiert ✓" : "Link kopieren"}
                </button>
                <a
                  href={`/pitch/${phase.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-green-800 underline"
                >
                  Ansehen
                </a>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={working || !!problem}
            className="rounded-[10px] bg-[#B718EC] px-4 py-2 text-sm font-medium text-[#F0FDF4] transition duration-200 hover:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {working ? "Bitte warten …" : "Hochladen & Link erstellen"}
          </button>
          {working && (
            <p className="mt-2 text-xs text-[#8a7791]">Bitte lass diesen Tab geöffnet, bis der Upload fertig ist.</p>
          )}
        </form>

        {/* List */}
        {visible.length === 0 ? (
          <p className="rounded-xl bg-[#FDF5FF] p-6 text-center text-[#556987]">
            Noch keine Pitchdecks.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((deck) => (
              <li
                key={deck.id}
                className="flex flex-col gap-3 rounded-xl border border-[#F0E4F5] bg-white p-4 text-[#2A3342] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#B718EC]">
                    {deck.customer}
                  </p>
                  <p className="truncate font-semibold text-[#000D36]">{deck.title}</p>
                  <p className="mt-0.5 text-xs text-[#8a7791]">
                    {deck.status === "ready" ? (
                      <>
                        {deck.pages.length} {deck.pages.length === 1 ? "Folie" : "Folien"} ·{" "}
                        {formatSize(deck.pdfSize)}
                        {deck.compressed && ` (statt ${formatSize(deck.originalSize)})`} ·{" "}
                        {formatDateTime(deck.createdAt)} ·{" "}
                        {deck.views === 0
                          ? "noch nicht angesehen"
                          : `${deck.views}× angesehen, zuletzt ${formatDateTime(deck.lastViewedAt)}`}
                      </>
                    ) : (
                      <span className="text-amber-600">
                        Upload abgebrochen ({formatDateTime(deck.createdAt)}) – bitte löschen
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  {deck.status === "ready" && (
                    <>
                      <button
                        type="button"
                        onClick={() => copyLink(deck.slug)}
                        className="font-medium text-[#b718ec] hover:underline"
                      >
                        {copied === deck.slug ? "Kopiert ✓" : "Link kopieren"}
                      </button>
                      <a
                        href={`/pitch/${deck.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#556987] hover:text-[#b718ec]"
                      >
                        Ansehen
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(deck)}
                    disabled={busyId === deck.id}
                    className="text-red-500 hover:underline disabled:opacity-50"
                  >
                    {busyId === deck.id ? "…" : "Löschen"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }

  const problem = storeProblem();
  const decks = problem ? [] : await listPitchDecks();
  return { props: { decks, problem } };
};

export default AdminPitchDecks;
