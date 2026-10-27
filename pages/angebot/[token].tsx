import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { IoArrowForward, IoCheckmark, IoClose } from "react-icons/io5";
import SEO from "@/components/SEO";
import CreatorWork from "@/components/creators/CreatorWork";
import InquiryForm from "@/components/creators/InquiryForm";
import { isAuthenticated } from "@/lib/adminAuth";
import { roleLabel } from "@/lib/applications/config";
import { factList } from "@/lib/applications/profileFacts";
import { toPublicCreator, withMediaKey } from "@/lib/creators/config";
import { getCreator } from "@/lib/creators/store";
import type { PublicCreator } from "@/lib/creators/types";
import { NET_PRICES_NOTE, OFFER_PARAM, PRICE_ON_REQUEST, offerHeadline } from "@/lib/offers/config";
import { countOfferView, getOfferByToken } from "@/lib/offers/store";
import { isPreviewAgent } from "@/lib/pitchdecks/config";

interface OfferEntry {
  creator: PublicCreator;
  price: string;
  note: string;
}

interface Props {
  token: string;
  customer: string;
  headline: string;
  message: string;
  /** Switched off in the CMS: only the signed-in admin still sees the page */
  active: boolean;
  entries: OfferEntry[];
}

const OfferCreator = ({
  entry,
  selected,
  onToggle,
}: {
  entry: OfferEntry;
  selected: boolean;
  onToggle: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const { creator } = entry;
  const cover = creator.photos[0];
  const facts = factList(creator);
  const more = creator.photos.length - 1 + creator.videos.length;

  return (
    <li
      className={`overflow-hidden rounded-3xl bg-white shadow-[0_25px_100px_rgba(76,64,247,0.08)] transition ${
        selected ? "ring-2 ring-[#B718EC]" : "ring-1 ring-[#F6ECFA]"
      }`}
    >
      <div className="grid gap-5 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8 sm:p-6">
        <div className="overflow-hidden rounded-2xl bg-[#FDF5FF]">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element -- media route of the creator page
            <img src={cover.url} alt={creator.name} className="aspect-[4/5] w-full object-cover" />
          )}
        </div>

        <div className="flex flex-col">
          <h2 className="text-3xl font-bold text-[#000D36]">{creator.name}</h2>
          <p className="mt-1 text-[#556987]">
            {creator.roles.map((id) => roleLabel(id, "creator")).join(" · ")}
            {creator.city && ` · ${creator.city}`}
          </p>
          {creator.tagline && <p className="mt-3 text-[#2A3342]">{creator.tagline}</p>}

          {facts.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-2">
              {facts.map((fact) => (
                <div key={fact.label} className="rounded-2xl bg-[#FDF5FF] px-4 py-2.5 ring-1 ring-[#F0E6F4]">
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#8a7791]">{fact.label}</dt>
                  <dd className="mt-0.5 font-semibold text-[#000D36]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {creator.references.length > 0 && (
            <p className="mt-4 text-sm text-[#556987]">
              <span className="font-semibold text-[#000D36]">Referenzen: </span>
              {creator.references.map((ref) => ref.name).join(", ")}
            </p>
          )}

          <div className="mt-5 rounded-2xl bg-[#000D36] px-5 py-4 text-white">
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">Preis (netto)</p>
            <p className="mt-0.5 text-2xl font-bold">{entry.price || PRICE_ON_REQUEST}</p>
            {entry.note && <p className="mt-1 text-sm text-white/80">{entry.note}</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={selected}
              onClick={onToggle}
              className={`inline-flex min-h-12 items-center gap-2 rounded-2xl px-6 font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] ${
                selected
                  ? "bg-[#B718EC] text-white shadow-lg shadow-purple-200 hover:bg-[#a514d6]"
                  : "border-2 border-[#B718EC] bg-white text-[#B718EC] hover:bg-[#FDF5FF]"
              }`}
            >
              {selected ? (
                <>
                  <IoCheckmark aria-hidden className="text-xl" /> Ausgewählt
                </>
              ) : (
                `${creator.name} auswählen`
              )}
            </button>
            {more > 0 && (
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className="inline-flex min-h-12 items-center rounded-2xl border border-[#E4D3EC] bg-white px-5 font-medium text-[#000D36] hover:border-[#B718EC]"
              >
                {open ? "Weniger anzeigen" : `Fotos & Videos (${more})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#F6ECFA] p-4 sm:p-6">
          <CreatorWork photos={creator.photos.slice(1)} videos={creator.videos} name={creator.name} />
        </div>
      )}
    </li>
  );
};

const OfferPage = ({ token, customer, headline, message, active, entries }: Props) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [formInView, setFormInView] = useState(false);
  const chosen = entries.filter((entry) => selected.includes(entry.creator.id));

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  // The bar at the bottom leads to the form; once the form is on screen it steps aside.
  useEffect(() => {
    const form = document.getElementById("anfrage");
    if (!form) return;
    const observer = new IntersectionObserver(([item]) => setFormInView(item.isIntersecting), {
      threshold: 0.1,
    });
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <SEO
        title={`${headline} – Swibble`}
        description={`Creator-Vorschläge von Swibble für ${customer}.`}
        ogImage={entries[0]?.creator.photos[0] ? `https://www.swibble.net${entries[0].creator.photos[0].url}` : undefined}
        noIndex
      />

      <article className="mx-auto w-full max-w-5xl pb-24">
        {!active && (
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-800">
            Dieses Angebot ist ausgeschaltet – nur du siehst es, weil du angemeldet bist.
          </p>
        )}

        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-[#B718EC]">
            Swibble Creator · Angebot für {customer}
          </p>
          <h1 className="mt-2 text-4xl font-bold text-[#000D36] lg:text-5xl">{headline}</h1>
          {message && <p className="mt-4 max-w-3xl whitespace-pre-line text-lg text-[#556987]">{message}</p>}
          <p className="mt-4 text-sm text-[#8a7791]">
            Wähle einen oder mehrere Creator aus und schick uns unten deine Anfrage – unverbindlich.{" "}
            {NET_PRICES_NOTE}
          </p>
        </header>

        {entries.length === 0 ? (
          <p className="mt-10 rounded-2xl bg-[#FDF5FF] p-6 text-center text-[#556987]">
            Hier kommen gleich die Vorschläge – schau bitte etwas später noch einmal vorbei.
          </p>
        ) : (
          <ol className="mt-8 flex flex-col gap-6">
            {entries.map((entry) => (
              <OfferCreator
                key={entry.creator.id}
                entry={entry}
                selected={selected.includes(entry.creator.id)}
                onToggle={() => toggle(entry.creator.id)}
              />
            ))}
          </ol>
        )}

        {entries.length > 0 && (
          <section
            id="anfrage"
            className="mt-14 scroll-mt-28 rounded-3xl bg-white p-5 shadow-[0_25px_100px_rgba(76,64,247,0.08)] ring-1 ring-[#F6ECFA] sm:p-8"
          >
            <h2 className="text-xl font-bold text-[#000D36] lg:text-2xl">Deine Auswahl anfragen</h2>
            {chosen.length === 0 ? (
              <p className="mt-3 text-sm text-[#556987]">
                Noch kein Creator ausgewählt – tippe oben auf „auswählen“.
              </p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {chosen.map((entry) => (
                  <li
                    key={entry.creator.id}
                    className="flex items-center gap-2 rounded-full bg-[#FDF5FF] py-1.5 pl-4 pr-1.5 text-sm ring-1 ring-[#F0E6F4]"
                  >
                    <span className="font-semibold text-[#000D36]">{entry.creator.name}</span>
                    <span className="text-[#556987]">{entry.price || PRICE_ON_REQUEST}</span>
                    <button
                      type="button"
                      onClick={() => toggle(entry.creator.id)}
                      aria-label={`${entry.creator.name} abwählen`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#8a7791] hover:bg-white hover:text-[#B718EC]"
                    >
                      <IoClose aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5">
              <InquiryForm
                endpoint={`/api/offers/${encodeURIComponent(token)}/inquiry`}
                extra={{ creatorIds: selected }}
                check={() => (selected.length > 0 ? "" : "Bitte wähle oben mindestens einen Creator aus.")}
                messageOptional
              />
            </div>
          </section>
        )}
      </article>

      {chosen.length > 0 && !formInView && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#F0E4F5] bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-sm text-[#000D36]">
              <span className="font-bold">{chosen.length}</span> Creator ausgewählt
              <span className="hidden text-[#556987] sm:inline">
                {" "}
                · {chosen.map((entry) => entry.creator.name).join(", ")}
              </span>
            </p>
            <a
              href="#anfrage"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#B718EC] px-5 font-bold text-white hover:bg-[#a514d6]"
            >
              Weiter zur Anfrage <IoArrowForward aria-hidden />
            </a>
          </div>
        </div>
      )}
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, req, res }) => {
  const token = typeof params?.token === "string" ? params.token : "";
  const offer = await getOfferByToken(token).catch(() => null);
  const admin = isAuthenticated(req);
  if (!offer || (!offer.active && !admin)) return { notFound: true };

  const profiles = await Promise.all(offer.items.map((item) => getCreator(item.creatorId).catch(() => null)));
  const entries = offer.items.flatMap((item, index) => {
    const profile = profiles[index];
    if (!profile) return [];
    const creator = toPublicCreator(profile);
    // Drafts are part of the offer too: their media load with the offer's key.
    return [
      {
        creator: profile.published ? creator : withMediaKey(creator, OFFER_PARAM, offer.token),
        price: item.price,
        note: item.note,
      },
    ];
  });

  if (!admin && !isPreviewAgent(req.headers["user-agent"])) {
    await countOfferView(offer.id).catch(() => undefined);
  }
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  return {
    props: {
      token: offer.token,
      customer: offer.customer,
      headline: offerHeadline(offer),
      message: offer.message,
      active: offer.active,
      entries,
    },
  };
};

export default OfferPage;
