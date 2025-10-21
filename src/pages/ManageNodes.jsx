import React, { useEffect, useState } from 'react';

export default function ManageNodes() {
  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem('dope_nodes');
    return saved ? JSON.parse(saved) : [
      { name: 'Primary Node', url: 'https://rpc1.dopebrix.com:9332', status: 'unknown' },
      { name: 'Backup Node', url: 'https://rpc2.dopebrix.com:9332', status: 'unknown' }
    ];
  });
  const [autoSwitch, setAutoSwitch] = useState(() => {
    const saved = localStorage.getItem('dope_autoSwitch');
    return saved ? JSON.parse(saved) : true;
  });
  const [newNode, setNewNode] = useState('');

  // Test connectivity and measure latency
  const pingNode = async (url) => {
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '1.0',
          id: 'dope',
          method: 'getblockcount',
          params: []
        })
      });
      const latency = performance.now() - start;
      return { ok: res.ok, latency };
    } catch {
      return { ok: false, latency: 9999 };
    }
  };

  // Use fastest node automatically
  const useFastestNode = async () => {
    const results = await Promise.all(nodes.map(async (node) => {
      const res = await pingNode(node.url);
      return { ...node, status: res.ok ? 'online' : 'offline', latency: res.latency };
    }));
    setNodes(results);
    localStorage.setItem('dope_nodes', JSON.stringify(results));
    if (autoSwitch) {
      const onlineNodes = results.filter(n => n.status === 'online');
      if (onlineNodes.length > 0) {
        const fastest = onlineNodes.reduce((a, b) => a.latency < b.latency ? a : b);
        localStorage.setItem('dope_activeNode', fastest.url);
      }
    }
  };

  // Refresh node statuses and use fastest node
  useEffect(() => {
    useFastestNode();
    const interval = setInterval(useFastestNode, 15000);
    return () => clearInterval(interval);
  }, [autoSwitch, nodes]);

  const addNode = async () => {
    if (!newNode) return;
    const alive = await pingNode(newNode);
    const newEntry = { name: `Custom Node ${nodes.length + 1}`, url: newNode, status: alive ? 'online' : 'offline' };
    const updated = [...nodes, newEntry];
    setNodes(updated);
    localStorage.setItem('dope_nodes', JSON.stringify(updated));
    setNewNode('');
  };

  const deleteNode = (index) => {
    const updated = nodes.filter((_, i) => i !== index);
    setNodes(updated);
    localStorage.setItem('dope_nodes', JSON.stringify(updated));
  };

  const toggleAutoSwitch = () => {
    const newVal = !autoSwitch;
    setAutoSwitch(newVal);
    localStorage.setItem('dope_autoSwitch', JSON.stringify(newVal));
  };

  return (
    <div className="p-5 text-white min-h-screen bg-gradient-to-b from-[#0B0B0B] to-[#161616]">
      <h1 className="text-2xl font-bold mb-4">Manage Nodes</h1>

      <div className="flex items-center justify-between mb-6">
        <span className="text-gray-300">Enable Automatic Node Switching</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={autoSwitch} onChange={toggleAutoSwitch} className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer
             peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']
             after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300
             after:border after:rounded-full after:h-5 after:w-5 after:transition-all
             peer-checked:bg-green-500"></div>
        </label>
      </div>

      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newNode}
            onChange={(e) => setNewNode(e.target.value)}
            placeholder="https://rpc.newnode.com:9332"
            className="w-full bg-[#1E1E1E] text-sm p-3 rounded border border-gray-700 focus:outline-none"
          />
          <button
            onClick={addNode}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold px-4 py-2 rounded"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {nodes.map((node, i) => (
          <div key={i} className="flex justify-between items-center bg-[#1E1E1E] rounded p-3 border border-gray-700">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  node.status === 'online'
                    ? 'bg-green-500'
                    : node.status === 'offline'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                }`}
              ></span>
              <div>
                <div className="font-semibold text-sm">{node.name}</div>
                <div className="text-xs text-gray-400">{node.url}</div>
                {typeof node.latency === 'number' && node.status === 'online' && (
                  <div className="text-xs text-green-400">{Math.round(node.latency)} ms</div>
                )}
              </div>
            </div>
            <button
              onClick={() => deleteNode(i)}
              className="text-gray-400 hover:text-red-400 transition"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
