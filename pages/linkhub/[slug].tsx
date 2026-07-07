import type { ReactElement } from "react";
import type { GetServerSideProps } from "next";
import type { NextPageWithLayout } from "@/pages/_app";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/logo/SwibbleLogo.svg";
import { Poppins } from "next/font/google";
import { getProfileBySlug } from "@/lib/linkhub/profiles";
import type { LinkhubProfile, LinkhubLink } from "@/lib/linkhub/types";

const poppins = Poppins({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  style: ["normal"],
});

interface Props {
  profile: LinkhubProfile;
}

/* ── Link card ─────────────────────────────────────────────────────────── */

const LinkCard = ({ link }: { link: LinkhubLink }) => {
  const inner = (
    <div
      className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 transition duration-200 active:scale-95 ${
        link.accent
          ? "bg-[#B718EC] shadow-lg shadow-purple-200"
          : "border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm hover:border-[#b718ec]/40 hover:shadow-md"
      }`}
    >
      <span className="text-xl" aria-hidden>
        {link.icon}
      </span>
      <div className="flex-1 text-left">
        <p
          className={`font-semibold ${
            link.accent ? "text-white" : "text-[#000D36]"
          }`}
        >
          {link.label}
        </p>
        {link.sublabel && (
          <p
            className={`mt-0.5 line-clamp-1 text-xs ${
              link.accent ? "text-purple-100" : "text-[#8a7791]"
            }`}
          >
            {link.sublabel}
          </p>
        )}
      </div>
      <span
        className={`text-sm ${
          link.accent
            ? "text-white/80"
            : "text-[#b718ec] opacity-0 transition group-hover:opacity-100"
        }`}
      >
        →
      </span>
    </div>
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={link.href} className="block w-full">
      {inner}
    </Link>
  );
};

/* ── Page ───────────────────────────────────────────────────────────────── */

const LinkHubPage: NextPageWithLayout<Props> = ({ profile }) => (
  <>
    <Head>
      <title>{profile.name} – Links</title>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Head>

    <div
      className={`${poppins.className} relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-[#FDF5FF] to-[#F3D9FF] px-6 py-14`}
    >
      {/* Background blobs */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#b718ec]/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-48 w-48 rounded-full bg-[#b718ec]/10 blur-3xl" />
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <Image src={Logo} alt="Swibble Logo" width={56} height={56} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#000D36]">
              {profile.name}
            </h1>
            {profile.subtitle && (
              <p className="mt-1 text-sm text-[#556987]">{profile.subtitle}</p>
            )}
          </div>
        </div>

        {/* Links */}
        {profile.links.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            {profile.links.map((link) => (
              <LinkCard key={link.id} link={link} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8a7791]">
            Noch keine Links vorhanden.
          </p>
        )}

        {/* Legal footer */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 text-xs text-[#a99fb0]">
            <Link
              href="/impressum"
              className="transition-colors hover:text-[#b718ec]"
            >
              Impressum
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="/datenschutz"
              className="transition-colors hover:text-[#b718ec]"
            >
              Datenschutz
            </Link>
          </div>
          <p className="text-center text-xs text-[#a99fb0]">
            © {new Date().getFullYear()} Swibble UG (haftungsbeschränkt)
          </p>
        </div>
      </div>
    </div>
  </>
);

LinkHubPage.getLayout = (page: ReactElement) => page;

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug =
    typeof ctx.params?.slug === "string" ? ctx.params.slug : "";

  const profile = await getProfileBySlug(slug);
  if (!profile) return { notFound: true };

  return { props: { profile } };
};

export default LinkHubPage;
