import type { GetServerSideProps } from "next";
import Introduction from "@/components/Introduction";
import LandingPart from "@/components/LandingPart";
import Projects from "@/components/Projects";
import Tasks from "@/components/Tasks";
import ListOfCompanies from "@/components/ListOfCompanies";
import ContactForm from "@/components/ContactForm";
import LatestPosts from "@/components/blog/LatestPosts";
import SEO from "@/components/SEO";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/jsonLd";
import { getAllPosts } from "@/lib/blog/posts";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import type { BlogPost } from "@/lib/blog/types";

interface Props {
  latestPosts: BlogPost[];
}

export default function Home({ latestPosts }: Props) {
  return (
    <>
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
      <LatestPosts posts={latestPosts} />
      <ContactForm />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const latestPosts = isFirebaseConfigured()
    ? (await getAllPosts("newest")).slice(0, 3)
    : [];

  return { props: { latestPosts } };
};
