import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import util from 'util';
import geoip from 'geoip-lite';

const execPromise = util.promisify(exec);

interface Node {
  pubkey: string;
  gossip: string;
  tpu: string;
  rpc: string | null;
  version: string | null;
  lat: number;
  lon: number;
}

// Add this type declaration for geoip-lite
declare module 'geoip-lite' {
  export function lookup(ip: string): {
    ll: [number, number];
  } | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('Executing solana gossip command...');
    const { stdout, stderr } = await execPromise('solana gossip -um');
    
    if (stderr) {
      console.error('Error executing solana gossip command:', stderr);
      throw new Error('Failed to execute solana gossip command');
    }

    if (!stdout) {
      console.error('Solana gossip command returned empty output');
      throw new Error('Solana gossip command returned empty output');
    }

    console.log('Solana gossip command output:', stdout);

    const lines = stdout.trim().split('\n');
    console.log('Number of lines:', lines.length);

    const nodes = lines
      .filter((line: string) => line.trim() !== '' && !line.startsWith('Nodes:'))
      .map((line: string): Node | null => {
        console.log('Processing line:', line);
        const parts = line.split(/\s+/);
        if (parts.length < 4) {
          console.warn('Skipping invalid line:', line);
          return null;
        }
        const [ip, pubkey, gossipPort, tpuPort, ...rest] = parts;
        const version = rest.length > 0 ? rest.join(' ') : null;
        const gossip = `${ip}:${gossipPort}`;
        const tpu = `${ip}:${tpuPort}`;
        const geo = geoip.lookup(ip);
        return {
          pubkey,
          gossip,
          tpu,
          rpc: null,
          version: version === 'none' ? null : version,
          lat: geo?.ll[0] || 0,
          lon: geo?.ll[1] || 0,
        };
      })
      .filter((node): node is Node => node !== null);

    console.log(`Processed ${nodes.length} nodes`);
    res.status(200).json(nodes);
  } catch (error: unknown) {
    console.error('Error fetching Solana nodes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Solana nodes', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
