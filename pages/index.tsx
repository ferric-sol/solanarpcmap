import Head from 'next/head';
import dynamic from 'next/dynamic';

const SolanaMap = dynamic(() => import('../components/SolanaMap'), {
  ssr: false,
});

export default function Home() {
  return (
    <div>
      <Head>
        <title>Solana RPC Map</title>
        <meta name="description" content="Map of Solana RPC nodes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Solana RPC Map</h1>
        <SolanaMap />
      </main>
    </div>
  );
}
