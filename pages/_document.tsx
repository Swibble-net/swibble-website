import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="de">
      <Head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#B718EC" />
        <meta name="author" content="Swibble UG (haftungsbeschränkt)" />
        <meta name="publisher" content="Swibble UG" />
        <meta name="copyright" content="Swibble UG (haftungsbeschränkt)" />
        <meta name="category" content="Digitalagentur, Social Media, Live-Events, Design, Software-Entwicklung" />
        <meta name="application-name" content="Swibble" />
        <meta name="apple-mobile-web-app-title" content="Swibble" />
        {/* Safari ignores SVG favicons, so ICO/PNG come first. */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest" />
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="LLM-readable site summary"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
