import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import {
  APPLICATION_POOLS,
  APPLICATION_ROLES,
  APPLICATION_STATUSES,
  CREATOR_ROLES,
  roleLabel,
  type ApplicationRole,
} from "@/lib/applications/config";
import { getApplicationSettings } from "@/lib/applications/settings";
import StatusBadge from "@/components/applications/StatusBadge";
import {
  isApplicationStoreAvailable,
  isConsentUploadAvailable,
  listApplications,
} from "@/lib/applications/store";
import { calculateAge, parseIsoDate, todayInBerlin } from "@/lib/applications/age";
import { isTurnstileEnforced } from "@/lib/turnstile";
import type { Application } from "@/lib/applications/types";
import AdminNav from "@/components/admin/AdminNav";

/** The list only needs a summary — full records stay on the detail page. */
type ApplicationSummary = Pick<
  Application,
  | "id"
  | "pool"
  | "incomplete"
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
  enabledRoles: ApplicationRole[];
  storeAvailable: boolean;
  uploadsAvailable: boolean;
  turnstileEnforced: boolean;
}

const NO_CENTER = "__none__";

// Roles of both forms for the filter; "model" exists in both.
const ALL_ROLES = [...APPLICATION_ROLES, ...CREATOR_ROLES].filter(
  (role, index, list) => list.findIndex((r) => r.id === role.id) === index,
);

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

const AdminApplications = ({
  applications,
  enabledRoles: initialEnabledRoles,
  storeAvailable,
  uploadsAvailable,
  turnstileEnforced,
}: Props) => {
  const router = useRouter();
  const [enabledRoles, setEnabledRoles] = useState(initialEnabledRoles);
  const [savingRoles, setSavingRoles] = useState(false);

  const handleRoleToggle = async (id: ApplicationRole) => {
    const next = enabledRoles.includes(id)
      ? enabledRoles.filter((r) => r !== id)
      : [...enabledRoles, id];
    setSavingRoles(true);
    try {
      const res = await fetch("/api/applications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledRoles: next }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Speichern fehlgeschlagen.");
      setEnabledRoles(data.settings.enabledRoles);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setSavingRoles(false);
    }
  };

  const [pool, setPool] = useState("");
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
      (!pool || a.pool === pool) &&
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
        <AdminNav current="Bewerbungen" />

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
            bewerben (der Muttizettel-Upload ist deaktiviert), und der Creator
            Pool ist geschlossen (Fotos und Unterschrift brauchen den Speicher).
          </p>
        )}
        {!turnstileEnforced && (
          <p className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            <strong>Spam-Schutz unvollständig:</strong>{" "}
            <code>TURNSTILE_SECRET_KEY</code> ist nicht gesetzt – Turnstile-Tokens
            werden serverseitig nicht geprüft.
          </p>
        )}

        {/* Roles offered on /bewerben */}
        <div className="mb-4 rounded-xl border border-[#F0E4F5] bg-white p-4">
          <p className="mb-1 text-sm font-semibold text-[#000D36]">
            Optionen im Bewerbungsformular
          </p>
          <p className="mb-3 text-xs text-[#8a7791]">
            Nur aktivierte Optionen stehen auf /bewerben zur Auswahl – für alle
            Center. Mindestens eine muss aktiv bleiben. Der Creator Pool
            (/bewerben/creator) bietet immer Model, Content Creator, Moderation
            und Promoter:in an.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {APPLICATION_ROLES.map((r) => {
              const checked = enabledRoles.includes(r.id);
              return (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-3 text-sm text-[#2A3342]"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#B718EC]"
                    checked={checked}
                    disabled={
                      savingRoles ||
                      !storeAvailable ||
                      (checked && enabledRoles.length === 1)
                    }
                    onChange={() => handleRoleToggle(r.id)}
                  />
                  {r.label}
                </label>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-[#F0E4F5] bg-white p-4 sm:grid-cols-5">
          <label className="text-xs font-medium text-[#556987]">
            Bereich
            <select
              className={`${selectClass} mt-1`}
              value={pool}
              onChange={(e) => setPool(e.target.value)}
            >
              <option value="">Alle</option>
              {APPLICATION_POOLS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
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
              {ALL_ROLES.map((r) => (
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
                      {a.incomplete && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Upload unvollständig
                        </span>
                      )}
                      {a.pool === "creator" && (
                        <span className="ml-2 rounded-full bg-[#F9EAFF] px-2 py-0.5 text-xs font-medium text-[#B718EC]">
                          Creator Pool
                        </span>
                      )}
                      {a.isMinor && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          U18{a.hasConsentFile ? " · Zettel ✓" : ""}
                        </span>
                      )}
                    </h2>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="mt-1 text-sm text-[#556987]">
                    {a.roles.map((id) => roleLabel(id, a.pool)).join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-[#8a7791]">
                    {a.age !== null && `${a.age} Jahre · `}
                    {a.pool === "creator" ? "" : `${a.centerName || "Ohne Center"} · `}
                    {a.city}
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
      pool: a.pool,
      incomplete: a.incomplete,
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
      enabledRoles: (await getApplicationSettings()).enabledRoles,
      storeAvailable: isApplicationStoreAvailable(),
      uploadsAvailable: isConsentUploadAvailable(),
      turnstileEnforced: isTurnstileEnforced(),
    },
  };
};

export default AdminApplications;
