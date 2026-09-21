import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import {
  APPLICATION_ROLES,
  APPLICATION_STATUSES,
  roleLabel,
} from "@/lib/applications/config";
import StatusBadge from "@/components/applications/StatusBadge";
import {
  isApplicationStoreAvailable,
  isConsentUploadAvailable,
  listApplications,
} from "@/lib/applications/store";
import { calculateAge, parseIsoDate, todayInBerlin } from "@/lib/applications/age";
import { isTurnstileEnforced } from "@/lib/turnstile";
import type { Application } from "@/lib/applications/types";

/** The list only needs a summary — full records stay on the detail page. */
type ApplicationSummary = Pick<
  Application,
  | "id"
  | "firstName"
  | "lastName"
  | "roles"
  | "center"
  | "centerName"
  | "isMinor"
  | "status"
  | "city"
  | "createdAt"
> & { hasConsentFile: boolean; age: number | null; photoCount: number };

interface Props {
  applications: ApplicationSummary[];
  storeAvailable: boolean;
  uploadsAvailable: boolean;
  turnstileEnforced: boolean;
}

const NO_CENTER = "__none__";

const formatDateTime = (ms: number) =>
  new Date(ms).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

const selectClass =
  "w-full rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm text-[#2A3342] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B718EC]/40";
const navLinkClass =
  "rounded-lg border border-[#F0E4F5] px-3 py-1.5 text-sm font-medium text-[#556987] transition hover:border-[#b718ec] hover:text-[#b718ec]";

const AdminApplications = ({
  applications,
  storeAvailable,
  uploadsAvailable,
  turnstileEnforced,
}: Props) => {
  const [center, setCenter] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [minor, setMinor] = useState("");

  const centers = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of applications) {
      if (a.center) map.set(a.center, a.centerName || a.center);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "de"));
  }, [applications]);

  const filtered = applications.filter(
    (a) =>
      (!center || (center === NO_CENTER ? !a.center : a.center === center)) &&
      (!role || a.roles.includes(role as (typeof a.roles)[number])) &&
      (!status || a.status === status) &&
      (!minor || (minor === "ja") === a.isMinor),
  );

  return (
    <>
      <Head>
        <title>Bewerbungen – Swibble CMS</title>
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
          <span className="rounded-lg bg-[#B718EC] px-3 py-1.5 text-sm font-medium text-white">
            Bewerbungen
          </span>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#000D36]">Bewerbungen</h1>
          <a
            href="/api/applications?format=csv"
            download
            className="self-start rounded-[10px] border border-[#B718EC] px-4 py-2 text-sm font-medium text-[#B718EC] transition hover:bg-[#FDF5FF]"
          >
            CSV-Export (alle)
          </a>
        </div>

        {!storeAvailable && (
          <p className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            Firebase ist nicht konfiguriert – Bewerbungen können nicht
            gespeichert werden.
          </p>
        )}
        {storeAvailable && !uploadsAvailable && (
          <p className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            <strong>Storage fehlt:</strong> <code>FIREBASE_STORAGE_BUCKET</code>{" "}
            ist nicht gesetzt. Minderjährige können sich deshalb aktuell nicht
            bewerben (der Muttizettel-Upload ist deaktiviert).
          </p>
        )}
        {!turnstileEnforced && (
          <p className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            <strong>Spam-Schutz unvollständig:</strong>{" "}
            <code>TURNSTILE_SECRET_KEY</code> ist nicht gesetzt – Turnstile-Tokens
            werden serverseitig nicht geprüft.
          </p>
        )}

        {/* Filters */}
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-[#F0E4F5] bg-white p-4 sm:grid-cols-4">
          <label className="text-xs font-medium text-[#556987]">
            Center
            <select
              className={`${selectClass} mt-1`}
              value={center}
              onChange={(e) => setCenter(e.target.value)}
            >
              <option value="">Alle</option>
              {centers.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
              <option value={NO_CENTER}>Ohne Center</option>
            </select>
          </label>
          <label className="text-xs font-medium text-[#556987]">
            Rolle
            <select
              className={`${selectClass} mt-1`}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Alle</option>
              {APPLICATION_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-[#556987]">
            Status
            <select
              className={`${selectClass} mt-1`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Alle</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-[#556987]">
            Minderjährig
            <select
              className={`${selectClass} mt-1`}
              value={minor}
              onChange={(e) => setMinor(e.target.value)}
            >
              <option value="">Alle</option>
              <option value="ja">Ja</option>
              <option value="nein">Nein</option>
            </select>
          </label>
        </div>

        <p className="mb-3 text-sm text-[#556987]" aria-live="polite">
          {filtered.length} von {applications.length} Bewerbungen
        </p>

        {filtered.length === 0 ? (
          <p className="rounded-xl bg-[#FDF5FF] p-6 text-center text-[#556987]">
            {applications.length === 0
              ? "Noch keine Bewerbungen eingegangen."
              : "Keine Bewerbungen für diese Filter."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/bewerbungen/${a.id}`}
                  className="block rounded-xl border border-[#F0E4F5] bg-white p-4 text-[#2A3342] transition hover:border-[#b718ec]/50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold">
                      {a.firstName} {a.lastName}
                      {a.isMinor && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          U18{a.hasConsentFile ? " · Zettel ✓" : ""}
                        </span>
                      )}
                    </h2>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="mt-1 text-sm text-[#556987]">
                    {a.roles.map(roleLabel).join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-[#8a7791]">
                    {a.age !== null && `${a.age} Jahre · `}
                    {a.centerName || "Ohne Center"} · {a.city}
                    {a.photoCount > 0 && ` · ${a.photoCount} Foto${a.photoCount > 1 ? "s" : ""}`} ·{" "}
                    {formatDateTime(a.createdAt)}
                  </p>
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

  const today = todayInBerlin();
  const applications = (await listApplications()).map((a) => {
    const birth = parseIsoDate(a.birthDate);
    return {
      age: birth ? calculateAge(birth, today) : null,
      photoCount: a.photos.length,
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      roles: a.roles,
      center: a.center,
      centerName: a.centerName,
      isMinor: a.isMinor,
      status: a.status,
      city: a.city,
      createdAt: a.createdAt,
      hasConsentFile: a.consentFile !== null,
    };
  });

  return {
    props: {
      applications,
      storeAvailable: isApplicationStoreAvailable(),
      uploadsAvailable: isConsentUploadAvailable(),
      turnstileEnforced: isTurnstileEnforced(),
    },
  };
};

export default AdminApplications;
