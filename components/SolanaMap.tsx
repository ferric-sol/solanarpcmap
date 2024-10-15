import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Node {
  ip: string;
  version: string;
  lat: number | null;
  lon: number | null;
  timestamp: string;
}

const SolanaMap = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/solana-nodes');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Node[] = await response.json();
        setNodes(data);
      } catch (error) {
        console.error('Error fetching nodes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNodes();
  }, []);

  const validNodes = nodes.filter(node => node.lat !== null && node.lon !== null);

  // Group nodes by location
  const groupedNodes = validNodes.reduce((acc, node) => {
    const key = `${Math.round(node.lat! * 10) / 10},${Math.round(node.lon! * 10) / 10}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(node);
    return acc;
  }, {} as Record<string, Node[]>);

  // Filter and sort grouped nodes
  const significantClusters = Object.entries(groupedNodes)
    .filter(entry => entry[1].length >= 5)
    .sort((a, b) => b[1].length - a[1].length);

  // Sort nodes by timestamp and get the 10 most recent
  const recentNodes = [...nodes]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return (
    <div className="container mx-auto px-4 py-8 bg-gradient-to-br from-pink-100 to-blue-100 min-h-screen flex flex-col">
      <h1 className="text-5xl font-bold mb-8 text-center text-indigo-600">Solana RPC Map</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-[600px]">
          <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32"></div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-lg rounded-xl p-8 mb-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <p className="text-4xl font-bold text-pink-400">{nodes.length}</p>
                <p className="text-xl text-gray-600 mt-2">Total Nodes</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-400">{validNodes.length}</p>
                <p className="text-xl text-gray-600 mt-2">Nodes with Valid Coordinates</p>
              </div>
            </div>
          </div>
          <div className="h-[600px] w-full rounded-xl overflow-hidden shadow-2xl flex-grow mb-8">
            <MapContainer center={[20, 0] as LatLngExpression} zoom={3} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {significantClusters.map(([key, groupNodes]) => {
                const [lat, lon] = key.split(',').map(Number);
                const count = groupNodes.length;
                const radius = Math.min(Math.log(count) * 3 + 5, 20);
                return (
                  <CircleMarker
                    key={key}
                    center={[lat, lon] as LatLngExpression}
                    radius={radius}
                    fillColor="#FFA69E"
                    color="#FF686B"
                    weight={2}
                    opacity={0.8}
                    fillOpacity={0.6}
                  >
                    {count >= 50 && (
                      <CircleMarker
                        center={[lat, lon] as LatLngExpression}
                        radius={0}
                        fillOpacity={0}
                        opacity={0}
                      >
                        <Popup className="custom-popup">
                          <div className="text-lg font-bold">{count}</div>
                        </Popup>
                      </CircleMarker>
                    )}
                    <Popup>
                      <div className="text-center bg-white p-4 rounded-lg shadow-md">
                        <p className="font-bold text-xl text-indigo-600 mb-2">
                          {count} Nodes in this area
                        </p>
                        <ul className="mt-2 space-y-1">
                          {groupNodes.slice(0, 5).map(node => (
                            <li key={node.ip} className="text-sm text-gray-600">
                              {node.ip} - {node.version}
                            </li>
                          ))}
                        </ul>
                        {count > 5 && (
                          <p className="text-sm text-gray-500 mt-2 italic">
                            and {count - 5} more...
                          </p>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-8 mb-8">
            <h2 className="text-3xl font-bold mb-4 text-center text-indigo-600">Recently Added Nodes</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-indigo-100">
                    <th className="px-4 py-2">IP</th>
                    <th className="px-4 py-2">Version</th>
                    <th className="px-4 py-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recentNodes.map((node) => (
                    <tr key={node.ip} className="border-b">
                      <td className="px-4 py-2">{node.ip}</td>
                      <td className="px-4 py-2">{node.version || 'Unknown'}</td>
                      <td className="px-4 py-2">{new Date(node.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      
      <footer className="mt-8 text-center text-gray-600">
        Created by Cursor+Claude using <a href="https://x.com/ferric" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">@ferric</a>
      </footer>
    </div>
  );
};

export default SolanaMap;
