import Head from "next/head";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css" rel="stylesheet" />
        <title>Market Trend Dashboard</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
