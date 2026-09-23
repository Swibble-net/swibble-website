import CtaLink from "@/components/CtaLink";
import Image from "next/image";
import Link from "next/link";
import GermanyMap from "@/public/map_germany.webp";
import { CTA_LABEL } from "@/lib/cta";

interface Location {
  city: string;
  client: string;
  color: string;
  href?: string;
}

// Colors are the clients' brand colors.
const LOCATIONS: Location[] = [
  {
    city: "Aachen",
    client: "Aquis Plaza",
    color: "#2F3192",
    href: "/blog/case-study-aquis-plaza-aachen",
  },
  {
    city: "München",
    client: "Olympia Einkaufszentrum",
    color: "#E2000F",
    href: "/blog/case-study-olympia-einkaufszentrum-munchen",
  },
  {
    city: "Hamburg",
    client: "Billstedt Center",
    color: "#F47807",
    href: "/blog/case-study-billstedt-center-hamburg",
  },
  { city: "Frankfurt", client: "MyZeil", color: "#111111" },
];

const cardClass =
  "group relative flex h-full flex-col gap-1 overflow-hidden rounded-[10px] bg-white py-4 pl-5 pr-4 shadow-[0_25px_100px_rgba(76,64,247,0.08)]";

// Text lives outside the anchor (a stretched link keeps the whole card clickable),
// so reader modes and screen readers get real headings instead of one long link.
const LocationCard = ({ city, client, color, href }: Location) => (
  <div
    className={`${cardClass} ${href ? "transition duration-200 hover:-translate-y-1" : ""}`}
  >
    <span
      className="absolute inset-y-0 left-0 w-1"
      style={{ backgroundColor: color }}
      aria-hidden
    />
    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em] text-[#556987]">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {city}
    </p>
    <h3 className="text-base font-bold text-[#000D36]">{client}</h3>
    {href && (
      <Link
        href={href}
        aria-label={`Case Study lesen: ${client}`}
        className="mt-1 w-fit text-sm text-[#B718EC] transition-transform duration-200 after:absolute after:inset-0 group-hover:translate-x-1"
      >
        Case Study lesen →
      </Link>
    )}
  </div>
);

const Nationwide = () => {
  return (
    <section
      id="bundesweit"
      className="scroll-mt-28 lg:scroll-mt-32 w-full py-12 lg:pt-12 lg:pb-24 flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16"
    >
      <div className="flex w-full flex-col gap-5 lg:w-5/12">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#B718EC]">
          Wo du uns brauchst
        </p>
        <h2 className="text-2xl font-bold text-[#000D36] lg:text-5xl lg:leading-[1.2]">
          Bundesweit im Einsatz
        </h2>
        <p className="text-base font-normal leading-7 text-[#000D36] lg:text-[#6B6B6B]">
          Von Hamburg bis München: Wir sind dort, wo dein Content entsteht – und
          betreuen Social Media, Live-Events und Software für Kunden in ganz
          Deutschland.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {LOCATIONS.map((location) => (
            <li key={location.city}>
              <LocationCard {...location} />
            </li>
          ))}
        </ul>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-[#556987]">
          <span>Deine Stadt fehlt noch auf der Karte?</span>
          <CtaLink
            className="inline-block rounded-2xl bg-[#B718EC] px-5 py-3 text-center font-medium text-[#F0FDF4] transition duration-200 hover:scale-95"
          >
            {CTA_LABEL}
          </CtaLink>
        </p>
      </div>
      <div className="relative w-full lg:w-7/12">
        <div
          className="absolute left-1/2 top-1/2 -z-10 h-[85%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FDF5FF] blur-2xl"
          aria-hidden
        />
        <Image
          src={GermanyMap}
          alt="Deutschlandkarte mit Swibble-Kunden: Billstedt Center in Hamburg, Aquis Plaza in Aachen, MyZeil in Frankfurt und Olympia Einkaufszentrum in München"
          width={1600}
          height={932}
          loading="lazy"
          sizes="(max-width: 1024px) calc(100vw - 2rem), 55vw"
          className="h-auto w-full"
        />
      </div>
    </section>
  );
};

export default Nationwide;
