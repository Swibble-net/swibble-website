import { useEffect, useRef, useState, type ReactElement } from "react";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import Link from "next/link";
import type { NextPageWithLayout } from "@/pages/_app";
import Logo from "@/public/logo/SwibbleLogo.svg";
import SEO from "@/components/SEO";
import CreatorApplicationForm from "@/components/applications/CreatorApplicationForm";
import { WITHDRAWAL_EMAIL } from "@/lib/applications/config";
import {
  isApplicationStoreAvailable,
  isConsentUploadAvailable,
} from "@/lib/applications/store";

interface Props {
  /** Photos and the signed release need the private bucket. */
  available: boolean;
  /**
   * Vercel preview without the bucket (it is set for Production only): the
   * form is shown for review, sending only works on the live site.
   */
  previewOnly: boolean;
}

const CreatorPage: NextPageWithLayout<Props> = ({ available, previewOnly }) => {
  const [done, setDone] = useState(false);
  const doneHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!done) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    doneHeading.current?.focus();
  }, [done]);

  return (
    <>
      <SEO
        title="Werde Swibble Creator"
        description="Du bist Model, Content Creator oder moderierst? Bewirb dich in wenigen Schritten für den Swibble Creator Pool – wir stellen dich unseren Kunden vor."
        canonical="/bewerben/creator"
      />

      <div className="relative flex min-h-screen w-full flex-col items-center bg-gradient-to-b from-[#FDF5FF] to-[#F3D9FF] px-4 py-8 sm:py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#b718ec]/10 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-48 w-48 rounded-full bg-[#b718ec]/10 blur-3xl" />
        </div>

        <main className="relative flex w-full max-w-xl flex-col gap-6">
          <header className="flex flex-col items-center gap-3 text-center sm:gap-4">
            <Link href="/" aria-label="Zur Swibble-Startseite">
              <Image src={Logo} alt="Swibble" width={48} height={48} />
            </Link>

            {!done && (
              <>
                <p className="rounded-full bg-white/80 px-4 py-1.5 text-sm font-medium text-[#B718EC] shadow-sm">
                  Swibble Creator Pool
                </p>
                <h1 className="text-balance text-3xl font-bold leading-tight text-[#000D36] sm:text-4xl">
                  Werde Swibble Creator ✨
                </h1>
                <p className="max-w-md text-base text-[#556987]">
                  Für Models, Content Creator und Moderation: Wir stellen dich
                  unseren Kunden vor und buchen dich für Shootings, Videos und
                  Events.
                </p>
              </>
            )}
          </header>

          {done ? (
            <section
              className="rounded-2xl border border-white/70 bg-white/85 p-6 text-center shadow-sm backdrop-blur-sm sm:p-8"
              aria-live="polite"
            >
              <p className="text-5xl" aria-hidden>
                🎉
              </p>
              <h1
                ref={doneHeading}
                tabIndex={-1}
                className="mt-3 text-2xl font-bold text-[#000D36] focus:outline-none"
              >
                Danke, deine Bewerbung ist da!
              </h1>
              <p className="mt-3 text-base text-[#556987]">
                Wir schauen uns dein Profil in Ruhe an und melden uns, sobald es
                passt – per E-Mail, WhatsApp oder über deine Kanäle. Eine
                Bestätigung mit deiner unterschriebenen Erklärung kommt per
                E-Mail.
              </p>
              <p className="mt-3 text-sm text-[#8a7791]">
                Du willst deine Bewerbung zurückziehen? Schreib einfach an{" "}
                <a href={`mailto:${WITHDRAWAL_EMAIL}`} className="underline">
                  {WITHDRAWAL_EMAIL}
                </a>
                , dann löschen wir deine Daten.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/"
                  className="rounded-2xl bg-[#B718EC] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-purple-200 hover:bg-[#a514d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
                >
                  Mehr über Swibble
                </Link>
              </div>
            </section>
          ) : available || previewOnly ? (
            <>
              {previewOnly && (
                <p className="rounded-2xl bg-amber-50 p-4 text-center text-sm text-amber-800">
                  Vorschau: Fotos und Unterschrift werden hier nicht gespeichert –
                  Absenden klappt erst auf der Live-Seite.
                </p>
              )}
              <CreatorApplicationForm onSuccess={() => setDone(true)} />
            </>
          ) : (
            <p
              role="alert"
              className="rounded-2xl bg-amber-50 p-5 text-center text-sm text-amber-800"
            >
              Bewerbungen sind gerade leider nicht möglich. Bitte versuch es
              später noch einmal oder schreib uns an{" "}
              <a href={`mailto:${WITHDRAWAL_EMAIL}`} className="underline">
                {WITHDRAWAL_EMAIL}
              </a>
              .
            </p>
          )}

          {!done && (
            <p className="text-center text-xs text-[#8a7791]">
              Wir nehmen dich in den Swibble Creator Pool auf und speichern deine
              Angaben, bis du widerrufst – eine Mail an {WITHDRAWAL_EMAIL}{" "}
              genügt. Mehr dazu in der{" "}
              <Link href="/datenschutz#creator-pool" className="underline">
                Datenschutzerklärung
              </Link>
              .
            </p>
          )}

          <footer className="flex flex-col items-center gap-2 pb-4 text-xs text-[#a99fb0]">
            <div className="flex items-center gap-3">
              <Link href="/impressum" className="hover:text-[#b718ec]">
                Impressum
              </Link>
              <span aria-hidden>·</span>
              <Link href="/datenschutz" className="hover:text-[#b718ec]">
                Datenschutz
              </Link>
            </div>
            <p>© {new Date().getFullYear()} Swibble UG (haftungsbeschränkt)</p>
          </footer>
        </main>
      </div>
    </>
  );
};

CreatorPage.getLayout = (page: ReactElement) => page;

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const available = isApplicationStoreAvailable() && isConsentUploadAvailable();
  return {
    props: {
      available,
      previewOnly: !available && process.env.VERCEL_ENV === "preview",
    },
  };
};

export default CreatorPage;
