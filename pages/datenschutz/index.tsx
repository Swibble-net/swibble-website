import Link from "next/link";
import SEO from "@/components/SEO";
import { ADULT_AGE } from "@/lib/applications/config";

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

        <p className="mt-5 text-sm text-[#556987]">Stand: September 2026</p>

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
          <br />
          <p>
            Zur Reichweitenmessung nutzen wir „Vercel Web Analytics“. Der Dienst
            arbeitet ohne Cookies und ohne geräteübergreifende Wiedererkennung;
            Seitenaufrufe werden nur in aggregierter, anonymisierter Form
            ausgewertet (z. B. aufgerufene Seite, Referrer, Land, Browser- und
            Gerätetyp). Rechtsgrundlage ist unser berechtigtes Interesse an der
            statistischen Analyse und Verbesserung unseres Angebots (Art. 6
            Abs. 1 lit. f DSGVO).
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
            optional Ihr Name, Ihr Unternehmen, Ihr Ort, Ihre Telefonnummer und Ihre
            Nachricht sowie Ihre Angaben zum Vorhaben: gewünschte Leistungen,
            Ziel, Budgetrahmen und Startzeitraum) verarbeitet, um Ihre
            Anfrage zu bearbeiten und zu beantworten. Diese Daten werden per
            E-Mail an uns übermittelt und gespeichert. Nach dem Absenden des
            Kontaktformulars erhalten Sie an die angegebene E-Mail-Adresse
            automatisch eine Bestätigung mit einer Zusammenfassung Ihrer Angaben.
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
            Missbrauch (Spam, Bots) setzen wir „Turnstile“ der Cloudflare, Inc.,
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
            7. Videos
          </h4>
          <p>
            Auf unserer Startseite zeigen wir Videos. Eigene Videos liefern wir
            als Datei über Google Firebase Storage (Google Ireland Limited,
            Gordon House, Barrow Street, Dublin 4, Irland) aus; dabei wird wie
            bei jedem Abruf Ihre IP-Adresse technisch verarbeitet.
          </p>
          <br />
          <p>
            Einzelne Videos sind über die Player von YouTube (Google Ireland
            Limited, im erweiterten Datenschutzmodus über
            „youtube-nocookie.com“), Vimeo (Vimeo.com, Inc., 330 West 34th
            Street, New York, NY 10001, USA) oder TikTok (TikTok Technology
            Limited, 10 Earlsfort Terrace, Dublin, D02 T380, Irland)
            eingebunden. Der jeweilige Player wird erst geladen, wenn das Video
            in den sichtbaren Bereich kommt. Dabei erhält der Anbieter Ihre
            IP-Adresse und technische Informationen zu Browser und Gerät und
            kann eigene Cookies oder vergleichbare Technologien einsetzen; eine
            Übermittlung in Drittländer (insbesondere die USA) ist möglich. Die
            Vorschaubilder der Videos liefern wir selbst aus.
          </p>
          <br />
          <p>
            Rechtsgrundlage ist unser berechtigtes Interesse an einer
            ansprechenden Darstellung unserer Arbeit (Art. 6 Abs. 1 lit. f
            DSGVO). Weitere Informationen finden Sie in den
            Datenschutzhinweisen der Anbieter.
          </p>
        </div>

        <div className="my-5 scroll-mt-32" id="bewerbungen">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            8. Bewerbungen für Videos, Promotion und Modeltätigkeit
          </h4>
          <p>
            Über unser Bewerbungsformular (
            <Link href="/bewerben" className="text-[#0000EE] underline">
              swibble.net/bewerben
            </Link>
            ) können Sie sich dafür bewerben, in unseren Social-Media-Videos
            mitzuwirken oder für uns als Promoter:in, Model oder in der
            Kamerabedienung tätig zu werden.
            Dabei verarbeiten wir folgende Daten: Vor- und Nachname,
            Geburtsdatum, Postleitzahl und Wohnort, E-Mail-Adresse,
            Handynummer, die freiwillig angegebenen Social-Media-Profilnamen
            (TikTok, Instagram, Snapchat, YouTube), die gewählte Tätigkeit, das
            Einkaufszentrum, über dessen Linkseite Sie zu uns gekommen sind,
            Ihren optionalen Freitext, freiwillig hochgeladene Fotos von Ihnen
            sowie Zeitpunkt und Wortlaut Ihrer Einwilligungen.
          </p>
          <br />
          <p>
            <strong>Zweck und Rechtsgrundlage:</strong> Wir verarbeiten diese
            Daten, um Ihre Bewerbung zu prüfen, Sie in unseren Bewerberpool
            aufzunehmen und Sie für aktuelle sowie spätere Videos und Aktionen
            anzufragen. Die Aufnahme in den Bewerberpool und die
            Kontaktaufnahme per E-Mail, Telefon/WhatsApp und über die
            angegebenen Social-Media-Profile erfolgen auf Grundlage Ihrer
            Einwilligung (Art. 6 Abs. 1 lit. a DSGVO); soweit die Verarbeitung
            der Anbahnung einer konkreten Zusammenarbeit dient, zusätzlich auf
            Grundlage von Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen
            auf Ihre Anfrage). Wenn wir Sie über WhatsApp, TikTok oder
            Instagram kontaktieren, gelten zusätzlich die
            Datenschutzbestimmungen der jeweiligen Anbieter.
          </p>
          <br />
          <p>
            <strong>Minderjährige:</strong> Eine Altersuntergrenze für
            Bewerbungen besteht nicht. Bewerben sich Personen unter{" "}
            {ADULT_AGE} Jahren, benötigen wir das Einverständnis einer
            erziehungsberechtigten Person – sowohl mit der Bewerbung selbst als
            auch mit der Verarbeitung der Daten des Kindes im Bewerberpool.
            Dazu erheben wir zusätzlich deren Namen und Telefonnummer oder
            E-Mail-Adresse sowie eine unterschriebene Einverständniserklärung
            – wahlweise online ausgefüllt und mit Finger oder Maus
            unterschrieben (wir speichern dann den Erklärungstext, das
            Unterschriftsbild und den Zeitpunkt) oder als hochgeladene Datei
            (Foto oder PDF des Papierformulars). Diese Datei wird nicht
            öffentlich zugänglich gespeichert und ist nur für die mit der
            Bearbeitung betrauten Personen bei uns abrufbar. Rechtsgrundlage
            ist die Einwilligung der Erziehungsberechtigten (Art. 6 Abs. 1
            lit. a, Art. 8 DSGVO).
          </p>
          <br />
          <p>
            <strong>Veröffentlichung von Aufnahmen:</strong> Mit der Bewerbung
            willigen Sie – bei Minderjährigen zusätzlich die
            Erziehungsberechtigten – darin ein, dass Foto-, Video- und
            Tonaufnahmen, die im Rahmen einer späteren Zusammenarbeit
            entstehen, von uns und den jeweiligen Auftraggebern (z. B. dem
            Einkaufszentrum) zeitlich und räumlich unbegrenzt veröffentlicht
            und für Marketing- und Werbezwecke genutzt werden dürfen,
            insbesondere auf TikTok, Instagram, YouTube, Websites und in
            Anzeigen. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1
            lit. a DSGVO, § 22 KUG) bzw. die mit Ihnen getroffene Vereinbarung
            (Art. 6 Abs. 1 lit. b DSGVO). Bereits veröffentlichte Inhalte
            müssen nicht zurückgerufen werden; ein Widerruf ist nur aus
            wichtigem Grund und mit Wirkung für die Zukunft möglich. Die bloße
            Bewerbung führt noch nicht zu Aufnahmen oder Veröffentlichungen.
          </p>
          <br />
          <p>
            <strong>Speicherort und Empfänger:</strong> Die Bewerbungsdaten und
            hochgeladenen Dateien speichern wir bei Google Firebase (Cloud
            Firestore und Cloud Storage; Google Ireland Limited, Gordon House,
            Barrow Street, Dublin 4, Irland) als Auftragsverarbeiter. Eine
            Übermittlung in Drittländer (insbesondere die USA) kann dabei nicht
            ausgeschlossen werden; sie erfolgt auf Grundlage des EU-U.S. Data
            Privacy Framework bzw. von Standardvertragsklauseln. Bei Eingang
            einer Bewerbung erhalten wir intern eine Benachrichtigung per
            E-Mail, die lediglich Namen, gewählte Tätigkeit und das
            Einkaufszentrum enthält. Eine Weitergabe Ihrer Bewerbungsdaten an
            Dritte – auch an die Betreiber der Einkaufszentren – erfolgt nicht
            ohne Ihre gesonderte Zustimmung. Das Formular ist durch Cloudflare
            Turnstile vor Missbrauch geschützt (siehe Abschnitt 6).
          </p>
          <br />
          <p>
            <strong>Speicherdauer:</strong> Wir speichern Ihre Bewerbungsdaten
            einschließlich hochgeladener Dateien in unserem Bewerberpool bis
            zum Widerruf Ihrer Einwilligung bzw. bis zu einer Löschanfrage.
            Nach einem Widerruf oder einer Löschanfrage löschen wir die Daten
            unverzüglich, soweit keine gesetzlichen Aufbewahrungspflichten
            entgegenstehen. Kommt eine Zusammenarbeit zustande, verarbeiten wir
            die dafür erforderlichen Daten zu deren Durchführung weiter.
          </p>
          <br />
          <p>
            <strong>Widerruf und Löschung:</strong> Sie können Ihre
            Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen und
            die Löschung Ihrer Bewerbung verlangen – formlos per E-Mail an{" "}
            <a
              href="mailto:info@swibble.net"
              className="text-[#0000EE] underline"
            >
              info@swibble.net
            </a>
            . Bei Minderjährigen können dies auch die Erziehungsberechtigten
            verlangen. Die Bereitstellung der Daten ist freiwillig; ohne die
            Pflichtangaben können wir eine Bewerbung jedoch nicht
            berücksichtigen.
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            9. Cookies
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
            10. Schriftarten
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
            11. SSL- bzw. TLS-Verschlüsselung
          </h4>
          <p>
            Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der
            Übertragung vertraulicher Inhalte eine SSL- bzw.
            TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie
            daran, dass die Adresszeile des Browsers von „http://“ auf
            „https://“ wechselt.
          </p>
        </div>

        <div className="my-5">
          <h4 className="mt-[0.6rem] mb-[0.4rem] text-base font-bold">
            12. Ihre Rechte als betroffene Person
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
            13. Beschwerderecht bei der Aufsichtsbehörde
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
            14. Aktualität und Änderung dieser Datenschutzerklärung
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
