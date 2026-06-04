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
        <meta name="category" content="Digitalagentur, Webentwicklung, App-Entwicklung, Design" />
        <link rel="icon" href="/logo/SwibbleLogo.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/logo/SwibbleLogo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo/SwibbleLogo.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
