import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ReportApproval, digestReport, recallSignature, rememberSignature, forgetSignature } from '../../lib/report-approval';
export function ReportSignature({ snapshot, user, enabled, onApprove }: {
  snapshot: string; user: any; enabled: boolean; onApprove: (approval: ReportApproval) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false); const ink = useRef(false);
  const [image, setImage] = useState(''); const [remember, setRemember] = useState(false);
  const [confirmed, setConfirmed] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setConfirmed(false); setImage(''); ink.current = false; canvas.current?.getContext('2d')?.clearRect(0,0,600,160); }, [snapshot, user?.id]);
  useEffect(() => { setImage(''); setRemember(false); canvas.current?.getContext('2d')?.clearRect(0,0,600,160); }, [user?.id]);
  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - rect.left) * 600 / rect.width, (e.clientY - rect.top) * 160 / rect.height];
  };
  const clear = () => { canvas.current?.getContext('2d')?.clearRect(0,0,600,160); setImage(''); ink.current = false; setConfirmed(false); };
  const approve = async () => {
    if (!enabled || !confirmed || !image || !user?.id) return;
    setBusy(true); setError('');
    try {
      const reportDigest = await digestReport(snapshot);
      if (remember) rememberSignature(user.id, image);
      onApprove({ signerId: user.id, signerName: user.name || user.displayName, signedAt: new Date().toISOString(), reportSnapshot: snapshot, reportDigest, signaturePng: image });
    } catch { setError('Could not sign this report. Please retry.'); } finally { setBusy(false); }
  };
  return <fieldset disabled={!enabled || busy} className="rounded-xl border p-3 space-y-3 min-w-0">
    <legend className="text-sm font-semibold px-1">Signature and report approval</legend>
    <p className="text-xs text-slate-600">Draw your signature. Reuse is optional and lasts only in this open session. Each report requires fresh approval.</p>
    <canvas ref={canvas} width={600} height={160} aria-label="Draw report signature" className="w-full h-28 touch-none border rounded bg-white"
      onPointerDown={e => { if (!enabled) return; e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; const c = e.currentTarget.getContext('2d')!; const [x,y] = point(e); c.beginPath(); c.moveTo(x,y); c.lineWidth = 2; c.lineCap = 'round'; }}
      onPointerMove={e => { if (!drawing.current) return; const [x,y] = point(e); const c = e.currentTarget.getContext('2d')!; c.lineTo(x,y); c.stroke(); ink.current = true; }}
      onPointerUp={e => { drawing.current = false; if (ink.current) { setImage(e.currentTarget.toDataURL('image/png')); setConfirmed(false); } }}
      onPointerCancel={() => { drawing.current = false; }} />
    {image && <img src={image} alt="Selected report signature" className="h-12 max-w-full" />}
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={clear} className="text-xs border rounded px-2 py-1">Clear signature</button>
      {recallSignature(user?.id) && <button type="button" onClick={() => { setImage(recallSignature(user.id)!); setConfirmed(false); }} className="text-xs border rounded px-2 py-1">Reuse my session signature</button>}
      {recallSignature(user?.id) && <button type="button" onClick={() => { forgetSignature(user.id); setRemember(false); clear(); }} className="text-xs border rounded px-2 py-1">Forget my session signature</button>}
    </div>
    <label className="flex gap-2 text-xs"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Keep my signature in memory for this session</label>
    <label className="flex gap-2 text-xs"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed this patient, measured results, findings and any AI suggestions. I approve this specific report as {user?.name || user?.displayName || 'signed-in reviewer'}.</label>
    {!enabled && <p className="text-xs text-amber-700">An authorized clinical reviewer must sign in and complete the report.</p>}
    {error && <p role="alert">{error}</p>}
    <button type="button" onClick={approve} disabled={!enabled || !confirmed || !image || busy} className="rounded bg-blue-600 text-white px-3 py-2 text-sm disabled:opacity-40">{busy ? 'Signing…' : 'Sign this report'}</button>
  </fieldset>;
}
