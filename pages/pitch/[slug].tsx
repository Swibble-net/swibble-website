import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { IoDownloadOutline, IoMailOutline, IoPlay } from "react-icons/io5";
import type { NextPageWithLayout } from "@/pages/_app";
import Logo from "@/public/logo/SwibbleLogo.svg";
import LogoText from "@/public/logo/SwibbleWordmark.svg";
import SlidePresenter from "@/components/pitch/SlidePresenter";
import { isAuthenticated } from "@/lib/adminAuth";
import { isPreviewAgent, isValidSlug } from "@/lib/pitchdecks/config";
import { countPitchDeckView, getReadyPitchDeckBySlug } from "@/lib/pitchdecks/store";
import type { PitchDeckPage } from "@/lib/pitchdecks/types";

interface Props {
  slug: string;
  customer: string;
  title: string;
  pages: PitchDeckPage[];
  pdfSize: number;
  origin: string;
}

const CONTACT_EMAIL = "info@swibble.net";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MB`;
}

const PitchDeckPageView: NextPageWithLayout<Props> = ({ slug, customer, title, pages, pdfSize, origin }) => {
  const [presenting, setPresenting] = useState<number | null>(null);
  const pageUrl = useCallback((index: number) => `/api/pitch/${slug}/pages/${index + 1}`, [slug]);
  const downloadUrl = `/api/pitch/${slug}/pdf?download=1`;
  const close = useCallback(() => setPresenting(null), []);
  const slideCount = `${pages.length} ${pages.length === 1 ? "Folie" : "Folien"}`;
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Rückfrage zu: ${title}`)}`;

  return (
    <>
      <Head>
        <title>{`${title} – Swibble für ${customer}`}</title>
        <meta name="robots" content="noindex, nofollow, noarchive, noimageindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={`Präsentation von Swibble für ${customer}.`} />
        {/* Link previews in WhatsApp, Mail & Co. */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Swibble" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={`Präsentation für ${customer} · ${slideCount}`} />
        <meta property="og:image" content={`${origin}${pageUrl(0)}`} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-[#FDF5FF] via-[#FDF5FF] to-white text-[#2A3342]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-[#F0E4F5]/80 bg-[#FDF5FF]/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center transition duration-200 hover:scale-95">
              <Image src={Logo} alt="Swibble Logo" width={30} height={30} />
              <Image src={LogoText} alt="Swibble" width={86} height={26} />
            </Link>
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E8D7EF] bg-white px-3 py-1.5 text-sm font-medium text-[#000D36] transition hover:border-[#B718EC] hover:text-[#B718EC]"
            >
              <IoDownloadOutline size={17} aria-hidden />
              <span className="hidden sm:inline">PDF herunterladen</span>
              <span className="sm:hidden">PDF</span>
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4">
          {/* Intro */}
          <section className="relative py-12 sm:py-16">
            <div
              className="pointer-events-none absolute -top-10 left-1/2 -z-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#b718ec]/10 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <p className="mb-3 inline-block rounded-full bg-[#B718EC]/10 px-3 py-1 text-xs font-medium text-[#B718EC]">
                Präsentation für {customer}
              </p>
              <h1 className="max-w-3xl text-3xl font-bold leading-tight text-[#000D36] sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 text-sm text-[#556987]">
                {slideCount} · PDF {formatSize(pdfSize)}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setPresenting(0)}
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#B718EC] px-5 py-3 font-medium text-[#F0FDF4] shadow-lg shadow-purple-200 transition duration-200 hover:scale-95"
                >
                  <IoPlay size={18} aria-hidden />
                  Präsentation starten
                </button>
                <a
                  href={downloadUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#E8D7EF] bg-white px-5 py-3 font-medium text-[#000D36] transition duration-200 hover:border-[#B718EC] hover:text-[#B718EC]"
                >
                  <IoDownloadOutline size={19} aria-hidden />
                  PDF herunterladen
                </a>
              </div>
            </div>
          </section>

          {/* Slides */}
          <section aria-label="Folien" className="flex flex-col gap-6 pb-16 sm:gap-8">
            {pages.map((page, index) => (
              <figure key={index}>
                <button
                  type="button"
                  onClick={() => setPresenting(index)}
                  className="group block w-full overflow-hidden rounded-xl border border-[#F0E4F5] bg-white shadow-[0_10px_40px_-15px_rgba(80,20,110,0.25)] transition hover:shadow-[0_18px_50px_-15px_rgba(120,20,160,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B718EC]/30 sm:rounded-2xl"
                  aria-label={`Folie ${index + 1} groß anzeigen`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- served by our API, sizes known */}
                  <img
                    src={pageUrl(index)}
                    width={page.width}
                    height={page.height}
                    alt={`Folie ${index + 1}`}
                    loading={index < 2 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-auto w-full"
                  />
                </button>
                <figcaption className="mt-2 text-right text-xs text-[#a99fb0]">
                  {index + 1} / {pages.length}
                </figcaption>
              </figure>
            ))}
          </section>

          {/* Contact */}
          <section className="mb-14 rounded-2xl bg-[#000D36] px-6 py-10 text-center text-white sm:px-12">
            <h2 className="text-2xl font-bold">Fragen zur Präsentation?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
              Wir freuen uns auf deine Rückmeldung und besprechen die nächsten Schritte gern persönlich.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={mailto}
                className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#B718EC] px-5 py-3 font-medium text-[#F0FDF4] transition duration-200 hover:scale-95"
              >
                <IoMailOutline size={19} aria-hidden />
                {CONTACT_EMAIL}
              </a>
              <a
                href={downloadUrl}
                className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/20 px-5 py-3 font-medium text-white transition hover:border-white/50"
              >
                <IoDownloadOutline size={19} aria-hidden />
                PDF herunterladen
              </a>
            </div>
          </section>
        </main>

        <footer className="flex flex-col items-center gap-2 pb-10 text-xs text-[#a99fb0]">
          <div className="flex items-center gap-3">
            <Link href="/impressum" className="transition-colors hover:text-[#b718ec]">
              Impressum
            </Link>
            <span aria-hidden>·</span>
            <Link href="/datenschutz" className="transition-colors hover:text-[#b718ec]">
              Datenschutz
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Swibble UG (haftungsbeschränkt)</p>
        </footer>
      </div>

      {presenting !== null && (
        <SlidePresenter
          pages={pages}
          pageUrl={pageUrl}
          downloadUrl={downloadUrl}
          startIndex={presenting}
          onClose={close}
        />
      )}
    </>
  );
};

PitchDeckPageView.getLayout = (page: ReactElement) => page;

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug;
  if (!isValidSlug(slug)) return { notFound: true };

  const deck = await getReadyPitchDeckBySlug(slug);
  if (!deck) return { notFound: true };

  ctx.res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");

  // Views help to follow up with the customer; own visits and link previews don't count.
  if (!isAuthenticated(ctx.req) && !isPreviewAgent(ctx.req.headers["user-agent"])) {
    await countPitchDeckView(deck).catch((error) => console.error("[/pitch/:slug] view", error));
  }

  const host = ctx.req.headers["x-forwarded-host"] ?? ctx.req.headers.host ?? "www.swibble.net";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";

  return {
    props: {
      slug: deck.slug,
      customer: deck.customer,
      title: deck.title,
      pages: deck.pages,
      pdfSize: deck.pdfSize,
      origin: `${proto}://${Array.isArray(host) ? host[0] : host}`,
    },
  };
};

export default PitchDeckPageView;
