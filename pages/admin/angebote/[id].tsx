import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useState, type ReactNode } from "react";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import { roleLabel, type CreatorRole } from "@/lib/applications/config";
import { publicName, thumbUrl } from "@/lib/creators/config";
import { listCreators } from "@/lib/creators/store";
import {
  CUSTOMER_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  OFFER_ITEMS_MAX,
  PRICE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  offerHeadline,
  offerPath,
} from "@/lib/offers/config";
import { getOffer } from "@/lib/offers/store";
import type { CreatorOffer, OfferInput, OfferItem } from "@/lib/offers/types";

/** A creator that can be put into the offer. */
interface CreatorOption {
  id: string;
  name: string;
  /** Full name, for telling people apart in the CMS */
  fullName: string;
  published: boolean;
  roles: CreatorRole[];
  city: string;
  cover: string;
}

interface Props {
  initial: CreatorOffer;
  creators: CreatorOption[];
}

const SITE_URL = "https://www.swibble.net";

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

const formOf = (offer: CreatorOffer): OfferInput => ({
  customer: offer.customer,
  title: offer.title,
  message: offer.message,
  items: offer.items,
  active: offer.active,
});

const formatDateTime = (ms: number) =>
  new Date(ms).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

const AdminOfferEditor = ({ initial, creators }: Props) => {
  const router = useRouter();
  const [offer, setOffer] = useState(initial);
  const [form, setForm] = useState<OfferInput>(formOf(initial));
  const [saved, setSaved] = useState<OfferInput>(formOf(initial));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const base = `/api/admin/offers/${offer.id}`;
  const link = `${SITE_URL}${offerPath(offer.token)}`;
  const byId = new Map(creators.map((c) => [c.id, c]));
  const available = creators.filter((c) => !form.items.some((item) => item.creatorId === c.id));

  const unauthorized = useCallback(() => router.push("/admin/login"), [router]);

  const save = async (next: OfferInput = form) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(base, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.status === 401) return unauthorized();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Speichern fehlgeschlagen.");
      setOffer(data.offer);
      setForm(formOf(data.offer));
      setSaved(formOf(data.offer));
      setMessage("Gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = () => {
    if (dirty && !confirm("Ungespeicherte Änderungen werden mitgespeichert. Fortfahren?")) return;
    save({ ...form, active: !saved.active });
  };

  const set = <K extends keyof OfferInput>(key: K, value: OfferInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateItem = (index: number, patch: Partial<OfferItem>) =>
    set(
      "items",
      form.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  const moveItem = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= form.items.length) return;
    const next = [...form.items];
    [next[index], next[target]] = [next[target], next[index]];
    set("items", next);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Kopieren ging nicht – bitte den Link im Feld markieren und kopieren.");
    }
  };

  const remove = async () => {
    if (!confirm(`Angebot für ${offer.customer} löschen? Der Link funktioniert dann nicht mehr.`)) return;
    const res = await fetch(base, { method: "DELETE" });
    if (res.status === 401) return unauthorized();
    if (res.ok) router.push("/admin/angebote");
    else setError("Löschen fehlgeschlagen.");
  };

  const requests = [...offer.requests].reverse();

  return (
    <>
      <Head>
        <title>{`Angebot ${offer.customer} – Swibble CMS`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-28">
        <Link href="/admin/angebote" className="text-sm font-medium text-[#556987] hover:text-[#b718ec]">
          ← Alle Angebote
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-[#000D36]">{offer.customer}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              saved.active ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"
            }`}
          >
            {saved.active ? "Link aktiv" : "Link aus"}
          </span>
          <span className="text-xs text-[#8a7791]">
            {offer.views} Aufrufe{offer.lastViewedAt > 0 && ` · zuletzt ${formatDateTime(offer.lastViewedAt)}`}
          </span>
        </div>

        <section className="rounded-xl border border-[#F0E4F5] bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[#000D36]">Link für den Kunden</h2>
              <p className="mt-0.5 text-xs text-[#8a7791]">
                {saved.active
                  ? "Jeder mit diesem Link sieht das Angebot, ohne Anmeldung. Ausschalten nimmt es sofort offline – wieder einschalten macht denselben Link wieder gültig."
                  : "Ausgeschaltet: Der Link zeigt „Seite nicht gefunden“. Nur du siehst das Angebot, solange du angemeldet bist."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={saved.active}
              aria-label="Link ein- oder ausschalten"
              onClick={toggleActive}
              disabled={busy}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                saved.active ? "bg-[#B718EC]" : "bg-[#d8c7e0]"
              }`}
            >
              <span
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  saved.active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 sm:flex-nowrap">
            <input
              readOnly
              value={link}
              aria-label="Link zum Angebot"
              onFocus={(e) => e.target.select()}
              className={`${inputClass} min-w-0 flex-1`}
            />
            <button type="button" onClick={copyLink} className={outlineButton}>
              {copied ? "Kopiert ✓" : "Link kopieren"}
            </button>
            <Link href={offerPath(offer.token)} target="_blank" className={outlineButton}>
              Ansehen
            </Link>
          </div>
        </section>

        <div aria-live="polite">
          {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <Card title="Angebot" hint="So erscheint es oben auf der Seite des Kunden.">
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass} htmlFor="o-customer">
                Kunde*
              </label>
              <input
                id="o-customer"
                value={form.customer}
                onChange={(e) => set("customer", e.target.value)}
                maxLength={CUSTOMER_MAX_LENGTH}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="o-title">
                Überschrift
              </label>
              <input
                id="o-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={TITLE_MAX_LENGTH}
                placeholder={offerHeadline({ title: "", customer: form.customer || "…" })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="o-message">
                Text für den Kunden
              </label>
              <textarea
                id="o-message"
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                maxLength={MESSAGE_MAX_LENGTH}
                rows={4}
                placeholder="z. B. Hallo Frau Muster, hier unsere Vorschläge für die Oster-Kampagne. Die Preise gelten pro Drehtag inkl. Nutzungsrechten."
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        </Card>

        <Card
          title={`Creator & Preise (${form.items.length})`}
          hint="Reihenfolge wie auf der Seite. Preise netto – die Seite zeigt „Preis (netto)“ und „zzgl. MwSt.“. Freier Text, z. B. „450 € / Drehtag“; leer bleibt „Preis auf Anfrage“."
        >
          {form.items.length === 0 ? (
            <p className="rounded-lg bg-[#FDF5FF] p-4 text-sm text-[#556987]">Unten Creator hinzufügen.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {form.items.map((item, index) => {
                const creator = byId.get(item.creatorId);
                return (
                  <li key={item.creatorId} className="flex gap-3 rounded-lg border border-[#F0E4F5] p-3">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-[#FDF5FF]">
                      {creator?.cover && (
                        // eslint-disable-next-line @next/next/no-img-element -- private media route, admin only
                        <img src={creator.cover} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#000D36]">{creator?.fullName ?? "Creator gelöscht"}</p>
                        {creator && !creator.published && (
                          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                            Entwurf
                          </span>
                        )}
                        <span className="ml-auto flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem(index, -1)}
                            disabled={index === 0}
                            aria-label="Nach oben"
                            className={smallButton}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(index, 1)}
                            disabled={index === form.items.length - 1}
                            aria-label="Nach unten"
                            className={smallButton}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              set(
                                "items",
                                form.items.filter((_, i) => i !== index),
                              )
                            }
                            aria-label="Aus dem Angebot entfernen"
                            className={smallButton}
                          >
                            ✕
                          </button>
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={item.price}
                          onChange={(e) => updateItem(index, { price: e.target.value })}
                          maxLength={PRICE_MAX_LENGTH}
                          placeholder="Preis netto, z. B. 450 € / Drehtag"
                          aria-label={`Preis für ${creator?.name ?? "Creator"}`}
                          className={inputClass}
                        />
                        <input
                          value={item.note}
                          onChange={(e) => updateItem(index, { note: e.target.value })}
                          maxLength={NOTE_MAX_LENGTH}
                          placeholder="Notiz (optional), z. B. inkl. 2 Reels"
                          aria-label={`Notiz für ${creator?.name ?? "Creator"}`}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {available.length > 0 && form.items.length < OFFER_ITEMS_MAX && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-[#2A3342]">Creator hinzufügen</p>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {available.map((creator) => (
                  <li key={creator.id}>
                    <button
                      type="button"
                      onClick={() => set("items", [...form.items, { creatorId: creator.id, price: "", note: "" }])}
                      className="group w-full overflow-hidden rounded-lg border border-[#F0E4F5] bg-white text-left transition hover:border-[#B718EC]"
                    >
                      <div className="relative aspect-[4/5] bg-[#FDF5FF]">
                        {creator.cover && (
                          // eslint-disable-next-line @next/next/no-img-element -- private media route, admin only
                          <img src={creator.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                        {!creator.published && (
                          <span className="absolute left-1 top-1 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                            Entwurf
                          </span>
                        )}
                      </div>
                      <p className="truncate px-2 pt-1.5 text-xs font-semibold text-[#000D36]">+ {creator.name}</p>
                      <p className="truncate px-2 pb-1.5 text-[11px] text-[#8a7791]">
                        {creator.roles.map((id) => roleLabel(id, "creator")).join(", ")}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card
          title={`Anfragen (${offer.requests.length})`}
          hint="Wen der Kunde ausgewählt hat. Kontaktdaten und Nachricht kommen per Mail an info@swibble.net."
        >
          {requests.length === 0 ? (
            <p className="text-sm text-[#556987]">Noch keine Anfrage über dieses Angebot.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {requests.map((request) => (
                <li key={request.at} className="rounded-lg bg-[#FDF5FF] px-3 py-2">
                  <span className="text-[#8a7791]">{formatDateTime(request.at)}</span>
                  {" · "}
                  <span className="font-medium text-[#000D36]">
                    {request.creatorIds.map((id) => byId.get(id)?.name ?? "(gelöscht)").join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div>
          <button type="button" onClick={remove} className="text-sm font-medium text-red-600 hover:underline">
            Angebot löschen
          </button>
        </div>
      </section>

      {/* Save bar: always in reach while editing prices. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#F0E4F5] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="text-sm text-[#556987]">{dirty ? "Ungespeicherte Änderungen" : "Alles gespeichert"}</p>
          <button type="button" onClick={() => save()} disabled={busy || !dirty} className={primaryButton}>
            {busy ? "Speichert …" : "Speichern"}
          </button>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  const id = typeof ctx.params?.id === "string" ? ctx.params.id : "";
  const offer = id ? await getOffer(id) : null;
  if (!offer) return { notFound: true };
  const creators = (await listCreators()).map((c) => {
    const first = c.photos.find((p) => !p.hidden);
    return {
      id: c.id,
      name: publicName(c.name),
      fullName: c.name,
      published: c.published,
      roles: c.roles,
      city: c.city,
      cover: first ? thumbUrl(c.id, first.id) : "",
    };
  });
  return { props: { initial: offer, creators } };
};

export default AdminOfferEditor;
