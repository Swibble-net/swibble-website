import { useRef, type CSSProperties } from "react";
import Link from "next/link";
import { LuLightbulb, LuPhoneCall, LuRocket } from "react-icons/lu";
import SEO from "@/components/SEO";
import ContactForm from "@/components/ContactForm";
import LandingProof from "@/components/landing/LandingProof";
import LandingFaq from "@/components/landing/LandingFaq";
import LandingVisual from "@/components/landing/LandingVisual";
import { LANDING_ICONS } from "@/components/landing/icons";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import styles from "@/styles/landing.module.scss";
import { CTA_LABEL, CTA_URL } from "@/lib/cta";
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from "@/lib/jsonLd";
import { LANDING_LINKS, landingPath } from "@/lib/landing/links";
import type {
  LandingCaseStudy,
  LandingFacts,
  LandingPageContent,
} from "@/lib/landing/types";

const primaryButtonClass =
  "w-fit text-center text-base font-medium bg-[#B718EC] text-[#F0FDF4] py-3 px-6 rounded-2xl hover:scale-95 transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] motion-reduce:transform-none motion-reduce:transition-none";

const h2Class = "text-2xl font-bold text-[#000D36] lg:text-4xl";

const depth = (value: number) => ({ "--depth": value }) as CSSProperties;

