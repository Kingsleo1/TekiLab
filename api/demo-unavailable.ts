// The hosted demo has no trusted production backend yet. Never proxy credentials or write records here.
export default function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({ error: 'Hosted demo: shared bookings, QR records and payments require the production backend. Use the local preview for workflow review.', mode: 'hosted-demo' });
}
