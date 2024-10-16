import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import util from 'util';
import { kv } from '@vercel/kv';

const execPromise = util.promisify(exec);

interface Node {
  ip: string;
  version: string;
  lat: number | null;
  lon: number | null;
  timestamp: string;
}

interface GeoCache {
  [ip: string]: { lat: number | null; lon: number | null; timestamp: number };
}

interface CachedData {
  nodes: Node[];
  lastUpdated: string;
}

const NODES_CACHE_KEY = 'solana_nodes';
const GEO_CACHE_KEY = 'geo_cache';
const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

const isVercel = process.env.VERCEL === '1';

async function getGeoData(ip: string, geoCache: GeoCache) {
  if (geoCache[ip]) {
    return geoCache[ip];
  }

  if (!isVercel) {
    // Only import geoip-lite if we're not on Vercel
    const geoip = await import('geoip-lite');
    const geo = geoip.lookup(ip);
    const result = {
      lat: geo ? geo.ll[0] : null,
      lon: geo ? geo.ll[1] : null,
      timestamp: Date.now()
    };
    geoCache[ip] = result;
    return result;
  }

  return { lat: null, lon: null, timestamp: Date.now() };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CachedData>
) {
  try {
    const cachedData: CachedData | null = await kv.get(NODES_CACHE_KEY);
    const geoCache: GeoCache = await kv.get(GEO_CACHE_KEY) || {};

    const now = new Date();

    if (cachedData && (now.getTime() - new Date(cachedData.lastUpdated).getTime() < REFRESH_INTERVAL)) {
      // Use cached data if it's less than an hour old
      return res.status(200).json(cachedData);
    }

    console.log('Fetching fresh data from solana gossip');
    const { stdout, stderr } = await execPromise('solana gossip -um');
    if (stderr) {
      console.error('stderr:', stderr);
      throw new Error(stderr);
    }

    const lines = stdout.split('\n').filter(line => line.trim() !== '');
    console.log(`Parsed ${lines.length} lines from solana gossip output`);

    const nodes = await Promise.all(lines.map(async (line) => {
      const parts = line.split(/\s+/);
      const ip = parts[0];
      const version = parts[parts.length - 2]; // Version is the second-to-last item
      const { lat, lon } = await getGeoData(ip, geoCache);
      return {
        ip,
        version,
        lat,
        lon,
        timestamp: now.toISOString(),
      };
    }));

    console.log(`Processed ${nodes.length} nodes`);
    console.log('Sample node:', nodes[0]);

    const lastUpdated = now.toISOString();
    const newCachedData: CachedData = { nodes, lastUpdated };

    // Store nodes and updated geo cache in KV without expiration
    await kv.set(NODES_CACHE_KEY, newCachedData);
    await kv.set(GEO_CACHE_KEY, geoCache);

    res.status(200).json(newCachedData);
  } catch (error) {
    console.error('Error fetching Solana nodes:', error);
    // If there's an error, try to return the last cached data
    const cachedData: CachedData | null = await kv.get(NODES_CACHE_KEY);
    if (cachedData) {
      res.status(200).json(cachedData);
    } else {
      res.status(500).json({ nodes: [], lastUpdated: new Date().toISOString() });
    }
  }
}
