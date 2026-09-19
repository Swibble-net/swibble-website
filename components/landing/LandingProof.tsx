import Image from "next/image";
import Link from "next/link";
import ListOfCompanies from "@/components/ListOfCompanies";
import { companyLogos } from "@/lib/companiesLogos";
import { LANDING_IMAGES } from "@/components/landing/images";
import type {
  LandingCaseStudy,
  LandingFacts,
  LandingPageContent,
  LandingReference,
} from "@/lib/landing/types";

const CARD_SIZES =
  "(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) 45vw, 25vw";

const cardClass =
  "group flex h-full flex-col overflow-hidden rounded-2xl border border-[#F0E4F5] bg-white shadow-sm";

const CaseStudyCard = ({ study }: { study: LandingCaseStudy }) => {
  const isCaseStudy = study.slug.startsWith("case-study");

  return (
    <Link
      href={`/blog/${study.slug}`}
      className={`${cardClass} transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] motion-reduce:transform-none motion-reduce:transition-none`}
    >
      <span className="relative block aspect-[16/10] w-full bg-[#f3e8f7]">
        <Image
          src={study.coverImage ?? LANDING_IMAGES[study.fallbackImage]}
          alt={study.coverImageAlt}
          fill
          sizes={CARD_SIZES}
          className={`object-cover ${study.coverImage ? "" : "object-[50%_30%]"}`}
        />
      </span>
      <span className="flex flex-1 flex-col p-5">
        <span className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-[#8A1FD6]">
          {isCaseStudy
            ? "Case Study"
            : study.slug.startsWith("live-event")
              ? "Live-Event"
              : "Aus dem Blog"}
        </span>
        <h3 className="mb-2 text-lg font-bold text-[#000D36] transition group-hover:text-[#B718EC]">
          {study.title.replace(/^Case Study:\s*/i, "")}
        </h3>
        <span className="mb-4 text-sm leading-relaxed text-[#556987]">
          {study.excerpt}
        </span>
        <span className="mt-auto text-sm font-medium text-[#A214D3] group-hover:underline">
          {isCaseStudy ? "Case Study lesen" : "Artikel lesen"} →
        </span>
      </span>
    </Link>
  );
};

const ReferenceCard = ({
  reference,
  wide,
}: {
  reference: LandingReference;
  /** Matches the case-study cards when both share a grid. */
  wide: boolean;
}) => (
  <div className={cardClass}>
    <div
      className={`relative w-full bg-[#f3e8f7] ${wide ? "aspect-[16/10]" : "aspect-[4/5]"}`}
    >
      <Image
        src={LANDING_IMAGES[reference.image]}
        alt={reference.imageAlt}
        fill
        sizes={CARD_SIZES}
        className={`object-cover ${wide ? "object-[50%_30%]" : ""}`}
      />
    </div>
    <div className="flex flex-1 flex-col p-4 lg:p-5">
      <span className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-[#8A1FD6]">
        {reference.kicker}
      </span>
      <h3 className="text-base font-bold text-[#000D36] lg:text-lg">
        {reference.title}
      </h3>
      {reference.text && (
        <p className="mt-2 text-sm leading-relaxed text-[#556987]">
          {reference.text}
        </p>
      )}
      {reference.note && (
        <p className="mt-auto pt-4 text-sm font-medium text-[#556987]">
          {reference.note}
        </p>
      )}
    </div>
  </div>
);

interface Props {
  proof: LandingPageContent["proof"];
  caseStudies: LandingCaseStudy[];
  facts: LandingFacts | null;
}

const LandingProof = ({ proof, caseStudies, facts }: Props) => {
  const references = proof.references ?? [];
  const mixed = caseStudies.length > 0;
  const total = caseStudies.length + references.length;
  // Keeps the order given in the content file (clients with the most followers first).
  const logos = (proof.logos ?? []).flatMap((alt) =>
    companyLogos.filter((logo) => logo.alt === alt),
  );
  const factCols = facts?.items.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";

  const gridClass = mixed
    ? total === 4
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    : "grid-cols-2 lg:grid-cols-4";

  return (
    <section
      aria-labelledby="referenzen"
      className={`w-full pt-10 lg:pt-16 ${logos.length > 0 ? "pb-10 lg:pb-16" : ""}`}
    >
      <div className="mb-8 max-w-3xl">
        <h2
          id="referenzen"
          className="text-2xl font-bold text-[#000D36] lg:text-4xl"
        >
          {proof.title}
        </h2>
        <p className="mt-3 text-base leading-7 text-[#556987] lg:text-lg">
          {proof.text}
        </p>
      </div>

      <ul className={`grid gap-4 lg:gap-6 ${gridClass}`}>
        {caseStudies.map((study) => (
          <li key={study.slug}>
            <CaseStudyCard study={study} />
          </li>
        ))}
        {references.map((reference) => (
          <li key={reference.title}>
            <ReferenceCard reference={reference} wide={mixed} />
          </li>
        ))}
      </ul>

      {facts && (
        <>
          <dl className={`mt-8 grid grid-cols-1 gap-4 lg:gap-6 ${factCols}`}>
            {facts.items.map(({ value, label, start }) => (
              <div
                key={label}
                className="flex flex-col-reverse rounded-2xl bg-[#FDF5FF] p-5 text-center"
              >
                <dt className="mt-1 text-sm text-[#556987]">
                  {label}
                  <span className="mt-1 block text-xs text-[#6B6B6B]">
                    Gestartet bei {start}
                  </span>
                </dt>
                <dd className="text-3xl font-bold text-[#8A1FD6] lg:text-4xl">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-[#6B6B6B]">
            Öffentliche TikTok-Profile, Stand {facts.date} – wird täglich aktualisiert.
          </p>
        </>
      )}

      {proof.quote && (
        <figure className="relative mt-8 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#2A0B5E_0%,#8A1FD6_55%,#5F3BC4_100%)] p-7 text-white shadow-[0_25px_80px_rgba(95,59,196,0.35)] sm:p-10 lg:p-14">
          <span
            aria-hidden
            className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#FF8AD8]/30 blur-3xl"
          />
          <span
            aria-hidden
            className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-[#3BC4A3]/20 blur-3xl"
          />
          <svg
            aria-hidden
            viewBox="0 0 48 36"
            className="relative mb-5 h-9 w-12 fill-white/25 lg:h-12 lg:w-16"
          >
            <path d="M0 36V22.4C0 9.6 6.8 2 19.2 0l2 5.2C14.8 7 11.6 10.8 11.2 16H20v20H0zm27 0V22.4C27 9.6 33.8 2 46.2 0l1.8 5.2C41.8 7 38.6 10.8 38.2 16H47v20H27z" />
          </svg>
          <blockquote className="relative max-w-4xl text-xl font-medium leading-snug sm:text-2xl lg:text-[2rem] lg:leading-tight">
            {proof.quote.text}
          </blockquote>
          <figcaption className="relative mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <span className="flex items-center gap-4">
              <span
                aria-hidden
                className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white/15 text-base font-bold ring-1 ring-white/30"
              >
                {proof.quote.author
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
              <span className="flex flex-col">
                <cite className="text-base font-bold not-italic">
                  {proof.quote.author}
                </cite>
                <span className="text-sm text-[#E9D5FF]">{proof.quote.role}</span>
              </span>
            </span>
            <Link
              href={proof.quote.href}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#5B12A8] transition duration-200 hover:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none motion-reduce:transition-none sm:ml-auto"
            >
              Case Study lesen →
            </Link>
          </figcaption>
        </figure>
      )}

      {logos.length === 0 && <ListOfCompanies compact />}

      {logos.length > 0 && (
        <div className="mt-10">
          <p className="text-center text-sm text-[#707070]">
            Diese Unternehmen vertrauen Swibble bereits
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {logos.map((logo) => (
              <li key={logo.alt}>
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={184}
                  height={64}
                  sizes="152px"
                  className="h-10 w-28 object-contain lg:h-12 lg:w-36"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default LandingProof;
