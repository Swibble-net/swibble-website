import type { ReactElement, ReactNode } from "react";
import type { NextPage } from "next";
import type { AppProps } from "next/app";
import Layout from "@/components/Layout/Layout";
import "@/styles/globals.css";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  style: ["normal"],
});

export type NextPageWithLayout<P = object> = NextPage<P> & {
  /** Return a custom wrapper; omit to use the default site Layout. */
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout =
    Component.getLayout ?? ((page) => <Layout>{page}</Layout>);

  return (
    <main className={poppins.className}>
      {getLayout(<Component {...pageProps} />)}
    </main>
  );
}
