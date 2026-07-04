import type { ReactElement } from "react";
import type { GetServerSideProps } from "next";
import type { NextPageWithLayout } from "@/pages/_app";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/logo/SwibbleLogo.svg";
import { Poppins } from "next/font/google";
import { getAllPosts } from "@/lib/blog/posts";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import type { BlogPost } from "@/lib/blog/types";

const poppins = Poppins({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  style: ["normal"],
});

interface Props {
  latestPost: BlogPost | null;
}

/* ── Link card ─────────────────────────────────────────────────────────── */

interface LinkCardProps {
  href: string;
  external?: boolean;
  icon: string;
  label: string;
  sublabel?: string;
  accent?: boolean;
}

const LinkCard = ({
  href,
  external,
  icon,
  label,
  sublabel,
  accent,
}: LinkCardProps) => {
  const inner = (
    <div
      className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 transition duration-200 active:scale-95 ${
        accent
          ? "bg-[#B718EC] shadow-lg shadow-purple-200"
          : "border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm hover:border-[#b718ec]/40 hover:shadow-md"
      }`}
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <div className="flex-1 text-left">
        <p
          className={`font-semibold ${accent ? "text-white" : "text-[#000D36]"}`}
        >
          {label}
        </p>
        {sublabel && (
          <p
            className={`mt-0.5 line-clamp-1 text-xs ${
              accent ? "text-purple-100" : "text-[#8a7791]"
            }`}
          >
            {sublabel}
          </p>
        )}
      </div>
      <span
        className={`text-sm ${accent ? "text-white/80" : "text-[#b718ec] opacity-0 transition group-hover:opacity-100"}`}
      >
        →
      </span>
    </div>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className="block w-full">
      {inner}
    </Link>
  );
};

/* ── Page ───────────────────────────────────────────────────────────────── */

const LinkHubPage: NextPageWithLayout<Props> = ({ latestPost }) => {
  return (
    <>
      <Head>
        <title>Swibble – Links</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        className={`${poppins.className} relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-[#FDF5FF] to-[#F3D9FF] px-6 py-14`}
      >
        {/* subtle background blob */}
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
              <h1 className="text-2xl font-bold text-[#000D36]">Swibble</h1>
              <p className="mt-1 text-sm text-[#556987]">
                Deine Digitalagentur aus Aachen
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex w-full flex-col gap-3">
            <LinkCard
              href="https://meet.swibble.net"
              external
              icon="📅"
              label="Termin buchen"
              sublabel="Kostenloses Erstgespräch vereinbaren"
              accent
            />

            {latestPost ? (
              <LinkCard
                href={`/blog/${latestPost.slug}`}
                icon="📝"
                label="Neuester Blogbeitrag"
                sublabel={latestPost.title}
              />
            ) : (
              <LinkCard
                href="/blog"
                icon="📝"
                label="Blog"
                sublabel="Einblicke aus der Swibble-Welt"
              />
            )}

            <LinkCard
              href="https://www.instagram.com/swibble.net"
              external
              icon="📸"
              label="Instagram"
              sublabel="@swibble.net"
            />

            <LinkCard
              href="https://www.linkedin.com/company/swibble"
              external
              icon="💼"
              label="LinkedIn"
              sublabel="Swibble auf LinkedIn"
            />

            <LinkCard
              href="/#kontakt"
              icon="✉️"
              label="Kontakt aufnehmen"
              sublabel="Schreib uns direkt eine Nachricht"
            />
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[#a99fb0]">
            © {new Date().getFullYear()} Swibble UG (haftungsbeschränkt)
          </p>
        </div>
      </div>
    </>
  );
};

/* Skip the site header + footer for this page */
LinkHubPage.getLayout = (page: ReactElement) => page;

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const latestPost = isFirebaseConfigured()
    ? ((await getAllPosts("newest"))[0] ?? null)
    : null;

  return { props: { latestPost } };
};

export default LinkHubPage;
