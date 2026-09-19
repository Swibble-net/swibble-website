import { LANDING_LINKS, landingPath } from "@/lib/landing/links";

export interface NavLink {
  href: string;
  label: string;
  /** Sub-pages, shown as a dropdown (header), disclosure (burger menu) or column (footer). */
  children?: readonly { href: string; label: string }[];
}

export const SERVICE_LINKS = LANDING_LINKS.map(({ slug, label }) => ({
  href: landingPath(slug),
  label,
}));

export const NAV_LINKS: readonly NavLink[] = [
  { href: "/#uber-uns", label: "Leistungen", children: SERVICE_LINKS },
  { href: "/#portfolio", label: "Portfolio" },
  { href: "/#videos", label: "Videos" },
  { href: "/blog", label: "Blog" },
  { href: "/#kontakt", label: "Kontakt" },
];
