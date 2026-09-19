import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useId, useRef, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import type { NavLink } from "@/lib/navLinks";

interface Props {
  item: NavLink;
  className: string;
}

// Disclosure pattern: a button toggles the list, Escape and outside clicks close it.
const NavDropdown = ({ item, className }: Props) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const router = useRouter();

  useEffect(() => {
    const close = () => setOpen(false);
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router.events]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1 ${className}`}
      >
        {item.label}
        <IoChevronDown
          aria-hidden
          className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      <ul
        id={listId}
        hidden={!open}
        className="absolute left-1/2 top-full z-50 mt-3 w-64 -translate-x-1/2 rounded-2xl border border-[#F0E4F5] bg-white p-2 shadow-lg"
      >
        {item.children?.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-2.5 text-sm font-medium text-[#000D36] transition-colors hover:bg-[#FDF5FF] hover:text-[#A214D3]"
            >
              {label}
            </Link>
          </li>
        ))}
        <li className="mt-1 border-t border-[#F0E4F5] pt-1">
          <Link
            href={item.href}
            onClick={() => setOpen(false)}
            className="block rounded-xl px-4 py-2.5 text-sm text-[#556987] transition-colors hover:bg-[#FDF5FF] hover:text-[#A214D3]"
          >
            Alle Leistungen im Überblick
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default NavDropdown;
