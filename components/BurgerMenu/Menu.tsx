import Link from "next/link";
import { NAV_LINKS } from "@/lib/navLinks";
import { CTA_LABEL, CTA_URL } from "@/lib/cta";

interface MenuProps {
  handleOnClick: () => void;
}

const navLinkClass =
  "hover:text-[#B718EC] transition-colors duration-300 ease-in-out";

export default function Menu({ handleOnClick }: MenuProps) {
  return (
    <div className="flex flex-col gap-y-4 py-4 text-sm font-medium text-[#556987]">
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          onClick={handleOnClick}
          className={navLinkClass}
        >
          {label}
        </Link>
      ))}
      <Link
        href={"/impressum"}
        onClick={handleOnClick}
        className={navLinkClass}
      >
        Impressum
      </Link>
      <a
        href={CTA_URL}
        onClick={handleOnClick}
        className="block text-center w-full bg-[#B718EC] text-[#F0FDF4] rounded-lg py-3 hover:scale-95 transition duration-200"
      >
        {CTA_LABEL}
      </a>
    </div>
  );
}
