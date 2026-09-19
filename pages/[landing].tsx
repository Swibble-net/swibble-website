import type { GetStaticPaths, GetStaticProps } from "next";
import LandingPage from "@/components/landing/LandingPage";
import { getAllPosts } from "@/lib/blog/posts";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { LANDING_PAGES, getLandingPage } from "@/lib/landing";
import { resolveCaseStudies } from "@/lib/landing/caseStudies";
import type { BlogPost } from "@/lib/blog/types";
import type {
  LandingCaseStudy,
  LandingPageContent,
} from "@/lib/landing/types";

interface Props {
  page: LandingPageContent;
  caseStudies: LandingCaseStudy[];
}

export default function Landing({ page, caseStudies }: Props) {
  return <LandingPage page={page} caseStudies={caseStudies} />;
}

// Only the slugs registered in lib/landing exist; everything else stays a 404.
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: LANDING_PAGES.map(({ slug }) => ({ params: { landing: slug } })),
  fallback: false,
});

// Static + ISR like the home page, so CMS edits to a case study show up here too.
const REVALIDATE_SECONDS = 300;

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const page = getLandingPage(String(params?.landing));
  if (!page) return { notFound: true };

  let posts: BlogPost[] = [];
  if (page.proof.caseStudies.length > 0 && isFirebaseConfigured()) {
    // A failing CMS connection must never break a landing page; the static fallbacks take over.
    posts = await getAllPosts("newest").catch((error) => {
      console.error("[landing] getAllPosts", error);
      return [];
    });
  }

  return {
    props: {
      page,
      caseStudies: resolveCaseStudies(page.proof.caseStudies, posts),
    },
    revalidate: REVALIDATE_SECONDS,
  };
};
