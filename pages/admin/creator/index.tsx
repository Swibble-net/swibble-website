import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import type { GetServerSideProps } from "next";
import AdminNav from "@/components/admin/AdminNav";
import { isAuthenticated } from "@/lib/adminAuth";
import { roleLabel } from "@/lib/applications/config";
import { calculateAge, parseIsoDate, todayInBerlin } from "@/lib/applications/age";
import { listApplications } from "@/lib/applications/store";
import { thumbUrl } from "@/lib/creators/config";
import { isCreatorStoreAvailable, listCreators } from "@/lib/creators/store";

interface CreatorSummary {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  roles: string[];
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

const AdminCreators = ({ creators, open, available }: Props) => {
  const router = useRouter();
  const [creating, setCreating] = useState("");
  const [error, setError] = useState("");

  const createPage = async (applicationId: string) => {
    setCreating(applicationId);
    setError("");
    try {
      const res = await fetch("/api/admin/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
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
          Noch keine Creator-Seiten – leg oben eine aus einer Bewerbung an.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {creators.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/creator/${c.id}`}
                className="block overflow-hidden rounded-xl border border-[#F0E4F5] bg-white transition hover:border-[#b718ec]/50 hover:shadow-sm"
              >
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
                <div className="p-3">
                  <p className="font-semibold text-[#000D36]">{c.name}</p>
                  <p className="mt-0.5 text-xs text-[#556987]">{c.roles.map((id) => roleLabel(id, "creator")).join(" · ")}</p>
                  <p className="mt-1 text-xs text-[#8a7791]">
                    {[c.city, `${c.photos} Fotos`, `${c.videos} Videos`].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Link>
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
