import SEO from "@/components/SEO";

const Datenschutz = () => {
  return (
    <>
      <SEO
        title="Datenschutzerklärung – Swibble"
        description="Datenschutzerklärung der Swibble UG (haftungsbeschränkt): Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO."
        canonical="/datenschutz"
        noIndex={true}
      />
      <div className="w-full lg:px-44">
        <h1 className="m-auto text-center text-3xl font-bold text-[#b718ec]">
          Datenschutzerklärung
        </h1>

        <p className="mt-5 text-sm text-[#556987]">Stand: Juni 2026</p>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            1. Verantwortlicher
          </h4>
          <p>
            Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <br />
          <p>
            Swibble UG (haftungsbeschränkt)
            <br /> Königstraße 30
            <br /> 52064 Aachen
            <br /> Germany
          </p>
          <br />
          <p>
            Mail{" "}
            <a
              href="mailto:info@swibble.net"
              className="text-[#0000EE] underline"
            >
              info@swibble.net
            </a>
            <br />
            Telefon{" "}
            <a href="tel:491782632310" className="text-[#0000EE] underline">
              +49 178 2632310
            </a>
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            2. Allgemeines zur Datenverarbeitung
          </h4>
          <p>
            Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich
            nur, soweit dies zur Bereitstellung einer funktionsfähigen Website
            sowie unserer Inhalte und Leistungen erforderlich ist. Die
            Verarbeitung personenbezogener Daten erfolgt regelmäßig nur nach
            Einwilligung des Nutzers oder wenn eine Rechtsgrundlage dies gestattet
            (insbesondere Art. 6 DSGVO).
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            3. Hosting (Vercel)
          </h4>
          <p>
            Unsere Website wird bei der Vercel Inc., 340 S Lemon Ave #4133,
            Walnut, CA 91789, USA, gehostet. Wenn Sie unsere Website besuchen,
            erfasst Vercel als Auftragsverarbeiter automatisch technische
            Zugriffsdaten (z. B. IP-Adresse, Datum und Uhrzeit des Zugriffs,
            abgerufene Seite, übertragene Datenmenge, Browsertyp und
            Betriebssystem), die zur Auslieferung und Absicherung der Website
            erforderlich sind.
          </p>
          <br />
          <p>
            Rechtsgrundlage ist unser berechtigtes Interesse an einer sicheren und
            effizienten Bereitstellung der Website (Art. 6 Abs. 1 lit. f DSGVO).
            Mit Vercel besteht ein Auftragsverarbeitungsvertrag. Soweit Daten in
            die USA übertragen werden, stützt sich diese auf geeignete Garantien
            (Standardvertragsklauseln bzw. EU-US Data Privacy Framework).
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            4. Server-Logfiles
          </h4>
          <p>
            Beim Aufrufen der Website werden automatisch Informationen in
            sogenannten Server-Logfiles verarbeitet, die Ihr Browser übermittelt.
            Diese Daten sind technisch erforderlich, um Ihnen die Website
            anzuzeigen und die Stabilität und Sicherheit zu gewährleisten
            (Art. 6 Abs. 1 lit. f DSGVO). Eine Zusammenführung dieser Daten mit
            anderen Datenquellen oder eine Auswertung zu Werbe- oder
            Analysezwecken findet nicht statt.
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            5. Kontaktformular und Kontaktaufnahme
          </h4>
          <p>
            Wenn Sie uns über das Kontaktformular oder per E-Mail kontaktieren,
            werden die von Ihnen angegebenen Daten (Ihre E-Mail-Adresse,
            optional Ihre Telefonnummer sowie Ihre Nachricht) verarbeitet, um Ihre
            Anfrage zu bearbeiten und zu beantworten. Diese Daten werden per
            E-Mail an uns übermittelt und gespeichert.
          </p>
          <br />
          <p>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung
            vorvertraglicher Maßnahmen) bzw. unser berechtigtes Interesse an der
            Beantwortung Ihrer Anfrage (Art. 6 Abs. 1 lit. f DSGVO). Wir löschen
            die Daten, sobald sie für die Erreichung des Zwecks ihrer Erhebung
            nicht mehr erforderlich sind, sofern keine gesetzlichen
            Aufbewahrungspflichten entgegenstehen.
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            6. Spam-Schutz mit Cloudflare Turnstile
          </h4>
          <p>
            Zum Schutz unseres Kontaktformulars vor automatisierten Anfragen und
            Missbrauch (Spam, Bots) setzen wir „Turnstile" der Cloudflare, Inc.,
            101 Townsend St, San Francisco, CA 94107, USA, ein. Turnstile prüft,
            ob die Eingabe durch einen Menschen erfolgt. Hierbei können technische
            Informationen (z. B. IP-Adresse, Browserinformationen) an Cloudflare
            übermittelt werden. Turnstile ist auf Datensparsamkeit ausgelegt und
            verwendet nach Angaben des Anbieters keine Cookies zu Tracking- oder
            Werbezwecken.
          </p>
          <br />
          <p>
            Rechtsgrundlage ist unser berechtigtes Interesse an der Sicherheit
            unserer Website und der Abwehr von Missbrauch (Art. 6 Abs. 1 lit. f
            DSGVO). Weitere Informationen finden Sie in der Datenschutzerklärung
            von Cloudflare:{" "}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0000EE] underline"
            >
              cloudflare.com/privacypolicy
            </a>
            .
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            7. Cookies
          </h4>
          <p>
            Wir verwenden auf unserer Website keine Cookies zu Analyse-, Tracking-
            oder Marketingzwecken. Lediglich für den passwortgeschützten
            Administrationsbereich (CMS) wird nach einem Login ein technisch
            notwendiges Sitzungs-Cookie gesetzt, um die angemeldete Sitzung
            aufrechtzuerhalten. Dieses Cookie betrifft ausschließlich angemeldete
            Administratoren und nicht normale Besucher der Website.
          </p>
          <br />
          <p>
            Da es sich um ein unbedingt erforderliches Cookie zur Bereitstellung
            einer ausdrücklich angeforderten Funktion handelt, ist hierfür keine
            Einwilligung erforderlich (§ 25 Abs. 2 TDDDG, Art. 6 Abs. 1 lit. f
            DSGVO).
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            8. Schriftarten
          </h4>
          <p>
            Zur einheitlichen Darstellung von Schriftarten verwenden wir
            selbstgehostete Schriftarten (Google Fonts werden lokal eingebunden).
            Beim Aufruf unserer Seiten wird daher keine Verbindung zu Servern von
            Google hergestellt und es werden keine personenbezogenen Daten an
            Google übermittelt.
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            9. SSL- bzw. TLS-Verschlüsselung
          </h4>
          <p>
            Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der
            Übertragung vertraulicher Inhalte eine SSL- bzw.
            TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie
            daran, dass die Adresszeile des Browsers von „http://" auf
            „https://" wechselt.
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            10. Ihre Rechte als betroffene Person
          </h4>
          <p>Ihnen stehen hinsichtlich Ihrer personenbezogenen Daten zu:</p>
          <ul className="mt-2 list-disc pl-6">
            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Recht auf Widerspruch (Art. 21 DSGVO)</li>
            <li>
              Recht auf Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3
              DSGVO)
            </li>
          </ul>
          <br />
          <p>
            Zur Ausübung Ihrer Rechte genügt eine formlose Mitteilung an die oben
            genannten Kontaktdaten.
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            11. Beschwerderecht bei der Aufsichtsbehörde
          </h4>
          <p>
            Unbeschadet anderweitiger Rechtsbehelfe steht Ihnen ein
            Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu, wenn Sie
            der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten
            gegen die DSGVO verstößt. Die für uns zuständige Aufsichtsbehörde ist
            die Landesbeauftragte für Datenschutz und Informationsfreiheit
            Nordrhein-Westfalen.
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            12. Aktualität und Änderung dieser Datenschutzerklärung
          </h4>
          <p>
            Diese Datenschutzerklärung ist aktuell gültig. Durch die
            Weiterentwicklung unserer Website oder aufgrund geänderter
            gesetzlicher bzw. behördlicher Vorgaben kann es notwendig werden,
            diese Datenschutzerklärung anzupassen.
          </p>
        </div>
      </div>
    </>
  );
};

export default Datenschutz;
