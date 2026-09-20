import type { ReactElement } from "react";
import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Image from "next/image";
import LandingVisual from "@/components/landing/LandingVisual";
import { LANDING_PAGES, getLandingPage } from "@/lib/landing";
import type { LandingVisualKey } from "@/lib/landing/types";
import type { NextPageWithLayout } from "@/pages/_app";
import Logo from "@/public/logo/SwibbleLogo.svg";
import Wordmark from "@/public/logo/SwibbleWordmark.svg";

// Source of the share images in public/og: a 1200 × 630 canvas that
// scripts/build-og-images.mjs screenshots. The route only exists while OG_PREVIEW=1
// is set (local use); production builds generate no paths, so it is a 404 there.
interface Props {
  title: string;
  kicker: string;
  visual: LandingVisualKey;
}

const OgPreview: NextPageWithLayout<Props> = ({ title, kicker, visual }) => (
  <>
    <Head>
      <meta name="robots" content="noindex, nofollow" />
      {/* Hide the Next.js dev indicator in the screenshot. */}
      <style>{"nextjs-portal{display:none!important}body{margin:0;overflow:hidden}"}</style>
    </Head>
    <div className="relative flex h-[630px] w-[1200px] items-center overflow-hidden bg-[#FDF5FF]">
      <span className="absolute -right-40 -top-56 h-[560px] w-[560px] rounded-full bg-[#F3D9FF]" />
      <span className="absolute -bottom-72 right-24 h-[520px] w-[520px] rounded-full bg-[#EADCF7]" />
      <div className="relative flex w-[640px] flex-col pl-20">
        <span className="flex items-center gap-4">
          <Image src={Logo} alt="" width={64} height={64} unoptimized />
          <Image src={Wordmark} alt="" width={210} height={58} unoptimized />
        </span>
        <p className="mt-12 text-[22px] font-medium uppercase tracking-[0.12em] text-[#8A1FD6]">
          {kicker}
        </p>
        <p className="mt-4 text-[54px] font-bold leading-[1.12] text-[#000D36]">
          {title}
        </p>
        <span className="mt-10 w-fit rounded-2xl bg-[#B718EC] px-10 py-4 text-[26px] font-medium text-white">
          swibble.net
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center pr-10">
        <div className={visual === "map" ? "w-[540px]" : "w-[470px]"}>
          <LandingVisual visual={visual} alt="" />
        </div>
      </div>
    </div>
  </>
);

// No site header or footer around the canvas.
OgPreview.getLayout = (page: ReactElement) => page;

const enabled = () => process.env.OG_PREVIEW === "1";

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: enabled()
    ? LANDING_PAGES.map(({ slug }) => ({ params: { landing: slug } }))
    : [],
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const page = enabled() ? getLandingPage(String(params?.landing)) : undefined;
  if (!page) return { notFound: true };
  return {
    props: {
      title: page.og.title,
      kicker: page.og.kicker,
      visual: page.hero.visual,
    },
  };
};

export default OgPreview;
