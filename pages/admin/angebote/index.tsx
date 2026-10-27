import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import type { GetServerSideProps } from "next";
import AdminNav from "@/components/admin/AdminNav";
import { isAuthenticated } from "@/lib/adminAuth";
import { publicName } from "@/lib/creators/config";
import { listCreators } from "@/lib/creators/store";
import { CUSTOMER_MAX_LENGTH, TITLE_MAX_LENGTH, offerHeadline, offerPath } from "@/lib/offers/config";
import { listOffers } from "@/lib/offers/store";

interface OfferSummary {
  id: string;
  customer: string;
  headline: string;
  path: string;
  active: boolean;
  creatorNames: string[];
  views: number;
  requests: number;
  lastRequestAt: number;
}

interface Props {
  offers: OfferSummary[];
}

const SITE_URL = "https://www.swibble.net";

const inputClass =
  "w-full rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm text-[#2A3342] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B718EC]/40";
const smallButton =
  "rounded-md border border-[#F0E4F5] bg-white px-2.5 py-1 text-xs font-medium text-[#556987] transition hover:border-[#b718ec] hover:text-[#b718ec]";

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

const AdminOffers = ({ offers }: Props) => {
  const router = useRouter();
  const [customer, setCustomer] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, title }),
      });
      if (res.status === 401) return router.push("/admin/login");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Anlegen fehlgeschlagen.");
      router.push(`/admin/angebote/${data.offer.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
      setCreating(false);
    }
  };

  const copy = async (offer: OfferSummary) => {
    try {
      await navigator.clipboard.writeText(`${SITE_URL}${offer.path}`);
      setCopied(offer.id);
    } catch {
      setError("Kopieren ging nicht – bitte den Link im Angebot markieren und kopieren.");
    }
  };

  return (
    <>
      <Head>
        <title>Angebote – Swibble CMS</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className="mx-auto w-full max-w-5xl">
        <AdminNav current="Angebote" />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#000D36]">Web-Angebote</h1>
          <p className="mt-1 text-sm text-[#556987]">
            Creator mit Preisen für einen Kunden zusammenstellen und als Link verschicken. Der Kunde wählt einen
            oder mehrere aus und fragt direkt an – die Anfrage kommt per Mail.
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <form onSubmit={create} className="mb-8 flex flex-col gap-3 rounded-xl border border-[#F0E4F5] bg-white p-4">
          <h2 className="text-base font-semibold text-[#000D36]">Neues Angebot</h2>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="sr-only" htmlFor="offer-customer">
              Kunde
            </label>
            <input
              id="offer-customer"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              maxLength={CUSTOMER_MAX_LENGTH}
              placeholder="Kunde, z. B. Aquis Plaza"
              className={inputClass}
              required
            />
            <label className="sr-only" htmlFor="offer-title">
              Überschrift (optional)
            </label>
            <input
              id="offer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX_LENGTH}
              placeholder="Überschrift (optional)"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={creating || !customer.trim()}
              className="rounded-[10px] bg-[#B718EC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#a514d6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Wird angelegt …" : "Angebot anlegen"}
            </button>
          </div>
        </form>

        {offers.length === 0 ? (
          <p className="rounded-xl bg-[#FDF5FF] p-6 text-center text-sm text-[#556987]">Noch keine Angebote.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {offers.map((offer) => (
              <li key={offer.id} className="rounded-xl border border-[#F0E4F5] bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#000D36]">{offer.customer}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          offer.active ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {offer.active ? "Link aktiv" : "Link aus"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[#556987]">{offer.headline}</p>
                    <p className="mt-1 text-xs text-[#8a7791]">
                      {offer.creatorNames.length > 0
                        ? `${offer.creatorNames.length} Creator: ${offer.creatorNames.join(", ")}`
                        : "Noch keine Creator"}
                      {` · ${offer.views} Aufrufe · ${offer.requests} ${offer.requests === 1 ? "Anfrage" : "Anfragen"}`}
                      {offer.lastRequestAt > 0 && ` (zuletzt ${formatDate(offer.lastRequestAt)})`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => copy(offer)} className={smallButton}>
                      {copied === offer.id ? "Kopiert ✓" : "Link kopieren"}
                    </button>
                    <Link href={`/admin/angebote/${offer.id}`} className={smallButton}>
                      Bearbeiten
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async ({ req }) => {
  if (!isAuthenticated(req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  const [offers, creators] = await Promise.all([listOffers(), listCreators()]);
  const names = new Map(creators.map((c) => [c.id, publicName(c.name)]));
  return {
    props: {
      offers: offers.map((offer) => ({
        id: offer.id,
        customer: offer.customer,
        headline: offerHeadline(offer),
        path: offerPath(offer.token),
        active: offer.active,
        creatorNames: offer.items.map((item) => names.get(item.creatorId) ?? "(gelöscht)"),
        views: offer.views,
        requests: offer.requests.length,
        lastRequestAt: offer.requests.at(-1)?.at ?? 0,
      })),
    },
  };
};

export default AdminOffers;
