import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, FileVideo2, RefreshCw, ShieldAlert } from 'lucide-react';

type ViewId = 'plax' | 'psax' | 'a4c' | 'a2c';
type AssetStatus = 'checking' | 'available' | 'missing' | 'unreadable';

const VIEWS: Array<{ id: ViewId; label: string; longLabel: string; description: string }> = [
  { id: 'plax', label: 'PLAX', longLabel: 'Parasternal long axis', description: 'Parasternal long-axis window' },
  { id: 'psax', label: 'PSAX', longLabel: 'Parasternal short axis', description: 'Parasternal short-axis window' },
  { id: 'a4c', label: 'A4C', longLabel: 'Apical four chamber', description: 'Apical four-chamber window' },
  { id: 'a2c', label: 'A2C', longLabel: 'Apical two chamber', description: 'Apical two-chamber window' }
];

const assetUrl = (id: ViewId) => '/echo/' + id + '.mp4';

export default function EchoLab() {
  const [selected, setSelected] = useState<ViewId>('plax');
  const [statuses, setStatuses] = useState<Record<ViewId, AssetStatus>>({
    plax: 'checking', psax: 'checking', a4c: 'checking', a2c: 'checking'
  });
  const [retryToken, setRetryToken] = useState(0);
  const activeView = VIEWS.find(view => view.id === selected) || VIEWS[0];
  const activeStatus = statuses[selected];

  useEffect(() => {
    let cancelled = false;
    setStatuses({ plax: 'checking', psax: 'checking', a4c: 'checking', a2c: 'checking' });
    Promise.all(VIEWS.map(async view => {
      try {
        const response = await fetch(assetUrl(view.id), { method: 'HEAD', cache: 'no-store' });
        const type = (response.headers.get('content-type') || '').toLowerCase();
        if (!response.ok) return [view.id, 'missing'] as const;
        if (type.includes('video/') || type.includes('application/octet-stream')) {
          return [view.id, 'available'] as const;
        }
        return [view.id, 'missing'] as const;
      } catch {
        return [view.id, 'unreadable'] as const;
      }
    })).then(results => {
      if (cancelled) return;
      setStatuses(previous => {
        const next = { ...previous };
        for (const [id, status] of results) next[id] = status;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [retryToken]);

  const statusLabel = (status: AssetStatus) => {
    if (status === 'checking') return 'Checking asset…';
    if (status === 'available') return 'Asset found';
    if (status === 'unreadable') return 'Could not verify asset';
    return 'Asset missing';
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f4f6f3] p-4 md:p-7">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#34746a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34746a]" /> Imaging suite / 02
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-[#17232c] md:text-[32px]">Echo Lab</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Asset-backed echocardiography playback. The viewer loads only supplied echo loops; it never synthesizes ultrasound frames.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRetryToken(value => value + 1)}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Recheck files
          </button>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.7fr)]">
          <section className="min-w-0 overflow-hidden rounded-[22px] border border-[#28363b] bg-[#101619] shadow-[0_18px_45px_rgba(15,35,30,.12)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#172124] px-4 py-3.5 md:px-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#24383c] text-[#d7e7e4]"><FileVideo2 size={18} /></span>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[.16em] text-[#92a6a5]">Pre-rendered loop</div>
                  <div className="mt-1 text-sm font-semibold text-white">{activeView.label} · {activeView.longLabel}</div>
                </div>
              </div>
              <span className={activeStatus === 'available'
                ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200'
                : 'inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1.5 text-[10px] font-semibold text-amber-100'}>
                {activeStatus === 'available' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {statusLabel(activeStatus)}
              </span>
            </div>

            <div className="relative flex min-h-[300px] items-center justify-center bg-black md:min-h-[480px]">
              {activeStatus === 'available' ? (
                <video
                  key={selected + '-' + retryToken}
                  className="block max-h-[72vh] w-full bg-black object-contain"
                  src={assetUrl(selected)}
                  controls
                  playsInline
                  preload="metadata"
                  onError={() => setStatuses(previous => ({ ...previous, [selected]: 'missing' }))}
                >
                  Your browser does not support HTML video playback.
                </video>
              ) : (
                <div className="mx-5 my-8 max-w-lg text-center" role="alert">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-100/15 bg-amber-200/10 text-amber-100">
                    <ShieldAlert size={23} />
                  </span>
                  <h2 className="mt-5 text-lg font-semibold text-white">
                    {activeStatus === 'checking' ? 'Checking source media' : activeStatus === 'unreadable' ? 'Media could not be verified' : 'Echo loop unavailable'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {activeStatus === 'checking'
                      ? 'Verifying the exact media path. No placeholder imagery will be shown.'
                      : activeStatus === 'unreadable'
                        ? 'The file request failed. Check the deployment and retry the media check.'
                        : 'The required MP4 is not present or could not be served. Add the real loop at the path below and redeploy.'}
                  </p>
                  <code className="mt-4 inline-block rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#d6e6df]">{'public' + assetUrl(selected)}</code>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#172124] px-4 py-3.5 text-[10px] text-[#9bacac] md:px-5">
              <span>Source: {assetUrl(selected)}</span>
              <span>No generated frames · No synthetic ultrasound fallback</span>
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-4">
            <section className="rounded-[22px] border border-slate-200 bg-white p-4 md:p-5">
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#34746a]">View selection</div>
              <h2 className="mt-1.5 text-base font-semibold text-slate-900">Standard echo windows</h2>
              <div className="mt-4 space-y-2">
                {VIEWS.map(view => (
                  <button
                    type="button"
                    key={view.id}
                    onClick={() => setSelected(view.id)}
                    className={selected === view.id
                      ? 'flex w-full items-center justify-between gap-3 rounded-xl border border-[#8fbaab] bg-[#edf7f1] px-3.5 py-3 text-left'
                      : 'flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#fafbf9] px-3.5 py-3 text-left hover:border-slate-300'}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-800">{view.label} · {view.longLabel}</span>
                      <span className="mt-1 block truncate text-[10px] text-slate-500">{'public' + assetUrl(view.id)}</span>
                    </span>
                    <span className={statuses[view.id] === 'available' ? 'shrink-0 text-emerald-700' : statuses[view.id] === 'checking' ? 'shrink-0 text-slate-400' : 'shrink-0 text-amber-700'}>
                      {statuses[view.id] === 'available' ? <CheckCircle2 size={15} /> : statuses[view.id] === 'checking' ? <RefreshCw size={14} /> : <AlertTriangle size={15} />}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-4 md:p-5">
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#34746a]">Asset requirements</div>
              <h2 className="mt-1.5 text-base font-semibold text-slate-900">Real media only</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">Place the original MP4 loops in the public folder using these exact names:</p>
              <div className="mt-3 space-y-2 font-mono text-[11px] text-slate-700">
                {VIEWS.map(view => <div key={view.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#f5f7f5] px-3 py-2"><span>{'public' + assetUrl(view.id)}</span><span className="shrink-0 text-slate-400">{statuses[view.id] === 'available' ? 'found' : statuses[view.id] === 'checking' ? 'checking' : 'missing'}</span></div>)}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[10px] leading-5 text-amber-900">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>No MP4s or labelled volume were present in the repository when this viewer was built. A 3D shader path is intentionally not enabled without the actual volume and its label/density format.</span>
              </div>
            </section>

            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-[#edf2ee] px-3.5 py-3 text-[10px] leading-5 text-slate-500">
              <ExternalLink size={13} className="mt-0.5 shrink-0 text-[#648579]" />
              <span>Only the supplied cine media can drive the displayed cardiac cycle. A synchronized ECG or shader reconstruction should be added only when the source timeline or labelled volume provides the information needed to do it honestly.</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
