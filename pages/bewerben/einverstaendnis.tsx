import type { ReactElement } from "react";
import type { NextPageWithLayout } from "@/pages/_app";
import Image from "next/image";
import Wordmark from "@/public/logo/SwibbleWordmark.svg";
import SEO from "@/components/SEO";
import {
  APPLICATION_ROLES,
  CONSENT_TEMPLATE_IS_DRAFT,
  GUARDIAN_DECLARATION_CLAUSES,
  GUARDIAN_DECLARATION_INTRO,
} from "@/lib/applications/config";

// Printable parental consent template ("Muttizettel"). Plain HTML so the
// wording can be changed here after legal review — no PDF to regenerate.

const Line = ({ label }: { label: string }) => (
  <div className="flex flex-col">
    <span className="h-8 border-b border-[#000D36]" />
    <span className="mt-1 text-[11px] text-[#556987]">{label}</span>
  </div>
);

const EinverstaendnisPage: NextPageWithLayout = () => (
  <>
    <SEO
      title="Einverständniserklärung der Eltern"
      description="Vorlage für die Einverständniserklärung der Erziehungsberechtigten zur Bewerbung bei Swibble."
      canonical="/bewerben/einverstaendnis"
      noIndex
    />

    <div className="min-h-screen bg-gradient-to-b from-[#FDF5FF] to-[#F3D9FF] px-4 py-6 print:bg-none print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="max-w-xl text-sm text-[#556987]">
          Ausdrucken, ausfüllen, unterschreiben lassen – dann ein Foto davon im
          Formular hochladen. Noch einfacher: Die Erklärung lässt sich im
          Bewerbungsformular auch direkt online ausfüllen und unterschreiben.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-[#B718EC] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a514d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
        >
          Drucken / als PDF speichern
        </button>
      </div>

      <article className="relative mx-auto max-w-[210mm] overflow-hidden rounded-2xl bg-white p-8 text-[13px] leading-relaxed text-[#000D36] shadow-lg shadow-purple-100 [print-color-adjust:exact] print:max-w-none print:rounded-none print:p-0 print:shadow-none sm:p-12">
        {/* Brand header */}
        <div className="mb-7 flex items-center justify-between border-b-2 border-[#B718EC] pb-4">
          <Image src={Wordmark} alt="Swibble" className="h-7 w-auto" priority />
          <span className="rounded-full bg-[#F9EAFF] px-3 py-1 text-[11px] font-medium text-[#B718EC]">
            Bewerbung · Einverständnis der Eltern
          </span>
        </div>

        {CONSENT_TEMPLATE_IS_DRAFT && (
          <p className="mb-6 border-2 border-red-600 p-3 text-center text-sm font-bold uppercase tracking-wide text-red-600">
            Entwurf – noch nicht rechtlich geprüft
          </p>
        )}

        <h1 className="text-2xl font-bold text-[#000D36]">
          Einverständniserklärung der Erziehungsberechtigten
        </h1>
        <p className="mt-1 text-[#556987]">
          zur Bewerbung eines minderjährigen Kindes bei der Swibble UG
          (haftungsbeschränkt), Königstraße 30, 52064 Aachen
        </p>

        <h2 className="mt-7 text-sm font-bold uppercase tracking-wide text-[#B718EC]">
          1. Angaben zum Kind
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3">
          <Line label="Vorname" />
          <Line label="Nachname" />
          <Line label="Geburtsdatum" />
          <Line label="TikTok- / Instagram-Name (wie im Formular)" />
        </div>

        <h2 className="mt-7 text-sm font-bold uppercase tracking-wide text-[#B718EC]">
          2. Angaben zur erziehungsberechtigten Person
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3">
          <Line label="Vorname, Nachname" />
          <Line label="Telefon" />
          <div className="col-span-2">
            <Line label="Anschrift" />
          </div>
          <div className="col-span-2">
            <Line label="E-Mail (optional)" />
          </div>
        </div>

        <h2 className="mt-7 text-sm font-bold uppercase tracking-wide text-[#B718EC]">
          3. Erklärung
        </h2>
        <p className="mt-2">
          {GUARDIAN_DECLARATION_INTRO.replace("{roles}", "").replace(/:\s*\.$/, ":")}
        </p>
        <ul className="mt-2 space-y-1">
          {APPLICATION_ROLES.map((role) => (
            <li key={role.id} className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-[3px] border border-[#B718EC]" />
              {role.label}
            </li>
          ))}
        </ul>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          {GUARDIAN_DECLARATION_CLAUSES.map((clause) => (
            <li key={clause}>{clause}</li>
          ))}
        </ol>

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8">
          <Line label="Ort, Datum" />
          <Line label="Unterschrift erziehungsberechtigte Person" />
          <span />
          <Line label="Unterschrift des Kindes" />
        </div>

        <p className="mt-10 border-t border-[#F0E4F5] pt-3 text-center text-[11px] text-[#8a7791]">
          Swibble UG (haftungsbeschränkt) · Königstraße 30 · 52064 Aachen ·
          info@swibble.net · www.swibble.net
        </p>
      </article>
    </div>
  </>
);

EinverstaendnisPage.getLayout = (page: ReactElement) => page;

export default EinverstaendnisPage;
