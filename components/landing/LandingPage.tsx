import Image from "next/image";
import Link from "next/link";
import SEO from "@/components/SEO";
import ContactForm from "@/components/ContactForm";
import HeroVisual from "@/components/HeroVisual";
import LandingProof from "@/components/landing/LandingProof";
import LandingFaq from "@/components/landing/LandingFaq";
import { LANDING_IMAGES } from "@/components/landing/images";
import { CTA_LABEL, CTA_URL } from "@/lib/cta";
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from "@/lib/jsonLd";
import { LANDING_LINKS, landingPath } from "@/lib/landing/links";
import type {
  LandingCaseStudy,
  LandingPageContent,
} from "@/lib/landing/types";

const primaryButtonClass =
  "w-fit text-center text-base font-medium bg-[#B718EC] text-[#F0FDF4] py-3 px-6 rounded-2xl hover:scale-95 transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] motion-reduce:transform-none motion-reduce:transition-none";

const h2Class = "text-2xl font-bold text-[#000D36] lg:text-4xl";

const Hero = ({ page }: { page: LandingPageContent }) => (
  <section className="relative w-full flex flex-col justify-between gap-10 py-6 mb-24 lg:flex-row lg:items-center lg:gap-16 lg:mb-28 lg:py-20">
    <div
      aria-hidden
      className="bg-[#FDF5FF] absolute top-0 bottom-0 right-0 left-0 -z-10 w-screen -mt-20 -mx-4 lg:-mx-20"
    ></div>
    <div className="flex flex-col gap-5 lg:max-w-[38rem]">
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
      <h1 className="text-[#000D36] font-bold text-[1.75rem] leading-tight break-words lg:text-[2.75rem] lg:leading-[1.15]">
        {page.hero.title}
      </h1>
      <p className="text-[#000D36] text-base font-normal leading-7 lg:text-lg lg:leading-8">
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
    <div className="w-full flex justify-center lg:justify-end">
      {page.hero.image === "fynn" ? (
        <HeroVisual
          alt={page.hero.imageAlt}
          sizes="(max-width: 1024px) min(100vw - 2rem, 460px), min(45vw, 560px)"
          className="max-w-[460px] lg:max-w-[560px]"
        />
      ) : (
        <div className="relative aspect-[4/5] w-full max-w-[22rem] overflow-hidden rounded-3xl shadow-[0_25px_100px_rgba(76,64,247,0.18)] lg:max-w-[26rem]">
          <Image
            src={LANDING_IMAGES[page.hero.image]}
            alt={page.hero.imageAlt}
            fill
            priority
            sizes="(max-width: 1024px) min(100vw - 2rem, 352px), 416px"
            className="object-cover"
          />
        </div>
      )}
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

const Services = ({ services }: { services: LandingPageContent["services"] }) => (
  <section aria-labelledby="leistungen" className="w-full py-10 lg:py-16">
    <div className="mb-8 max-w-3xl">
      <h2 id="leistungen" className={h2Class}>
        {services.title}
      </h2>
      <p className="mt-3 text-base leading-7 text-[#556987] lg:text-lg">
        {services.intro}
      </p>
    </div>
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {services.items.map(({ title, text }) => (
        <li
          key={title}
          className="flex gap-4 rounded-[0.625rem] bg-white p-5 shadow-[0_25px_100px_rgba(76,64,247,0.08)] border border-[#F0E4F5]"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="mt-0.5 h-6 w-6 flex-none text-[#B718EC]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <div>
            <h3 className="text-base font-bold text-[#000D36]">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#556987]">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

const Process = ({ process }: { process: LandingPageContent["process"] }) => (
  <section
    aria-labelledby="ablauf"
    className="relative w-full py-12 lg:py-20"
  >
    <div
      aria-hidden
      className="bg-[#FDF5FF] absolute top-0 bottom-0 right-0 left-0 -z-10 w-screen -mx-4 lg:-mx-20"
    ></div>
    <div className="mb-8 max-w-3xl">
      <h2 id="ablauf" className={h2Class}>
        {process.title}
      </h2>
      <p className="mt-3 text-base leading-7 text-[#556987] lg:text-lg">
        {process.intro}
      </p>
    </div>
    <ol className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      {process.steps.map(({ title, text }, index) => (
        <li
          key={title}
          className="flex flex-col gap-3 rounded-[0.625rem] bg-white p-6 shadow-[0_25px_100px_rgba(76,64,247,0.08)]"
        >
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B718EC] text-lg font-bold text-white"
          >
            {index + 1}
          </span>
          <h3 className="text-lg font-bold text-[#000D36]">
            <span className="sr-only">Schritt {index + 1}: </span>
            {title}
          </h3>
          <p className="text-sm leading-6 text-[#556987]">{text}</p>
        </li>
      ))}
    </ol>
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
}

const LandingPage = ({ page, caseStudies }: Props) => {
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
        <LandingProof proof={page.proof} caseStudies={caseStudies} />
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
