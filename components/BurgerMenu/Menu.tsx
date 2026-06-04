import Link from "next/link";
import { NAV_LINKS } from "@/lib/navLinks";

interface MenuProps {
  handleOnClick: () => void;
}

const navLinkClass =
  "tracking-normal hover:tracking-[1px] transition-all duration-500 ease-in-out";

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
      <a href={"https://meet.swibble.net"} onClick={handleOnClick}>
        <button className="text-center w-full bg-[#B718EC] text-[#F0FDF4] rounded-lg py-3 hover:scale-95 transition duration-200">
          Termin vereinbaren
        </button>
      </a>
    </div>
  );
}
