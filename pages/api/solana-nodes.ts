import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import util from 'util';
import axios from 'axios';
import { kv } from '@vercel/kv';
import { setTimeout } from 'timers/promises';

const execPromise = util.promisify(exec);

interface Node {
  ip: string;
  version: string;
  lat: number | null;
  lon: number | null;
  timestamp: string;
}

interface GeoCache {
  [ip: string]: { lat: number; lon: number; timestamp: number };
}

const NODES_CACHE_KEY = 'solana_nodes';
const GEO_CACHE_KEY = 'geo_cache';
const CACHE_TTL = 60 * 5; // 5 minutes
const GEO_CACHE_TTL = 60 * 60 * 24 * 7; // 1 week
const API_DELAY = 100; // 100ms delay between API calls

async function getGeoData(ip: string, geoCache: GeoCache) {
  if (geoCache[ip] && Date.now() - geoCache[ip].timestamp < GEO_CACHE_TTL * 1000) {
    return geoCache[ip];
  }

  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    const result = {
      lat: response.data.lat,
      lon: response.data.lon,
      timestamp: Date.now()
    };
    geoCache[ip] = result;
    return result;
  } catch (error) {
    console.error(`Error fetching geo data for IP ${ip}:`, error);
    return { lat: null, lon: null, timestamp: Date.now() };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Node[]>
) {
  try {
    let nodes: Node[] | null = await kv.get(NODES_CACHE_KEY);
    let geoCache: GeoCache = await kv.get(GEO_CACHE_KEY) || {};

    if (!nodes) {
      console.log('Fetching fresh data from solana gossip');
      const { stdout, stderr } = await execPromise('solana gossip -um');
      if (stderr) {
        console.error('stderr:', stderr);
        throw new Error(stderr);
      }

      const lines = stdout.split('\n').filter(line => line.trim() !== '');
      console.log(`Parsed ${lines.length} lines from solana gossip output`);

      nodes = await Promise.all(lines.map(async (line, index) => {
        // Add delay between processing each node
        await setTimeout(API_DELAY * index);

        const parts = line.split(/\s+/);
        const ip = parts[0];
        const version = parts[parts.length - 2]; // Version is the second-to-last item
        const { lat, lon } = await getGeoData(ip, geoCache);
        return {
          ip,
          version,
          lat,
          lon,
          timestamp: new Date().toISOString(),
        };
      }));

      console.log(`Processed ${nodes.length} nodes`);
      console.log('Sample node:', nodes[0]);

      // Store nodes and updated geo cache in KV with expiration
      await kv.set(NODES_CACHE_KEY, nodes, { ex: CACHE_TTL });
      await kv.set(GEO_CACHE_KEY, geoCache, { ex: GEO_CACHE_TTL });
    }

    res.status(200).json(nodes);
  } catch (error) {
    console.error('Error fetching Solana nodes:', error);
    res.status(500).json([]);
  }
}
