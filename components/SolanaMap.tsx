import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Node {
  pubkey: string;
  gossip: string;
  tpu: string;
  rpc: string | null;
  version: string | null;
  lat: number;
  lon: number;
}

const SolanaMap = () => {
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const response = await fetch('/api/solana-nodes');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Node[] = await response.json();
        setNodes(data);
      } catch (error) {
        console.error('Error fetching nodes:', error);
      }
    };

    fetchNodes();
  }, []);

  const groupedNodes = nodes.reduce((acc, node) => {
    const key = `${node.lat},${node.lon}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(node);
    return acc;
  }, {} as Record<string, Node[]>);

  return (
    <MapContainer center={[0, 0] as LatLngExpression} zoom={2} style={{ height: '100vh', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {Object.entries(groupedNodes).map(([key, groupNodes]) => {
        const [lat, lon] = key.split(',').map(Number);
        return (
          <CircleMarker
            key={key}
            center={[lat, lon] as LatLngExpression}
            pathOptions={{
              fillColor: "#1E90FF",
              color: "#000",
              weight: 1,
              opacity: 1,
              fillOpacity: 0.8,
            }}
            radius={Math.log(groupNodes.length) * 5 + 5}
          >
            <Popup>
              <div>
                <strong>{groupNodes.length} node(s)</strong>
                <ul>
                  {groupNodes.map(node => (
                    <li key={node.pubkey}>
                      {node.pubkey.slice(0, 8)}... - {node.version}
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

export default SolanaMap;
