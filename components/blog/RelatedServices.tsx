import Link from "next/link";
import { CTA_LABEL, CTA_URL } from "@/lib/cta";
import { SERVICE_LINKS } from "@/lib/navLinks";
import type { RelatedService } from "@/lib/landing/related";

interface Props {
  services: RelatedService[];
}

// Links a blog post back to the landing pages of the services it is about. Sits outside
// the <article>, so reader modes still show only the post.
const RelatedServices = ({ services }: Props) => {
  const heading =
    services.length === 0
      ? "Unsere Leistungen"
      : services.length === 1
        ? "Passende Leistung"
        : "Passende Leistungen";

  return (
    <aside
      aria-labelledby="passende-leistung"
      className="mx-auto mt-12 w-full max-w-3xl rounded-3xl bg-[#FDF5FF] p-6 sm:p-8"
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#8A1FD6]">
        So setzen wir das für dich um
      </p>
      <h2
        id="passende-leistung"
        className="mt-2 text-2xl font-bold text-[#000D36]"
      >
        {heading}
      </h2>

      {services.length > 0 ? (
        <ul className={`mt-5 grid grid-cols-1 gap-4 ${services.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {services.map(({ href, title, text }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-2xl border border-[#F0E4F5] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <h3 className="text-lg font-bold text-[#000D36] transition group-hover:text-[#B718EC]">
                  {title}
                </h3>
                <span className="mt-2 text-sm leading-relaxed text-[#556987]">
                  {text}
                </span>
                <span className="mt-auto pt-4 text-sm font-medium text-[#A214D3] group-hover:underline">
                  Mehr erfahren →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-5 flex flex-wrap gap-3">
          {SERVICE_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="inline-block rounded-full border border-[#E3C8EE] bg-white px-4 py-2 text-sm font-medium text-[#000D36] transition-colors hover:border-[#B718EC] hover:text-[#A214D3]"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-[#556987]">
        <span>Du willst wissen, was davon zu dir passt?</span>
        <a
          href={CTA_URL}
          className="inline-block rounded-2xl bg-[#B718EC] px-5 py-3 text-center font-medium text-[#F0FDF4] transition duration-200 hover:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
        >
          {CTA_LABEL}
        </a>
      </p>
    </aside>
  );
};

export default RelatedServices;
