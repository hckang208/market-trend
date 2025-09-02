import Head from 'next/head';
import '../styles/globals.css';
export default function App({ Component, pageProps }) {
  return (<>
  <Head>
    <title>Hansoll · Market Trend Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </Head>
  <Component {...pageProps} />
</>);

}
