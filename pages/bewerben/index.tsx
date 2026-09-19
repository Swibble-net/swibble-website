import { useEffect, useRef, useState, type ReactElement } from "react";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import Link from "next/link";
import type { NextPageWithLayout } from "@/pages/_app";
import Logo from "@/public/logo/SwibbleLogo.svg";
import SEO from "@/components/SEO";
import ApplicationForm from "@/components/applications/ApplicationForm";
import { WITHDRAWAL_EMAIL } from "@/lib/applications/config";
import {
  getCenterOptions,
  isApplicationStoreAvailable,
  isConsentUploadAvailable,
  type CenterOption,
} from "@/lib/applications/store";

interface Props {
  center: CenterOption | null;
  centers: CenterOption[];
  storeAvailable: boolean;
  uploadsAvailable: boolean;
}

const STEPS = [
  ["1", "Formular ausfüllen", "Dauert keine zwei Minuten."],
  ["2", "Wir schauen uns dein Profil an", "Passt es, melden wir uns bei dir – per Mail, WhatsApp oder DM."],
  ["3", "Kennenlernen & loslegen", "Wir sprechen alles mit dir ab. Du entscheidest, ob du dabei bist."],
];

const BewerbenPage: NextPageWithLayout<Props> = ({
  center,
  centers,
  storeAvailable,
  uploadsAvailable,
}) => {
  const [done, setDone] = useState(false);
  // Center for the "back to …" link: from the URL or chosen in the form.
  const [doneCenter, setDoneCenter] = useState<CenterOption | null>(center);
  const doneHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!done) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    doneHeading.current?.focus();
  }, [done]);

  return (
    <>
      <SEO
        title="Mach mit bei unseren Videos"
        description="Du willst in TikTok- und Instagram-Videos aus deinem Einkaufszentrum dabei sein, als Promoter:in oder Model arbeiten? Bewirb dich in zwei Minuten bei Swibble."
        canonical="/bewerben"
      />

      <div className="relative flex min-h-screen w-full flex-col items-center bg-gradient-to-b from-[#FDF5FF] to-[#F3D9FF] px-4 py-8 sm:py-12">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#b718ec]/10 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-48 w-48 rounded-full bg-[#b718ec]/10 blur-3xl" />
        </div>

        <main className="relative flex w-full max-w-xl flex-col gap-6">
          <header className="flex flex-col items-center gap-4 text-center">
            <Link href="/" aria-label="Zur Swibble-Startseite">
              <Image src={Logo} alt="Swibble" width={48} height={48} />
            </Link>

            {center && !done && (
              <p className="rounded-full bg-white/80 px-4 py-1.5 text-sm font-medium text-[#B718EC] shadow-sm">
                Bewerbung über {center.name}
              </p>
            )}

            {!done && (
              <>
                <h1 className="text-balance text-3xl font-bold leading-tight text-[#000D36] sm:text-4xl">
                  Mach mit bei unseren Videos 🎬
                </h1>
                <p className="max-w-md text-base text-[#556987]">
                  Wir drehen die TikToks und Reels für dein Center – und suchen
                  Leute, die Lust haben, vor der Kamera zu stehen, als
                  Promoter:in zu arbeiten oder zu modeln. Keine Erfahrung nötig.
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
                Wir schauen uns alles in Ruhe an. Wenn es passt, melden wir uns
                bei dir – per E-Mail, WhatsApp oder über dein Profil. Das kann
                ein paar Tage dauern.
              </p>
              <p className="mt-3 text-sm text-[#8a7791]">
                Du willst deine Bewerbung zurückziehen? Schreib einfach an{" "}
                <a href="mailto:info@swibble.net" className="underline">
                  info@swibble.net
                </a>
                , dann löschen wir deine Daten.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {doneCenter && (
                  <Link
                    href={`/linkhub/${doneCenter.slug}`}
                    className="rounded-2xl bg-[#B718EC] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-purple-200 hover:bg-[#a514d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
                  >
                    Zurück zu {doneCenter.name}
                  </Link>
                )}
                <Link
                  href="/"
                  className="rounded-2xl border border-[#E4D3EC] bg-white px-6 py-3.5 text-base font-medium text-[#000D36] hover:border-[#B718EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
                >
                  Mehr über Swibble
                </Link>
              </div>
            </section>
          ) : (
            <>
              <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {STEPS.map(([number, title, text]) => (
                  <li
                    key={number}
                    className="flex gap-3 rounded-2xl bg-white/70 p-4 sm:flex-col sm:gap-2"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B718EC] text-sm font-bold text-white"
                      aria-hidden
                    >
                      {number}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[#000D36]">
                        {title}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#556987]">
                        {text}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              {storeAvailable ? (
                <ApplicationForm
                  center={center}
                  centers={centers}
                  uploadsAvailable={uploadsAvailable}
                  onSuccess={(slug) => {
                    setDoneCenter(centers.find((c) => c.slug === slug) ?? null);
                    setDone(true);
                  }}
                />
              ) : (
                <p
                  role="alert"
                  className="rounded-2xl bg-amber-50 p-5 text-center text-sm text-amber-800"
                >
                  Bewerbungen sind gerade leider nicht möglich. Bitte versuch es
                  später noch einmal oder schreib uns an{" "}
                  <a href="mailto:info@swibble.net" className="underline">
                    info@swibble.net
                  </a>
                  .
                </p>
              )}

              <p className="text-center text-xs text-[#8a7791]">
                Wir nehmen dich in unseren Bewerberpool auf und speichern deine
                Angaben, bis du widerrufst – eine Mail an {WITHDRAWAL_EMAIL}{" "}
                genügt, dann löschen wir alles.
                Mehr dazu in der{" "}
                <Link href="/datenschutz#bewerbungen" className="underline">
                  Datenschutzerklärung
                </Link>
                .
              </p>
            </>
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

BewerbenPage.getLayout = (page: ReactElement) => page;

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const storeAvailable = isApplicationStoreAvailable();

  let centers: CenterOption[] = [];
  try {
    centers = await getCenterOptions();
  } catch {
    // The form still works without the center list.
  }

  const slug = typeof ctx.query.center === "string" ? ctx.query.center : "";
  const center = centers.find((c) => c.slug === slug) ?? null;

  return {
    props: {
      center,
      centers,
      storeAvailable,
      uploadsAvailable: isConsentUploadAvailable(),
    },
  };
};

export default BewerbenPage;
