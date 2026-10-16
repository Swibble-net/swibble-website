import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import type { GetServerSideProps } from "next";
import AdminNav from "@/components/admin/AdminNav";
import CreatorRoleToggles from "@/components/admin/CreatorRoleToggles";
import { SortableGrid, SortableTile, dragHandleClass, moveItem } from "@/components/SortableGrid";
import { isAuthenticated } from "@/lib/adminAuth";
import { roleLabel, type CreatorRole } from "@/lib/applications/config";
import { calculateAge, parseIsoDate, todayInBerlin } from "@/lib/applications/age";
import { listApplications } from "@/lib/applications/store";
import { thumbUrl } from "@/lib/creators/config";
import { isCreatorStoreAvailable, listCreators } from "@/lib/creators/store";

interface CreatorSummary {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  roles: CreatorRole[];
  city: string;
  cover: string;
  photos: number;
  videos: number;
}

interface OpenApplication {
  id: string;
  name: string;
  roles: string[];
  age: number | null;
  city: string;
  createdAt: number;
}

interface Props {
  creators: CreatorSummary[];
  /** Creator pool applications without a page yet (not rejected) */
  open: OpenApplication[];
  available: boolean;
}

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

const AdminCreators = ({ creators: initialCreators, open, available }: Props) => {
  const router = useRouter();
  const [creators, setCreators] = useState(initialCreators);

  /** Drag and drop: show the new order at once, then save it for /creator. */
  const moveCreator = async (from: number, to: number) => {
    const next = moveItem(creators, from, to);
    setCreators(next);
    setError("");
    const res = await fetch("/api/admin/creators", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((c) => c.id) }),
    }).catch(() => null);
    if (res?.status === 401) return router.push("/admin/login");
    if (!res?.ok) setError("Die Reihenfolge konnte nicht gespeichert werden.");
  };
  const [creating, setCreating] = useState("");
  const [error, setError] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualConsent, setManualConsent] = useState(false);

  /** `applicationId` = page from that application, "" = empty page for `manualName` */
  const createPage = async (applicationId: string) => {
    setCreating(applicationId || "manual");
    setError("");
    try {
      const res = await fetch("/api/admin/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          applicationId ? { applicationId } : { name: manualName, consent: manualConsent },
        ),
      });
      if (res.status === 401) return router.push("/admin/login");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Anlegen fehlgeschlagen.");
      router.push(`/admin/creator/${data.creator.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
      setCreating("");
    }
  };

  return (
  <>
    <Head>
      <title>Creator – Swibble CMS</title>
      <meta name="robots" content="noindex, nofollow" />
    </Head>

    <section className="mx-auto w-full max-w-5xl">
      <AdminNav current="Creator" />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#000D36]">Swibble Creator</h1>
          <p className="mt-1 text-sm text-[#556987]">
            Bewerbungen landen unter „Bewerbungen“; hier wird daraus eine öffentliche Seite.
          </p>
        </div>
        <Link
          href="/creator"
          target="_blank"
          className="self-start rounded-[10px] border border-[#B718EC] px-4 py-2 text-sm font-medium text-[#B718EC] transition hover:bg-[#FDF5FF]"
        >
          Übersichtsseite ansehen
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void createPage("");
        }}
        className="mb-8 flex flex-col gap-3 rounded-xl border border-[#F0E4F5] bg-white p-4"
      >
        <h2 className="text-base font-semibold text-[#000D36]">Creator ohne Bewerbung anlegen</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="manual-name">
            Name
          </label>
          <input
            id="manual-name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            maxLength={60}
            placeholder="Vor- und Nachname"
            className="min-h-10 flex-1 rounded-[10px] border border-[#E4D3EC] px-3 text-sm focus:border-[#B718EC] focus:outline-none"
          />
          <button
            type="submit"
            disabled={Boolean(creating) || !manualName.trim() || !manualConsent}
            className="rounded-[10px] bg-[#B718EC] px-4 py-2 text-sm font-medium text-white hover:bg-[#a514d6] disabled:opacity-50"
          >
            {creating === "manual" ? "Wird angelegt …" : "Anlegen"}
          </button>
        </div>
        <label className="flex items-start gap-2 text-sm text-[#2A3342]">
          <input
            type="checkbox"
            checked={manualConsent}
            onChange={(e) => setManualConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#B718EC]"
          />
          Einverständnis liegt vor (z. B. Vertrag oder Absprache): Swibble darf mit Fotos und Videos dieser Person
          werben und sie Kunden als Swibble Creator vorstellen.
        </label>
      </form>

      {open.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-[#000D36]">
            Neue Bewerbungen aus dem Creator Pool ({open.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {open.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 rounded-xl border border-[#F0E4F5] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-[#000D36]">{a.name}</p>
                  <p className="text-xs text-[#556987]">
                    {[
                      a.roles.map((id) => roleLabel(id, "creator")).join(", "),
                      a.age !== null ? `${a.age} Jahre` : "",
                      a.city,
                      formatDate(a.createdAt),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/bewerbungen/${a.id}`}
                    className="rounded-[10px] border border-[#F0E4F5] px-3 py-1.5 text-sm font-medium text-[#556987] hover:border-[#b718ec] hover:text-[#b718ec]"
                  >
                    Bewerbung
                  </Link>
                  <button
                    type="button"
                    disabled={Boolean(creating)}
                    onClick={() => createPage(a.id)}
                    className="rounded-[10px] bg-[#B718EC] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a514d6] disabled:opacity-50"
                  >
                    {creating === a.id ? "Wird angelegt …" : "Seite anlegen"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!available && (
        <p className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          Firebase-Speicher nicht konfiguriert – Creator-Seiten sind nicht verfügbar.
        </p>
      )}

      {creators.length === 0 ? (
        <p className="rounded-xl bg-[#FDF5FF] p-6 text-center text-[#556987]">
          Noch keine Creator-Seiten.
        </p>
      ) : (
        <>
        <p className="mb-2 text-xs text-[#8a7791]">
          Reihenfolge wie auf /creator – zum Sortieren am Griff ⠿ ziehen (am Handy gedrückt halten).
        </p>
        <SortableGrid
          ids={creators.map((c) => c.id)}
          onMove={moveCreator}
          label="Creator"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {creators.map((c, index) => (
            <SortableTile
              key={c.id}
              id={c.id}
              className="overflow-hidden rounded-xl border border-[#F0E4F5] bg-white transition hover:border-[#b718ec]/50 hover:shadow-sm"
            >
              {({ handle, dragging }) => (
              <>
              <button
                type="button"
                {...handle}
                aria-label={`${c.name} verschieben (Platz ${index + 1})`}
                className={`absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-[#556987] shadow ${dragHandleClass} ${
                  dragging ? "ring-2 ring-[#B718EC]" : ""
                }`}
              >
                <span aria-hidden>⠿</span>
              </button>
              <Link href={`/admin/creator/${c.id}`} className="block">
                <div className="relative aspect-[4/5] bg-[#FDF5FF]">
                  {c.cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- private media route, admin only
                    <img src={c.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.published ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {c.published ? "Online" : "Entwurf"}
                  </span>
                </div>
                <div className="px-3 pt-3">
                  <p className="font-semibold text-[#000D36]">{c.name}</p>
                  <p className="mt-1 text-xs text-[#8a7791]">
                    {[c.city, `${c.photos} Fotos`, `${c.videos} Videos`].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Link>
              {/* Services switch on and off right here, saved at once. */}
              <div className="p-3 pt-2">
                <CreatorRoleToggles
                  size="sm"
                  creatorId={c.id}
                  roles={c.roles}
                  onUnauthorized={() => router.push("/admin/login")}
                  onSaved={(updated) =>
                    setCreators((list) =>
                      list.map((item) => (item.id === updated.id ? { ...item, roles: updated.roles } : item)),
                    )
                  }
                />
              </div>
              </>
              )}
            </SortableTile>
          ))}
        </SortableGrid>
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
  const creators = (await listCreators()).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    published: c.published,
    roles: c.roles,
    city: c.city,
    cover: (() => {
      const first = c.photos.find((p) => !p.hidden);
      return first ? thumbUrl(c.id, first.id) : "";
    })(),
    photos: c.photos.length,
    videos: c.videos.length,
  }));
  const withPage = new Set((await listCreators()).map((c) => c.applicationId));
  const today = todayInBerlin();
  const open = (await listApplications())
    .filter(
      (a) => a.pool === "creator" && !a.incomplete && a.status !== "abgelehnt" && !withPage.has(a.id),
    )
    .map((a) => {
      const birth = parseIsoDate(a.birthDate);
      return {
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        roles: a.roles,
        age: birth ? calculateAge(birth, today) : null,
        city: a.city,
        createdAt: a.createdAt,
      };
    });
  return { props: { creators, open, available: isCreatorStoreAvailable() } };
};

export default AdminCreators;
