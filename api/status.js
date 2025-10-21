import fetch from 'node-fetch';
// Status route for frontend fallback
export default async function handler(req, res) {
  try {
    // Example: get sync status from node
    const nodeRes = await fetch(process.env.VITE_FAIRBRIX_RPC_URL + '/status');
    const nodeStatus = await nodeRes.json();
    res.json({
      ok: nodeStatus.ok,
      syncing: nodeStatus.syncing,
      sync: nodeStatus.sync,
    });
  } catch (e) {
    res.json({ ok: false });
  }
}
