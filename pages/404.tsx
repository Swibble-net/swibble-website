import Image from "next/image";
import Link from "next/link";
import SEO from "@/components/SEO";
import Logo from "@/public/logo/SwibbleLogo.svg";

export default function NotFound() {
  return (
    <>
      <SEO
        title="Seite nicht gefunden – Swibble"
        description="Diese Seite existiert nicht. Zurück zur Swibble Startseite."
        noIndex
      />
      <div className="relative mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-2xl flex-col items-center justify-center overflow-hidden px-4 py-12 text-center lg:min-h-[calc(100vh-14rem)]">
        <div
          className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#B718EC]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-8 right-0 h-48 w-48 rounded-full bg-[#7A00D4]/10 blur-3xl"
          aria-hidden
        />

        <Image
          src={Logo}
          alt="Swibble Logo"
          width={72}
          height={72}
          className="relative mb-8 h-16 w-16 lg:h-[4.5rem]"
        />

        <p className="relative bg-linear-to-r from-[#B718EC] to-[#7A00D4] bg-clip-text text-7xl font-bold leading-none tracking-tight text-transparent sm:text-8xl lg:text-9xl">
          404
        </p>

        <h1 className="relative mt-6 text-2xl font-bold text-[#000D36] lg:text-4xl">
          Ups — diese Seite gibt es nicht
        </h1>

        <p className="relative mt-4 max-w-md text-base leading-relaxed text-[#556987] lg:text-lg">
          Vielleicht wurde sie verschoben oder der Link ist veraltet. Kein
          Problem — wir bringen dich zurück auf den richtigen Weg.
        </p>

        <div className="relative mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="rounded-2xl bg-[#B718EC] px-6 py-3 text-sm font-medium text-[#F0FDF4] transition duration-200 hover:scale-95"
          >
            Zur Startseite
          </Link>
          <Link
            href="/#kontakt"
            className="text-sm font-medium text-[#B718EC] tracking-normal transition-all duration-300 hover:tracking-[1px]"
          >
            Kontakt aufnehmen {">"}
          </Link>
        </div>
      </div>
    </>
  );
}
