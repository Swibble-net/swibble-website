import Link from "next/link";

const SECTIONS = [
  { href: "/admin", label: "Blog" },
  { href: "/admin/linkhub", label: "Linkhub" },
  { href: "/admin/videos", label: "Videos" },
  { href: "/admin/bewerbungen", label: "Bewerbungen" },
  { href: "/admin/creator", label: "Creator" },
  { href: "/admin/pitchdecks", label: "Pitchdecks" },
] as const;

export type AdminSection = (typeof SECTIONS)[number]["label"];

const linkClass =
  "rounded-lg border border-[#F0E4F5] px-3 py-1.5 text-sm font-medium text-[#556987] transition hover:border-[#b718ec] hover:text-[#b718ec]";

/** Section tabs at the top of every CMS overview page. */
const AdminNav = ({ current }: { current: AdminSection }) => (
  <nav aria-label="CMS-Bereiche" className="mb-6 flex flex-wrap gap-2">
    {SECTIONS.map(({ href, label }) =>
      label === current ? (
        <span
          key={href}
          aria-current="page"
          className="rounded-lg bg-[#B718EC] px-3 py-1.5 text-sm font-medium text-white"
        >
          {label}
        </span>
      ) : (
        <Link key={href} href={href} className={linkClass}>
          {label}
        </Link>
      ),
    )}
  </nav>
);

export default AdminNav;
