import '../styles/globals.css';
import Head from 'next/head';
export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>부자재구매현황 DASHBOARD (SAMPLE DATA)</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
