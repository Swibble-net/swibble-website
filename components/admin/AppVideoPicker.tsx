import { FormEvent, useEffect, useState } from "react";
import type {
  AppVideoCandidate,
  AppVideoCandidatePage,
  Video,
} from "@/lib/videos/types";

interface Props {
  onClose: () => void;
  onAdded: (video: Video) => void;
  onUnauthorized: () => void;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
    : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

const STATUS_LABELS: Record<string, string> = {
  posted: "Veröffentlicht",
  approved: "Freigegeben",
  "customer-review": "In Kundenfreigabe",
};

/** Modal listing finished videos from the Swibble app. */
const AppVideoPicker = ({ onClose, onAdded, onUnauthorized }: Props) => {
  const [data, setData] = useState<AppVideoCandidatePage | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  // `loading` is switched on by the handlers that change page/search, so the
  // effect itself only ever updates state after the request has settled.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ page: String(page), q: search });
        const res = await fetch(`/api/admin/app-videos?${params}`);
        if (cancelled) return;
        if (res.status === 401) return onUnauthorized();
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.message || "Laden fehlgeschlagen.");
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, search, onUnauthorized]);

  const goTo = (nextPage: number, nextSearch = search) => {
    if (nextPage === page && nextSearch === search) return;
    setLoading(true);
    setError("");
    setPage(nextPage);
    setSearch(nextSearch);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    goTo(1, query.trim());
  };

  const handleAdd = async (item: AppVideoCandidate) => {
    setAddingId(item.fileId);
    setError("");
    try {
      const res = await fetch("/api/admin/app-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: item.assetId, fileId: item.fileId }),
      });
      if (res.status === 401) return onUnauthorized();
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Hinzufügen fehlgeschlagen.");
      onAdded(payload.video);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-video-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#F0E4F5] p-4 sm:p-5">
          <div>
            <h2
              id="app-video-picker-title"
              className="text-lg font-bold text-[#000D36]"
            >
              Video aus der Swibble-App wählen
            </h2>
            <p className="mt-1 text-xs text-[#8a7791]">
              Das Original bleibt unverändert. Für die Website wird eine
              komprimierte 720p-Kopie mit Cover erzeugt.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-lg px-2 py-1 text-xl leading-none text-[#556987] hover:text-[#b718ec]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 p-4 sm:px-5">
          <input
            aria-label="Videos durchsuchen"
            className="w-full rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm text-[#2A3342] focus:outline-none"
            placeholder="Nach Titel, Datei oder Kunde suchen"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-[10px] border border-[#B718EC] px-4 py-2 text-sm text-[#B718EC]"
          >
            Suchen
          </button>
        </form>

        <div className="min-h-[16rem] flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {loading ? (
            <p className="py-16 text-center text-sm text-[#556987]">Lädt …</p>
          ) : !data?.items.length ? (
            <p className="py-16 text-center text-sm text-[#556987]">
              Keine fertigen Videos gefunden.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {data.items.map((item) => {
                const onWebsite = item.website?.status === "ready";
                return (
                  <li
                    key={`${item.assetId}-${item.fileId}`}
                    className="flex flex-col overflow-hidden rounded-xl border border-[#F0E4F5]"
                  >
                    <div className="relative aspect-[9/16] bg-[#FDF5FF]">
                      {/* Private Drive thumbnail, proxied for the signed-in admin only. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/admin/app-videos/thumbnail?assetId=${encodeURIComponent(item.assetId)}&fileId=${encodeURIComponent(item.fileId)}`}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.hidden = true;
                        }}
                      />
                      {item.accountName && (
                        <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white">
                          {item.accountName}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-2.5">
                      <p
                        className="line-clamp-2 text-sm font-semibold text-[#000D36]"
                        title={item.title}
                      >
                        {item.title || item.name}
                      </p>
                      <p className="text-[11px] text-[#8a7791]">
                        {[
                          STATUS_LABELS[item.status],
                          formatSize(item.size),
                          item.modifiedAt
                            ? new Date(item.modifiedAt).toLocaleDateString("de-DE")
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAdd(item)}
                        disabled={addingId !== null}
                        className="mt-auto rounded-lg bg-[#B718EC] px-3 py-1.5 text-xs font-medium text-white transition hover:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingId === item.fileId
                          ? "Wird hinzugefügt …"
                          : onWebsite
                            ? "Erneut hinzufügen"
                            : "Hinzufügen"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#F0E4F5] p-3 text-sm text-[#556987] sm:px-5">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => goTo(page - 1)}
              className="rounded-lg border border-[#F0E4F5] px-3 py-1.5 disabled:opacity-40"
            >
              ← Zurück
            </button>
            <span>
              Seite {data.page} von {data.pages} · {data.total} Videos
            </span>
            <button
              type="button"
              disabled={page >= data.pages || loading}
              onClick={() => goTo(page + 1)}
              className="rounded-lg border border-[#F0E4F5] px-3 py-1.5 disabled:opacity-40"
            >
              Weiter →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppVideoPicker;
