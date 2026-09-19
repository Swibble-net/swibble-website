import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type ReactNode } from "react";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import StatusBadge from "@/components/applications/StatusBadge";
import {
  APPLICATION_STATUSES,
  NOTE_MAX_LENGTH,
  roleLabel,
  type ApplicationStatus,
} from "@/lib/applications/config";
import { calculateAge, parseIsoDate, todayInBerlin } from "@/lib/applications/age";
import {
  SOCIAL_PLATFORMS,
  profileUrl,
  type SocialPlatform,
} from "@/lib/applications/handles";
import { getApplication } from "@/lib/applications/store";
import type { Application } from "@/lib/applications/types";

interface Props {
  application: Application;
}

const formatDateTime = (ms: number) =>
  new Date(ms).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

const formatBirthDate = (iso: string) => {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.day)}.${pad(d.month)}.${d.year}`;
};

const linkClass = "text-[#b718ec] underline-offset-2 hover:underline";

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-xl border border-[#F0E4F5] bg-white p-5">
    <h2 className="mb-3 text-base font-semibold text-[#000D36]">{title}</h2>
    {children}
  </section>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-1 gap-0.5 py-1.5 text-sm sm:grid-cols-[11rem_1fr] sm:gap-3">
    <dt className="text-[#8a7791]">{label}</dt>
    <dd className="break-words text-[#2A3342]">{children}</dd>
  </div>
);

const AdminApplicationDetail = ({ application: initial }: Props) => {
  const router = useRouter();
  const [application, setApplication] = useState(initial);
  const [note, setNote] = useState(initial.note);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const birth = parseIsoDate(application.birthDate);
  const currentAge = birth ? calculateAge(birth, todayInBerlin()) : null;
  const file = application.consentFile;
  const fileUrl = `/api/applications/${application.id}/file`;
  const isImage = file ? ["jpg", "png"].includes(file.extension) : false;

  const request = async (init: RequestInit) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return null;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Aktion fehlgeschlagen.");
      return data as { application?: Application };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const patch = async (
    body: { status?: ApplicationStatus; note?: string },
    success: string,
  ) => {
    const data = await request({ method: "PATCH", body: JSON.stringify(body) });
    if (data?.application) {
      setApplication(data.application);
      setMessage(success);
    }
  };

  const handleDelete = async () => {
    const name = `${application.firstName} ${application.lastName}`;
    if (
      !confirm(
        `Bewerbung von ${name} endgültig löschen?\n\nAlle Angaben${file ? " und die hochgeladene Einverständniserklärung" : ""} werden unwiderruflich entfernt.`,
      )
    ) {
      return;
    }
    const data = await request({ method: "DELETE" });
    if (data) router.push("/admin/bewerbungen");
  };

  const socials = (Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[]).filter(
    (platform) => application.socials[platform],
  );

  return (
    <>
      <Head>
        <title>Bewerbung – Swibble CMS</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Link
          href="/admin/bewerbungen"
          className="text-sm font-medium text-[#556987] hover:text-[#b718ec]"
        >
          ← Alle Bewerbungen
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-[#000D36]">
            {application.firstName} {application.lastName}
          </h1>
          <StatusBadge status={application.status} />
          {application.isMinor && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Minderjährig bei Bewerbung
            </span>
          )}
        </div>

        <div aria-live="polite">
          {message && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <Card title="Bewerbung">
          <dl>
            <Row label="Bewirbt sich als">
              {application.roles.map(roleLabel).join(", ")}
            </Row>
            <Row label="Center">
              {application.center ? (
                <Link
                  href={`/linkhub/${application.center}`}
                  target="_blank"
                  className={linkClass}
                >
                  {application.centerName || application.center}
                </Link>
              ) : (
                "Egal / nicht angegeben"
              )}
            </Row>
            <Row label="Eingegangen">{formatDateTime(application.createdAt)}</Row>
            {application.about && (
              <Row label="Über sich">
                <span className="whitespace-pre-wrap">{application.about}</span>
              </Row>
            )}
          </dl>
        </Card>

        <Card title="Person & Kontakt">
          <dl>
            <Row label="Geburtsdatum">
              {formatBirthDate(application.birthDate)}
              {currentAge !== null && ` (heute ${currentAge} Jahre)`}
            </Row>
            <Row label="Wohnort">
              {application.postalCode} {application.city}
            </Row>
            <Row label="E-Mail">
              <a href={`mailto:${application.email}`} className={linkClass}>
                {application.email}
              </a>
            </Row>
            <Row label="Handy">
              <a href={`tel:${application.phone}`} className={linkClass}>
                {application.phone}
              </a>
              {" · "}
              <a
                href={`https://wa.me/${application.phone.replace(/^\+/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                WhatsApp
              </a>
            </Row>
            {socials.map((platform) => (
              <Row key={platform} label={SOCIAL_PLATFORMS[platform].label}>
                <a
                  href={profileUrl(platform, application.socials[platform])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  @{application.socials[platform]}
                </a>
              </Row>
            ))}
          </dl>
        </Card>

        {application.isMinor && (
          <Card title="Einverständnis der Eltern">
            <dl>
              <Row label="Erziehungsberechtigte:r">
                {application.guardian?.name || "—"}
              </Row>
              {application.guardian?.phone && (
                <Row label="Telefon">
                  <a
                    href={`tel:${application.guardian.phone}`}
                    className={linkClass}
                  >
                    {application.guardian.phone}
                  </a>
                </Row>
              )}
              {application.guardian?.email && (
                <Row label="E-Mail">
                  <a
                    href={`mailto:${application.guardian.email}`}
                    className={linkClass}
                  >
                    {application.guardian.email}
                  </a>
                </Row>
              )}
              <Row label="Muttizettel">
                {file ? (
                  <span className="flex flex-wrap gap-x-4 gap-y-1">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      Öffnen
                    </a>
                    <a href={`${fileUrl}?download=1`} className={linkClass}>
                      Herunterladen
                    </a>
                    <span className="text-[#8a7791]">
                      {file.extension.toUpperCase()},{" "}
                      {Math.max(1, Math.round(file.size / 1024))} KB
                    </span>
                  </span>
                ) : (
                  <span className="text-red-600">Keine Datei vorhanden</span>
                )}
              </Row>
            </dl>
            {file && isImage && (
              // eslint-disable-next-line @next/next/no-img-element -- private, admin-only API route; must not go through the image optimizer cache
              <img
                src={fileUrl}
                alt="Hochgeladene Einverständniserklärung"
                className="mt-3 max-h-[32rem] w-full rounded-lg border border-[#F0E4F5] object-contain"
              />
            )}
          </Card>
        )}

        <Card title="Einwilligungen">
          <dl>
            <Row label="Erteilt am">
              {formatDateTime(application.consent.givenAt)} (Version{" "}
              {application.consent.version})
            </Row>
            <Row label="Kontakt">„{application.consent.contactText}“</Row>
            <Row label="Datenschutz">„{application.consent.privacyText}“</Row>
          </dl>
        </Card>

        <Card title="Bearbeitung">
          <fieldset disabled={busy}>
            <legend className="mb-2 text-sm text-[#8a7791]">Status</legend>
            <div className="flex flex-wrap gap-2">
              {APPLICATION_STATUSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={application.status === s.id}
                  onClick={() => patch({ status: s.id }, "Status gespeichert.")}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                    application.status === s.id
                      ? "border-[#B718EC] bg-[#B718EC] text-white"
                      : "border-[#F0E4F5] text-[#556987] hover:border-[#b718ec] hover:text-[#b718ec]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label
            className="mb-1 mt-5 block text-sm text-[#8a7791]"
            htmlFor="note"
          >
            Interne Notiz (nur im Admin-Bereich sichtbar)
          </label>
          <textarea
            id="note"
            className="min-h-24 w-full rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm text-[#2A3342] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B718EC]/40"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={NOTE_MAX_LENGTH}
          />
          <button
            type="button"
            disabled={busy || note === application.note}
            onClick={() => patch({ note }, "Notiz gespeichert.")}
            className="mt-2 rounded-[10px] bg-[#B718EC] px-4 py-2 text-sm font-medium text-white transition hover:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Notiz speichern
          </button>
        </Card>

        <section className="rounded-xl border border-red-200 bg-red-50/50 p-5">
          <h2 className="text-base font-semibold text-red-700">
            Endgültig löschen
          </h2>
          <p className="mt-1 text-sm text-[#556987]">
            Für Löschanfragen (DSGVO) oder nach Ablauf der Aufbewahrungsfrist:
            entfernt alle Angaben
            {file ? " und die hochgeladene Einverständniserklärung" : ""}{" "}
            unwiderruflich.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="mt-3 rounded-[10px] border border-red-500 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
          >
            Bewerbung löschen
          </button>
        </section>
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }

  const id = typeof ctx.params?.id === "string" ? ctx.params.id : "";
  const application = id ? await getApplication(id) : null;
  if (!application) return { notFound: true };

  return { props: { application } };
};

export default AdminApplicationDetail;