const Hero = ({ page }: { page: LandingPageContent }) => {
  // The map is wide and carries small labels, so it gets the larger half.
  const wideVisual = page.hero.visual === "map";

  return (
    <section className="relative w-full flex flex-col justify-between gap-10 py-6 mb-24 lg:flex-row lg:items-center lg:gap-10 lg:mb-28 lg:py-16 xl:gap-16">
      <div
        aria-hidden
        className="bg-[#FDF5FF] absolute top-0 bottom-0 right-0 left-0 -z-10 w-screen -mt-20 -mx-4 lg:-mx-20"
      ></div>
      <div className={`flex flex-col gap-5 ${wideVisual ? "lg:w-[46%]" : "lg:w-[56%]"}`}>
        <nav aria-label="Brotkrumen" className="text-sm text-[#556987]">
          <ol className="flex flex-wrap items-center gap-x-2">
            <li>
              <Link href="/" className="hover:text-[#B718EC] transition-colors">
                Startseite
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-[#000D36]">
              {page.service.name}
            </li>
          </ol>
        </nav>
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#8A1FD6]">
          {page.hero.kicker}
        </p>
        <h1 className="text-[#000D36] font-bold text-[1.75rem] leading-tight break-words lg:text-[2.75rem] lg:leading-[1.15] 2xl:text-[3.25rem]">
          {page.hero.title}
        </h1>
        <p className="max-w-[44rem] text-[#000D36] text-base font-normal leading-7 lg:text-lg lg:leading-8">
          {page.hero.text}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <a href={CTA_URL} className={primaryButtonClass}>
            {CTA_LABEL}
          </a>
          <a
            href="#kontakt"
            className="py-2 text-base font-medium text-[#A214D3] underline underline-offset-4 hover:no-underline"
          >
            Oder schreib uns eine Nachricht
          </a>
        </div>
      </div>
      <div
        className={`w-full flex justify-center lg:justify-end ${wideVisual ? "lg:w-[54%]" : "lg:w-[44%]"}`}
      >
        <LandingVisual visual={page.hero.visual} alt={page.hero.visualAlt} />
      </div>
      <div
        aria-hidden
        className="absolute -bottom-12 left-0 overflow-hidden leading-[0] -mx-4 lg:-mx-20 lg:-bottom-20 w-screen"
      >
        <svg
          className="relative block rotate-180 w-[137%] h-12 lg:h-20"
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            className="fill-[#FDF5FF]"
          ></path>
        </svg>
      </div>
    </section>
  );
};

// Accent colours of the four service cards on the home page.
const ACCENTS = ["#B718EC", "#3ABD9E", "#C43B7D", "#5F3BC4"] as const;
// Parallax depth per card: alternating near/far like the home page cards.
const CARD_DEPTHS = [9, -5, 7, -6, 10, -4] as const;

const Services = ({ services }: { services: LandingPageContent["services"] }) => {
  const ref = useRef<HTMLDivElement>(null);
  usePointerParallax(ref);

  return (
    <section
      ref={ref}
      aria-labelledby="leistungen"
      className={`relative w-full py-10 lg:py-16 ${styles.parallax}`}
    >
      {/* Soft colour fields that drift behind the cards */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <span
          className={`absolute -left-10 top-10 h-64 w-64 rounded-full bg-[#B718EC]/10 blur-3xl ${styles.float}`}
          style={depth(-24)}
        />
        <span
          className={`absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#3ABD9E]/10 blur-3xl ${styles.float}`}
          style={depth(-16)}
        />
      </div>
      <div className="mx-auto mb-10 max-w-3xl text-center lg:mb-14">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.12em] text-[#8A1FD6]">
          Leistungsumfang
        </p>
        <h2 id="leistungen" className={h2Class}>
          {services.title}
        </h2>
        <p className="mt-3 text-base leading-7 text-[#556987] lg:text-lg">
          {services.intro}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {services.items.map(({ title, text, icon }, index) => {
          const Icon = LANDING_ICONS[icon];
          const accent = ACCENTS[index % ACCENTS.length];
          return (
            <li
              key={title}
              className={styles.float}
              style={depth(CARD_DEPTHS[index % CARD_DEPTHS.length])}
            >
              <div className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-[#F0E4F5] bg-white p-6 shadow-[0_25px_100px_rgba(76,64,247,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(76,64,247,0.18)] motion-reduce:transform-none motion-reduce:transition-none">
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 motion-reduce:transition-none"
                  style={{ backgroundColor: accent }}
                />
                <span
                  aria-hidden
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${accent}1A`, color: accent }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#000D36]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#556987]">{text}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const STEP_ICONS = [LuPhoneCall, LuLightbulb, LuRocket] as const;

/** Arrow between two steps: points right on desktop, down on mobile. */
const connectorProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const StepConnector = () => (
  <li
    aria-hidden
    className="flex items-center justify-center py-2 text-[#B718EC] lg:w-16 lg:flex-none lg:items-start lg:px-1 lg:pb-0 lg:pt-10 xl:w-24"
  >
    <svg viewBox="0 0 24 56" className="h-14 w-6 lg:hidden" {...connectorProps}>
      <path className={styles.connector} d="M12 2v46" />
      <path d="M5 42l7 8 7-8" />
    </svg>
    <svg viewBox="0 0 96 24" className="hidden h-6 w-full lg:block" {...connectorProps}>
      <path className={styles.connector} d="M2 12h84" />
      <path d="M80 5l8 7-8 7" />
    </svg>
  </li>
);

const Process = ({ process }: { process: LandingPageContent["process"] }) => (
  <section aria-labelledby="ablauf" className="relative mt-10 w-full py-12 lg:mt-20 lg:py-20">
    <div
      aria-hidden
      className="bg-[#FDF5FF] absolute top-0 bottom-0 right-0 left-0 -z-10 w-screen -mx-4 lg:-mx-20"
    ></div>
    <div className="mx-auto mb-10 max-w-3xl text-center lg:mb-14">
      <p className="mb-3 text-sm font-medium uppercase tracking-[0.12em] text-[#8A1FD6]">
        Ablauf
      </p>
      <h2 id="ablauf" className={h2Class}>
        {process.title}
      </h2>
      <p className="mt-3 text-base leading-7 text-[#556987] lg:text-lg">
        {process.intro}
      </p>
    </div>
    <ol className="flex flex-col lg:flex-row lg:items-stretch">
      {process.steps.flatMap(({ title, text }, index) => {
        const Icon = STEP_ICONS[index];
        const step = (
          <li
            key={title}
            className="relative flex flex-1 flex-col gap-3 rounded-2xl bg-white p-6 pt-8 shadow-[0_25px_100px_rgba(76,64,247,0.1)] lg:p-8"
          >
            <span
              aria-hidden
              className="absolute right-5 top-3 text-6xl font-bold leading-none text-[#F3E3FB]"
            >
              {index + 1}
            </span>
            <span
              aria-hidden
              className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#B718EC,#5F3BC4)] text-white shadow-[0_12px_30px_rgba(183,24,236,0.35)]"
            >
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="relative text-xl font-bold text-[#000D36]">
              <span className="sr-only">Schritt {index + 1}: </span>
              {title}
            </h3>
            <p className="relative text-sm leading-6 text-[#556987] lg:text-base lg:leading-7">
              {text}
            </p>
          </li>
        );
        return index === 0
          ? [step]
          : [<StepConnector key={`connector-${index}`} />, step];
      })}
    </ol>
    <p className="mt-10 text-center">
      <a href={CTA_URL} className={`inline-block ${primaryButtonClass}`}>
        Mit Schritt 1 starten: {CTA_LABEL}
      </a>
    </p>
  </section>
);

const Closing = ({ page }: { page: LandingPageContent }) => {
  const otherPages = LANDING_LINKS.filter(({ slug }) => slug !== page.slug);

  return (
    <section aria-labelledby="abschluss" className="w-full py-10 lg:py-16">
      <div className="flex flex-col items-start gap-5 rounded-3xl bg-[#000D36] p-6 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:p-14">
        <div className="max-w-2xl">
          <h2 id="abschluss" className="text-2xl font-bold lg:text-4xl">
            {page.closing.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-[#D5DAE1] lg:text-lg">
            {page.closing.text}
          </p>
        </div>
        <div className="flex flex-none flex-col items-start gap-3 lg:items-center">
          <a
            href={CTA_URL}
            className={`${primaryButtonClass} focus-visible:outline-white`}
          >
            {CTA_LABEL}
          </a>
          <a
            href="#kontakt"
            className="text-sm font-medium text-[#E7A1FF] underline underline-offset-4 hover:no-underline"
          >
            Zum Kontaktformular
          </a>
        </div>
      </div>

      <nav aria-labelledby="weitere-leistungen" className="mt-10">
        <h2
          id="weitere-leistungen"
          className="text-sm font-medium uppercase tracking-[0.12em] text-[#556987]"
        >
          Weitere Leistungen von Swibble
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {otherPages.map(({ slug, label }) => (
            <li key={slug}>
              <Link
                href={landingPath(slug)}
                className="inline-block rounded-full border border-[#E3C8EE] bg-white px-4 py-2 text-sm font-medium text-[#000D36] transition-colors hover:border-[#B718EC] hover:text-[#A214D3]"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
};

interface Props {
  page: LandingPageContent;
  caseStudies: LandingCaseStudy[];
  facts: LandingFacts | null;
}

const LandingPage = ({ page, caseStudies, facts }: Props) => {
  const path = landingPath(page.slug);

  return (
    <>
      <SEO
        title={page.seo.title}
        description={page.seo.description}
        canonical={path}
        jsonLd={[
          serviceJsonLd({ ...page.service, path }),
          breadcrumbJsonLd([
            { name: "Startseite", path: "/" },
            { name: page.service.name, path },
          ]),
          faqJsonLd(page.faq),
        ]}
      />
      <article>
        <Hero page={page} />
        <LandingProof proof={page.proof} caseStudies={caseStudies} facts={facts} />
        <Services services={page.services} />
        <Process process={page.process} />
        <LandingFaq faq={page.faq} />
        <Closing page={page} />
      </article>
      <ContactForm />
    </>
  );
};

export default LandingPage;
