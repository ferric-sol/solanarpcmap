import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import util from 'util';
import geoip from 'geoip-lite';
import { kv } from '@vercel/kv';

const execPromise = util.promisify(exec);

interface Node {
  ip: string;
  version: string;
  lat: number | null;
  lon: number | null;
  timestamp: string;
}

const CACHE_KEY = 'solana_nodes';
const CACHE_TTL = 60 * 5; // 5 minutes

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Node[]>
) {
  try {
    console.log('Fetching fresh data from solana gossip');
    const { stdout, stderr } = await execPromise('solana gossip -um');
    if (stderr) {
      console.error('stderr:', stderr);
      throw new Error(stderr);
    }

    const lines = stdout.split('\n').filter(line => line.trim() !== '');
    console.log(`Parsed ${lines.length} lines from solana gossip output`);

    const nodes: Node[] = lines.map(line => {
      const parts = line.split(/\s+/);
      const ip = parts[0];
      const version = parts[parts.length - 2]; // Version is the second-to-last item
      const geo = geoip.lookup(ip);
      return {
        ip,
        version,
        lat: geo ? geo.ll[0] : null,
        lon: geo ? geo.ll[1] : null,
        timestamp: new Date().toISOString(),
      };
    });

    console.log(`Processed ${nodes.length} nodes`);
    console.log('Sample node:', nodes[0]);

    // Store in KV with expiration
    await kv.set(CACHE_KEY, nodes, { ex: CACHE_TTL });

    res.status(200).json(nodes);
  } catch (error) {
    console.error('Error fetching Solana nodes:', error);
    res.status(500).json([]);
  }
}
