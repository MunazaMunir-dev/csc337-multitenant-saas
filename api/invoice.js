export default async function handler(req, res) {
  const startedAt = Date.now();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.INVOICE_WORKER_SECRET;
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || supplied !== expected) return res.status(401).json({ error: 'Unauthorized' });

  const { orderId, tenantId, items = [], total = 0 } = req.body || {};
  if (!orderId || !tenantId || !Array.isArray(items)) {
    return res.status(400).json({ error: 'orderId, tenantId and items are required' });
  }

  // Demo invoice payload. Integrate a PDF renderer and private object storage for production.
  const durationMs = Date.now() - startedAt;
  console.log(JSON.stringify({
    type: 'invoice_worker_timing',
    durationMs,
    instanceHint: process.env.VERCEL_REGION || 'local-or-unspecified',
    note: 'Platform logs/instance reuse are needed to classify cold vs warm reliably'
  }));
  return res.status(200).json({
    invoice: { orderId, tenantId, items, total, generatedAt: new Date().toISOString() },
    durationMs,
    message: 'Invoice summary generated; PDF rendering is a documented extension point'
  });
}
