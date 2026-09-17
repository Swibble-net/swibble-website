import Image from "next/image";
import Link from "next/link";
import SwibbleLogoText from "@/public/logo/SwibbleTextLogoWhite.svg";
import LinkedInIcon from "@/public/icons/LinkedIn.svg";
import { NAV_LINKS } from "@/lib/navLinks";
import {
  CTA_LABEL,
  CTA_URL,
  EMAIL,
  PHONE_DISPLAY,
  PHONE_TEL,
} from "@/lib/cta";

const footerLinkClass =
  "text-[#D5DAE1] hover:text-[#E7A1FF] transition-colors duration-300 ease-in-out";

const columnTitleClass =
  "mb-4 text-xs font-medium uppercase tracking-[0.12em] text-[#8896AB]";

const CASE_STUDIES = [
  { href: "/blog/case-study-aquis-plaza-aachen", label: "Aquis Plaza Aachen" },
  {
    href: "/blog/case-study-olympia-einkaufszentrum-munchen",
    label: "Olympia-Einkaufszentrum München",
  },
  {
    href: "/blog/case-study-billstedt-center-hamburg",
    label: "Billstedt-Center Hamburg",
  },
  { href: "/blog/case-study-rushfood-aachen", label: "Rushfood Aachen" },
] as const;

const BLOG_LINKS = [
  {
    href: "/blog/einkaufszentren-auf-social-media",
    label: "Einkaufszentren auf Social Media",
  },
  {
    href: "/blog/live-content-events-social-media",
    label: "Live Content für Events",
  },
  {
    href: "/blog/360-grad-video-station-von-swibble",
    label: "Die 360° Video Station",
  },
  { href: "/blog", label: "Alle Artikel →" },
] as const;

const SOCIAL_LINKS = [
  {
    href: "https://www.linkedin.com/company/swibble",
    label: "Swibble auf LinkedIn",
    icon: LinkedInIcon,
  },
] as const;

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto w-full bg-[#000D36] px-4 pb-7 pt-16 text-[#FAFAFA] lg:px-20 lg:pt-24">
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0]">
        <svg
          className="relative block w-[136%] h-4 lg:h-[39px]"
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            className="fill-white"
          ></path>
        </svg>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-10 text-sm lg:grid-cols-[1.4fr_1fr_1.3fr_1.3fr_1.2fr]">
        <div className="col-span-2 flex flex-col gap-5 lg:col-span-1">
          <Link
            href={"/"}
            className="w-fit hover:scale-95 transition duration-200"
          >
            <Image src={SwibbleLogoText} alt="Swibble" width={120} height={33} />
          </Link>
          <p className="max-w-xs font-light leading-6 text-[#D5DAE1]">
            Digitalagentur aus Aachen für Social Media, Live-Events, Design &
            Software – bundesweit im Einsatz.
          </p>
          <div className="flex gap-3">
            {SOCIAL_LINKS.map(({ href, label, icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="opacity-80 hover:opacity-100 hover:scale-95 transition duration-200"
              >
                <Image src={icon} alt="" width={28} height={28} />
              </a>
            ))}
          </div>
        </div>

        <nav aria-label="Footer-Navigation">
          <h2 className={columnTitleClass}>Swibble</h2>
          <ul className="flex flex-col gap-3 font-light">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={footerLinkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Case Studies">
          <h2 className={columnTitleClass}>Case Studies</h2>
          <ul className="flex flex-col gap-3 font-light">
            {CASE_STUDIES.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={footerLinkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Blog">
          <h2 className={columnTitleClass}>Blog</h2>
          <ul className="flex flex-col gap-3 font-light">
            {BLOG_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={footerLinkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={columnTitleClass}>Kontakt</h2>
          <ul className="flex flex-col gap-3 font-light">
            <li>
              <a href={`tel:${PHONE_TEL}`} className={footerLinkClass}>
                {PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <a href={`mailto:${EMAIL}`} className={footerLinkClass}>
                {EMAIL}
              </a>
            </li>
            <li className="text-[#D5DAE1]">
              Königstraße 30
              <br />
              52064 Aachen
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-7xl flex-col items-start gap-5 border-t border-white/10 pt-6 text-xs font-light lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[#ADADAD]">
          © {year} Swibble UG (haftungsbeschränkt)
        </p>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <li>
            <Link href={"/impressum"} className={footerLinkClass}>
              Impressum
            </Link>
          </li>
          <li>
            <Link href={"/datenschutz"} className={footerLinkClass}>
              Datenschutz
            </Link>
          </li>
          <li>
            <a
              href={CTA_URL}
              className="inline-block rounded-xl bg-[#B718EC] px-4 py-2 font-normal text-[#F0FDF4] hover:scale-95 transition duration-200"
            >
              {CTA_LABEL}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
