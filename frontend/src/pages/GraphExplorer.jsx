import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:4000';

const GROUP_COLORS = {
  user: '#2F6690',
  device: '#B9D6E6',
  blocklisted_device: '#C0392B',
};

export default function GraphExplorer() {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [stats, setStats] = useState({ users: 0, devices: 0, blocklisted: 0 });

  useEffect(() => {
    let network;

    async function load() {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/v1/graph`);
        if (!res.ok) throw new Error(`Gateway returned ${res.status}`);
        const { nodes, edges } = await res.json();

        const nodeDataset = new DataSet(
          nodes.map((n) => ({
            id: n.id,
            label: n.label,
            shape: n.group === 'user' ? 'dot' : 'square',
            size: n.group === 'user' ? 14 : 10,
            color: GROUP_COLORS[n.group],
            font: { size: 11, color: '#3C4A58' },
          }))
        );
        const edgeDataset = new DataSet(
          edges.map((e, i) => ({ id: i, from: e.from, to: e.to, color: '#B9D6E6' }))
        );

        setStats({
          users: nodes.filter((n) => n.group === 'user').length,
          devices: nodes.filter((n) => n.group === 'device').length,
          blocklisted: nodes.filter((n) => n.group === 'blocklisted_device').length,
        });

        // physics: false — this is a one-time static load of the full
        // seeded graph, not a live per-transaction feed, so the
        // animation/jank risk we deliberately avoided elsewhere doesn't
        // apply here. Fixed layout, instant render.
        network = new Network(
          containerRef.current,
          { nodes: nodeDataset, edges: edgeDataset },
          {
            physics: false,
            layout: { improvedLayout: true },
            interaction: { hover: true, zoomView: true, dragView: true },
          }
        );
        setStatus('ready');
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    }

    load();
    return () => network?.destroy();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-display font-800 text-ink-900 mb-2">Graph Explorer</h1>
      <p className="text-ink-700 mb-6">
        Every seeded device and the accounts that share it. Red squares are
        blocklisted devices — the graph is how AEGIS reaches accounts
        that haven't touched a blocklisted device directly.
      </p>

      <div className="flex gap-6 mb-6 text-sm">
        <span><span className="font-semibold text-brand-700">{stats.users}</span> users</span>
        <span><span className="font-semibold text-brand-700">{stats.devices}</span> devices</span>
        <span><span className="font-semibold text-status-block">{stats.blocklisted}</span> blocklisted</span>
      </div>

      <div className="bg-surface border border-brand-200/60 rounded-xl2 overflow-hidden">
        {status === 'error' && (
          <div className="h-[520px] flex items-center justify-center text-ink-500 text-sm">
            Couldn't load the graph — is the gateway running at {GATEWAY_URL}?
          </div>
        )}
        {status === 'loading' && (
          <div className="h-[520px] flex items-center justify-center text-ink-500 text-sm">
            Loading graph…
          </div>
        )}
        <div
          ref={containerRef}
          className="h-[520px]"
          style={{ display: status === 'ready' ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
}
