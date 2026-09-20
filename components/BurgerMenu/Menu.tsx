import CtaLink from "@/components/CtaLink";
import { useId, useState } from "react";
import Link from "next/link";
import { IoChevronDown } from "react-icons/io5";
import { NAV_LINKS } from "@/lib/navLinks";
import { CTA_LABEL } from "@/lib/cta";

interface MenuProps {
  handleOnClick: () => void;
}

const navLinkClass =
  "hover:text-[#B718EC] transition-colors duration-300 ease-in-out";

export default function Menu({ handleOnClick }: MenuProps) {
  // The service pages stay collapsed so the menu fits small screens without scrolling.
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesId = useId();

  return (
    <div className="flex flex-col gap-y-4 py-4 text-sm font-medium text-[#556987]">
      {NAV_LINKS.map((item) =>
        item.children ? (
          <div key={item.href}>
            <button
              type="button"
              aria-expanded={servicesOpen}
              aria-controls={servicesId}
              onClick={() => setServicesOpen((value) => !value)}
              className={`flex w-full items-center justify-between font-medium ${navLinkClass}`}
            >
              {item.label}
              <IoChevronDown
                aria-hidden
                className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${servicesOpen ? "rotate-180" : ""}`}
              />
            </button>
            <ul
              id={servicesId}
              hidden={!servicesOpen}
              className="mt-3 flex flex-col gap-y-3 border-l-2 border-[#E3C8EE] pl-4"
            >
              {item.children.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} onClick={handleOnClick} className={navLinkClass}>
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={item.href} onClick={handleOnClick} className={navLinkClass}>
                  Alle Leistungen im Überblick
                </Link>
              </li>
            </ul>
          </div>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleOnClick}
            className={navLinkClass}
          >
            {item.label}
          </Link>
        ),
      )}
      <Link
        href={"/impressum"}
        onClick={handleOnClick}
        className={navLinkClass}
      >
        Impressum
      </Link>
      <CtaLink
        onClick={handleOnClick}
        className="block text-center w-full bg-[#B718EC] text-[#F0FDF4] rounded-lg py-3 hover:scale-95 transition duration-200"
      >
        {CTA_LABEL}
      </CtaLink>
    </div>
  );
}
