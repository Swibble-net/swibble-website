import Introduction from "@/components/Introduction";
import LandingPart from "@/components/LandingPart";
import Projects from "@/components/Projects";
import Tasks from "@/components/Tasks";
import ListOfCompanies from "@/components/ListOfCompanies";
import ContactForm from "@/components/ContactForm";
import SEO from "@/components/SEO";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/jsonLd";

export default function Home() {
  return (
    <>
    {/* test */}
      <SEO
        title="Swibble – Digitalagentur aus Aachen"
        description="Swibble ist deine Digitalagentur aus Aachen. Wir helfen Unternehmen mit Web- & App-Entwicklung, UX/UI-Design, Beratung und Qualitätskontrolle, ihren nächsten digitalen Meilenstein zu erreichen. Jetzt kostenloses Erstgespräch buchen."
        canonical="/"
        jsonLd={[organizationJsonLd, webSiteJsonLd]}
      />
      <LandingPart />
      <Introduction />
      <Tasks />
      <Projects />
      <ListOfCompanies />
      <ContactForm />
    </>
  );
}
