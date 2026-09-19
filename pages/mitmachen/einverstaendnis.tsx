import type { ReactElement } from "react";
import type { NextPageWithLayout } from "@/pages/_app";
import SEO from "@/components/SEO";
import {
  APPLICATION_ROLES,
  CONSENT_TEMPLATE_IS_DRAFT,
} from "@/lib/applications/config";

// Printable parental consent template ("Muttizettel"). Plain HTML so the
// wording can be changed here after legal review — no PDF to regenerate.

const Line = ({ label }: { label: string }) => (
  <div className="flex flex-col">
    <span className="h-8 border-b border-black" />
    <span className="mt-1 text-[11px] text-neutral-600">{label}</span>
  </div>
);

const EinverstaendnisPage: NextPageWithLayout = () => (
  <>
    <SEO
      title="Einverständniserklärung der Eltern"
      description="Vorlage für die Einverständniserklärung der Erziehungsberechtigten zur Bewerbung bei Swibble."
      canonical="/mitmachen/einverstaendnis"
      noIndex
    />

    <div className="min-h-screen bg-neutral-100 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-neutral-600">
          Ausdrucken, ausfüllen, unterschreiben lassen – dann ein Foto davon im
          Formular hochladen. Kein Drucker? Schreibt den Text einfach von Hand ab.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-[#B718EC] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a514d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
        >
          Drucken / als PDF speichern
        </button>
      </div>

      <article className="relative mx-auto max-w-[210mm] bg-white p-8 text-[13px] leading-relaxed text-black shadow print:max-w-none print:p-0 print:shadow-none sm:p-12">
        {CONSENT_TEMPLATE_IS_DRAFT && (
          <p className="mb-6 border-2 border-red-600 p-3 text-center text-sm font-bold uppercase tracking-wide text-red-600">
            Entwurf – noch nicht rechtlich geprüft
          </p>
        )}

        <h1 className="text-xl font-bold">
          Einverständniserklärung der Erziehungsberechtigten
        </h1>
        <p className="mt-1 text-neutral-700">
          zur Bewerbung eines minderjährigen Kindes bei der Swibble UG
          (haftungsbeschränkt), Königstraße 30, 52064 Aachen
        </p>

        <h2 className="mt-7 text-sm font-bold uppercase tracking-wide">
          1. Angaben zum Kind
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3">
          <Line label="Vorname" />
          <Line label="Nachname" />
          <Line label="Geburtsdatum" />
          <Line label="TikTok- / Instagram-Name (wie im Formular)" />
        </div>

        <h2 className="mt-7 text-sm font-bold uppercase tracking-wide">
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

        <h2 className="mt-7 text-sm font-bold uppercase tracking-wide">
          3. Erklärung
        </h2>
        <p className="mt-2">
          Ich bin / Wir sind für das oben genannte Kind sorgeberechtigt. Ich
          bin / Wir sind damit einverstanden, dass sich mein / unser Kind bei
          Swibble bewirbt für:
        </p>
        <ul className="mt-2 space-y-1">
          {APPLICATION_ROLES.map((role) => (
            <li key={role.id} className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 border border-black" />
              {role.label}
            </li>
          ))}
        </ul>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Ich bin / Wir sind damit einverstanden, dass Swibble die im
            Bewerbungsformular angegebenen Daten meines / unseres Kindes sowie
            meine / unsere oben genannten Kontaktdaten zur Bearbeitung der
            Bewerbung verarbeitet und mein / unser Kind sowie mich / uns dazu
            per E-Mail, Telefon/WhatsApp und über die angegebenen
            Social-Media-Profile kontaktiert.
          </li>
          <li>
            Diese Erklärung betrifft ausschließlich die Bewerbung. Über eine
            konkrete Mitwirkung (z. B. Drehtermine, Einsätze, Vergütung) sowie
            über die Anfertigung und Veröffentlichung von Foto- und
            Videoaufnahmen wird vorab eine gesonderte schriftliche Vereinbarung
            mit mir / uns getroffen.
          </li>
          <li>
            Diese Einwilligung ist freiwillig und kann jederzeit mit Wirkung
            für die Zukunft widerrufen werden, z. B. per E-Mail an
            info@swibble.net. In diesem Fall löscht Swibble die
            Bewerbungsdaten. Die Datenschutzhinweise unter
            www.swibble.net/datenschutz habe ich / haben wir zur Kenntnis
            genommen.
          </li>
        </ol>

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8">
          <Line label="Ort, Datum" />
          <Line label="Unterschrift erziehungsberechtigte Person" />
          <span />
          <Line label="Unterschrift des Kindes" />
        </div>

        <p className="mt-8 text-[11px] text-neutral-600">
          Bei gemeinsamem Sorgerecht versichert die unterzeichnende Person, im
          Einvernehmen mit dem anderen Elternteil zu handeln.
        </p>
      </article>
    </div>
  </>
);

EinverstaendnisPage.getLayout = (page: ReactElement) => page;

export default EinverstaendnisPage;
