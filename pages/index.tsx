import Head from 'next/head';
import dynamic from 'next/dynamic';

const SolanaMap = dynamic(() => import('../components/SolanaMap'), {
  ssr: false,
  loading: () => <div>Loading map...</div>
});

export default function Home() {
  return (
    <div>
      <Head>
        <title>Solana Nodes</title>
        <meta name="description" content="Map of Solana nodes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <SolanaMap />
      </main>
    </div>
  );
}
