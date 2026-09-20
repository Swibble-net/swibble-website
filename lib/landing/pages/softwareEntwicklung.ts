import type { LandingPageContent } from "@/lib/landing/types";

export const softwareEntwicklung: LandingPageContent = {
  slug: "software-entwicklung",
  seo: {
    title: "Software-Entwicklung: Websites, Web-Apps & Apps",
    description:
      "Individuelle Software-Entwicklung aus Aachen: Swibble baut Websites, Web-Apps und mobile Apps inklusive Design und Qualitätssicherung. Kostenloses Erstgespräch.",
  },
  og: {
    kicker: "Software-Entwicklung",
    title: "Websites, Web-Apps & Apps",
  },
  service: {
    name: "Software-Entwicklung",
    serviceType: "Individuelle Software-Entwicklung",
    description:
      "Entwicklung individueller Websites, Web-Apps und mobiler Apps inklusive UX/UI-Design und Qualitätssicherung.",
  },
  hero: {
    kicker: "Websites · Web-Apps · Apps",
    title: "Die Idee steht – aber dir fehlt das Team für die Software-Entwicklung?",
    text: "Swibble entwickelt individuelle Websites, Web-Apps und mobile Apps: von der ersten Skizze über Design und Programmierung bis zum getesteten Release. Alles aus einem Haus statt von drei verschiedenen Dienstleistern.",
    visual: "software",
    visualAlt:
      "Illustration: Code-Editor und Smartphone mit App, daneben die Stichworte Website, Web-App und Getestet",
  },
  proof: {
    title: "Software, die wir entwickelt haben",
    text: "Von der Stadt-App bis zur Web-App: eine Auswahl aus dem Swibble-Portfolio.",
    caseStudies: [],
    references: [
      {
        kicker: "App & Website",
        title: "Aachen App",
        image: "aachenApp",
        imageAlt: "Aachen App mit Event-Übersicht auf einem Smartphone",
      },
      {
        kicker: "Web-App",
        title: "Little World",
        image: "littleWorld",
        imageAlt: "Laptop mit der Anmeldeseite der Web-App Little World",
      },
      {
        kicker: "App",
        title: "RydeUp",
        image: "rydeUp",
        imageAlt: "RydeUp-App auf dem Smartphone eines Radfahrers",
      },
      {
        kicker: "Qualitätssicherung",
        title: "Square",
        image: "square",
        imageAlt: "Projektbild zur Qualitätssicherung für Square",
      },
    ],
  },
  services: {
    title: "Was wir entwickeln",
    intro: "Maßgeschneidert statt Baukasten – passend zu deinen Abläufen.",
    items: [
      {
        title: "Websites",
        icon: "website",
        text: "Schnelle, suchmaschinenfreundliche Unternehmenswebsites, die auf jedem Gerät funktionieren und zu deiner Marke passen.",
      },
      {
        title: "Web-Apps",
        icon: "webapp",
        text: "Portale, Plattformen und interne Tools, die im Browser laufen und genau das abbilden, was dein Unternehmen braucht.",
      },
      {
        title: "Mobile Apps",
        icon: "mobile",
        text: "Apps für Smartphone und Tablet – vom ersten Prototyp bis zur Veröffentlichung.",
      },
      {
        title: "Design inklusive",
        icon: "design",
        text: "UX/UI-Design kommt bei uns aus demselben Haus. So passt die Oberfläche von Anfang an zur Technik.",
      },
      {
        title: "Qualitätssicherung",
        icon: "qa",
        text: "Wir testen jede Funktion, bevor sie live geht – und übernehmen Qualitätssicherung auch für Software, die nicht von uns stammt.",
      },
    ],
  },
  process: {
    title: "So läuft ein Software-Projekt ab",
    intro: "Drei Schritte von der Idee zur laufenden Anwendung.",
    steps: [
      {
        title: "Erstgespräch",
        text: "Du beschreibst dein Vorhaben, wir stellen die richtigen Fragen: Wer nutzt die Software, und welches Problem löst sie?",
      },
      {
        title: "Konzept",
        text: "Wir definieren Funktionsumfang, Prioritäten und Design und empfehlen die passende technische Basis. Du erhältst ein Angebot mit klarem Umfang.",
      },
      {
        title: "Umsetzung",
        text: "Wir entwickeln in Etappen, zeigen dir regelmäßig den Stand und testen gründlich. Am Ende steht ein Release, das du guten Gewissens veröffentlichen kannst.",
      },
    ],
  },
  faq: [
    {
      question: "Welche Software entwickelt Swibble?",
      answer:
        "Individuelle Websites, Web-Apps und mobile Apps. In unserem Portfolio findest du zum Beispiel die Aachen App, die Web-App Little World und die App RydeUp.",
    },
    {
      question: "Website, Web-App oder App – was brauche ich?",
      answer:
        "Eine Website informiert, eine Web-App lässt Nutzer im Browser etwas erledigen, und eine mobile App lohnt sich, wenn dein Angebot regelmäßig auf dem Smartphone genutzt wird. Was zu deinem Vorhaben passt, klären wir im Erstgespräch.",
    },
    {
      question: "Was kostet individuelle Software-Entwicklung?",
      answer:
        "Das hängt vom Funktionsumfang ab. Deshalb legen wir im Konzept gemeinsam fest, was in die erste Version gehört. Danach bekommst du ein Angebot mit klar beschriebenem Umfang.",
    },
    {
      question: "Wie lange dauert die Entwicklung?",
      answer:
        "Eine Website ist schneller fertig als eine Plattform mit vielen Funktionen. Einen realistischen Zeitplan erhältst du zusammen mit dem Konzept – vorher wäre jede Zahl geraten.",
    },
    {
      question: "Können wir mit einer kleinen ersten Version starten?",
      answer:
        "Ja, das empfehlen wir oft. Eine erste Version mit den wichtigsten Funktionen ist schneller bei deinen Nutzern, und ihr Feedback zeigt, was als Nächstes wirklich gebraucht wird.",
    },
    {
      question: "Übernehmt ihr auch nur die Qualitätssicherung?",
      answer:
        "Ja. Qualitätssicherung bieten wir auch als eigene Leistung an – für Square haben wir genau das übernommen.",
    },
  ],
  closing: {
    title: "Erzähl uns von deinem Vorhaben",
    text: "Im kostenlosen Erstgespräch bekommst du eine erste Einschätzung zu Machbarkeit, sinnvollem Umfang und den nächsten Schritten.",
  },
};
