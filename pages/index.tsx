import type { GetStaticProps } from "next";
import Introduction from "@/components/Introduction";
import LandingPart from "@/components/LandingPart";
import Projects from "@/components/Projects";
import Tasks from "@/components/Tasks";
import ListOfCompanies from "@/components/ListOfCompanies";
import Nationwide from "@/components/Nationwide";
import ContactForm from "@/components/ContactForm";
import LatestPosts from "@/components/blog/LatestPosts";
import VideoCarousel from "@/components/videos/VideoCarousel";
import SEO from "@/components/SEO";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/jsonLd";
import { getAllPosts } from "@/lib/blog/posts";
import { getPublicVideos, getVideoSettings } from "@/lib/videos/videos";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import type { BlogPost } from "@/lib/blog/types";
import type { Video } from "@/lib/videos/types";

interface Props {
  latestPosts: BlogPost[];
  videos: Video[];
  soundEnabled: boolean;
}

export default function Home({ latestPosts, videos, soundEnabled }: Props) {
  return (
    <>
      <SEO
        title="Swibble – Social Media, Live-Events, Design & Software"
        description="Swibble ist deine Digitalagentur für Social Media, Live-Events, Design & Software – bundesweit im Einsatz. Jetzt kostenloses Erstgespräch sichern."
        canonical="/"
        jsonLd={[organizationJsonLd, webSiteJsonLd]}
      />
      {/* One article = one readable document for reader modes and screen readers. */}
      <article>
        <LandingPart />
        <Introduction />
        <Tasks />
        <Projects />
        <VideoCarousel videos={videos} soundEnabled={soundEnabled} />
        <ListOfCompanies />
        <Nationwide />
      </article>
      <LatestPosts posts={latestPosts} />
      <ContactForm />
    </>
  );
}

// Static + ISR: served from the CDN, rebuilt at most every 5 minutes. CMS changes
// trigger an immediate rebuild via revalidateHome() in the API routes.
const REVALIDATE_SECONDS = 300;

export const getStaticProps: GetStaticProps<Props> = async () => {
  if (!isFirebaseConfigured()) {
    return {
      props: { latestPosts: [], videos: [], soundEnabled: false },
      revalidate: REVALIDATE_SECONDS,
    };
  }

  const [posts, videos, settings] = await Promise.all([
    getAllPosts("newest"),
    getPublicVideos(),
    getVideoSettings(),
  ]);

  return {
    props: {
      latestPosts: posts.slice(0, 3),
      videos,
      soundEnabled: settings.soundEnabled,
    },
    revalidate: REVALIDATE_SECONDS,
  };
};
