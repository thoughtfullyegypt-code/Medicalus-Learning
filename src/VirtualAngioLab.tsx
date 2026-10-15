import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, Check, CircleHelp, Crosshair, Maximize2, Pause, Play,
  RotateCcw, ScanLine, ShieldCheck, Syringe, Target, X
} from 'lucide-react';

type Point3 = [number, number, number];
type Territory = 'LCA' | 'RCA' | 'BOTH';
type Vessel = { id: string; name: string; territory: Territory; points: Point3[]; width: number; label?: string };

const VESSELS: Vessel[] = [
  { id: 'lm', name: 'Left main', territory: 'LCA', width: 5.6, label: 'LM', points: [[-0.03,0.68,0.3],[0.02,0.58,0.49],[0.11,0.49,0.61]] },
  { id: 'lad-prox', name: 'LAD proximal', territory: 'LCA', width: 4.6, label: 'LAD', points: [[0.11,0.49,0.61],[0.09,0.28,0.68],[0.1,0.08,0.69]] },
  { id: 'lad-mid', name: 'LAD mid', territory: 'LCA', width: 3.9, points: [[0.1,0.08,0.69],[0.15,-0.18,0.64],[0.24,-0.44,0.5]] },
  { id: 'lad-dist', name: 'LAD distal', territory: 'LCA', width: 2.8, points: [[0.24,-0.44,0.5],[0.34,-0.64,0.36],[0.42,-0.76,0.21]] },
  { id: 'd1', name: 'First diagonal', territory: 'LCA', width: 2.6, label: 'D1', points: [[0.09,0.28,0.68],[0.31,0.3,0.57],[0.48,0.21,0.41]] },
  { id: 'd2', name: 'Second diagonal', territory: 'LCA', width: 2.1, label: 'D2', points: [[0.1,0.02,0.69],[0.31,0.01,0.54],[0.45,-0.1,0.38]] },
  { id: 'septal1', name: 'First septal', territory: 'LCA', width: 1.65, points: [[0.1,0.13,0.68],[0.0,0.03,0.48],[-0.06,-0.06,0.3]] },
  { id: 'septal2', name: 'Second septal', territory: 'LCA', width: 1.35, points: [[0.14,-0.12,0.65],[0.04,-0.2,0.44],[-0.01,-0.31,0.28]] },
  { id: 'lcx-prox', name: 'Circumflex proximal', territory: 'LCA', width: 4.4, label: 'LCx', points: [[0.11,0.49,0.61],[0.28,0.5,0.5],[0.49,0.42,0.37]] },
  { id: 'lcx-mid', name: 'Circumflex mid', territory: 'LCA', width: 3.1, points: [[0.49,0.42,0.37],[0.67,0.3,0.21],[0.75,0.12,0.04]] },
  { id: 'om1', name: 'First obtuse marginal', territory: 'LCA', width: 2.5, label: 'OM1', points: [[0.49,0.42,0.37],[0.58,0.5,0.2],[0.68,0.44,0.09]] },
  { id: 'om2', name: 'Second obtuse marginal', territory: 'LCA', width: 2.0, label: 'OM2', points: [[0.66,0.3,0.21],[0.77,0.24,0.08],[0.81,0.11,-0.02]] },
  { id: 'rca-prox', name: 'RCA proximal', territory: 'RCA', width: 5.0, label: 'RCA', points: [[-0.58,0.62,0.32],[-0.66,0.42,0.42],[-0.68,0.16,0.36]] },
  { id: 'rca-mid', name: 'RCA mid', territory: 'RCA', width: 4.0, points: [[-0.68,0.16,0.36],[-0.62,-0.08,0.29],[-0.43,-0.28,0.1]] },
  { id: 'rca-dist', name: 'RCA distal', territory: 'RCA', width: 3.0, points: [[-0.43,-0.28,0.1],[-0.22,-0.4,-0.08],[-0.05,-0.44,-0.18]] },
  { id: 'acute', name: 'Acute marginal', territory: 'RCA', width: 2.3, label: 'AM', points: [[-0.63,-0.02,0.31],[-0.82,-0.06,0.14],[-0.89,-0.2,0.04]] },
  { id: 'pda', name: 'Posterior descending artery', territory: 'RCA', width: 2.1, label: 'PDA', points: [[-0.05,-0.44,-0.18],[0.01,-0.6,-0.22],[0.08,-0.77,-0.18]] },
  { id: 'plv', name: 'Posterolateral branch', territory: 'RCA', width: 1.9, label: 'PL', points: [[-0.05,-0.44,-0.18],[0.13,-0.5,-0.13],[0.31,-0.53,-0.1]] }
];

const HEART_OUTLINE: Point3[] = [
  [-0.05,0.88,0.08],[-0.3,0.8,0.15],[-0.58,0.58,0.27],[-0.71,0.27,0.34],
  [-0.7,-0.05,0.35],[-0.53,-0.35,0.28],[-0.27,-0.64,0.18],[0.03,-0.81,0.11],
  [0.32,-0.68,0.11],[0.56,-0.42,0.11],[0.68,-0.1,0.18],[0.68,0.23,0.28],
  [0.51,0.53,0.26],[0.27,0.74,0.17],[0.08,0.82,0.1],[-0.05,0.88,0.08]
];

const RIBS: Point3[][] = Array.from({ length: 7 }, (_, index) => {
  const y = 0.56 - index * 0.15;
  const left: Point3[] = [
    [-0.12, y + 0.13, -0.13], [-0.31, y + 0.17, -0.03],
    [-0.51, y + 0.10, 0.07], [-0.66, y - 0.01, 0.09], [-0.69, y - 0.09, 0.02]
  ];
  return left;
}).concat(Array.from({ length: 7 }, (_, index) => {
  const y = 0.56 - index * 0.15;
  const right: Point3[] = [
    [0.12, y + 0.13, -0.13], [0.31, y + 0.17, -0.03],
    [0.51, y + 0.10, 0.07], [0.66, y - 0.01, 0.09], [0.69, y - 0.09, 0.02]
  ];
  return right;
}));

const SPINE: Point3[] = [[0,0.78,-0.18],[0,0.52,-0.18],[0,0.24,-0.18],[0,-0.04,-0.18],[0,-0.32,-0.18],[0,-0.60,-0.18]];


const STUDIES = [
  { id: 'left-main', name: 'Left coronary · normal anatomy', mode: 'LCA' as const, target: [40,-30] as [number,number], prompt: 'Acquire a view that opens the left main bifurcation.', clue: 'A caudal LAO projection is commonly taught for separating the LM, LAD and LCx origins.' },
  { id: 'lad-stenosis', name: 'LAD · focal narrowing model', mode: 'LCA' as const, target: [-30,30] as [number,number], prompt: 'Find a complementary view for the LAD and diagonal origins.', clue: 'Cranial angulation may help display the LAD and diagonal branch origins; inspect more than one view.' },
  { id: 'right-coronary', name: 'Right coronary · normal anatomy', mode: 'RCA' as const, target: [45,0] as [number,number], clue: 'The RCA can be assessed with complementary straight LAO and RAO views.', prompt: 'Orient the C-arm to inspect the RCA course.' }
];

const PRESETS = [
  { name: 'Spider', primary: 40, secondary: -30, hint: 'Left main bifurcation' },
  { name: 'RAO cranial', primary: -30, secondary: 30, hint: 'LAD / diagonal origins' },
  { name: 'LAO cranial', primary: 45, secondary: 30, hint: 'LAD separation' },
  { name: 'RAO caudal', primary: -30, secondary: -20, hint: 'Circumflex course' },
  { name: 'LAO straight', primary: 45, secondary: 0, hint: 'RCA course' },
  { name: 'AP cranial', primary: 0, secondary: 35, hint: 'LAD branch points' }
];

function project(point: Point3, primary: number, secondary: number, zoom = 1) {
  const p = primary * Math.PI / 180;
  const s = secondary * Math.PI / 180;
  const x = point[0] * Math.cos(p) + point[2] * Math.sin(p);
  const z = -point[0] * Math.sin(p) + point[2] * Math.cos(p);
  const y = point[1] * Math.cos(s) - z * Math.sin(s);
  const depth = point[1] * Math.sin(s) + z * Math.cos(s);
  const perspective = 1 / Math.max(0.72, 1 - depth * 0.13);
  return { x: 360 + x * 246 * zoom * perspective, y: 310 - y * 256 * zoom * perspective };
}

function pathData(points: Point3[], primary: number, secondary: number, zoom: number) {
  return points.map((point, index) => {
    const p = project(point, primary, secondary, zoom);
    return (index === 0 ? 'M' : 'L') + p.x.toFixed(2) + ',' + p.y.toFixed(2);
  }).join(' ');
}

function AngleDial({ primary, secondary }: { primary: number; secondary: number }) {
  const angle = primary * Math.PI / 180;
  const x = 74 + Math.sin(angle) * 37;
  const y = 68 - Math.cos(angle) * 37;
  const rotation = primary * 0.55 + secondary * 0.18;
  return <svg viewBox="0 0 148 136" className="h-32 w-full" aria-label="C-arm orientation diagram">
    <ellipse cx="74" cy="69" rx="55" ry="37" fill="#f2f6f4" stroke="#d9e4df"/>
    <path d="M21 69H127M74 30V107" stroke="#d2dfd9" strokeDasharray="3 3"/>
    <g transform={'rotate(' + rotation + ' 74 68)'}>
      <path d="M38 25 Q16 32 27 57 L42 71" fill="none" stroke="#53776e" strokeWidth="7" strokeLinecap="round"/>
      <path d="M40 24 L58 18 Q67 17 68 27 L69 37" fill="none" stroke="#7ca99b" strokeWidth="7" strokeLinecap="round"/>
      <rect x="57" y="13" width="22" height="9" rx="2" fill="#173a38"/>
      <rect x="65" y="48" width="18" height="37" rx="3" fill="#cddbd5" stroke="#78978b" strokeWidth="1.3"/>
    </g>
    <circle cx="74" cy="68" r="6" fill="#d89142" stroke="white" strokeWidth="2"/>
    <line x1="74" y1="68" x2={x} y2={y} stroke="#1c7164" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx={x} cy={y} r="3.7" fill="#1c7164"/>
    <text x="74" y="124" textAnchor="middle" fontSize="8" fill="#73867d" fontWeight="700">{primary === 0 ? 'AP' : primary > 0 ? 'LAO' : 'RAO'} {Math.abs(primary)}° · {secondary > 0 ? 'CRAN' : secondary < 0 ? 'CAUD' : '0°'} {Math.abs(secondary)}°</text>
  </svg>;
}

export default function VirtualAngioLab() {
  const [studyId, setStudyId] = useState('left-main');
  const [primary, setPrimary] = useState(40);
  const [secondary, setSecondary] = useState(-30);
  const [mode, setMode] = useState<Territory>('LCA');
  const [zoom, setZoom] = useState(1);
  const [contrast, setContrast] = useState(false);
  const [cine, setCine] = useState(false);
  const [labels, setLabels] = useState(false);
  const [showHeart, setShowHeart] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [challengeDone, setChallengeDone] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const study = STUDIES.find(item => item.id === studyId) || STUDIES[0];
  const primaryLabel = primary === 0 ? 'AP' : primary > 0 ? 'LAO' : 'RAO';
  const secondaryLabel = secondary === 0 ? 'STRAIGHT' : secondary > 0 ? 'CRAN' : 'CAUD';

  useEffect(() => {
    if (!cine) return;
    const timer = window.setInterval(() => setContrast(value => !value), 900);
    return () => window.clearInterval(timer);
  }, [cine]);

  const visibleVessels = useMemo(() => VESSELS.filter(vessel => vessel.territory === mode || vessel.territory === 'BOTH'), [mode]);
  const projectedHeart = useMemo(() => pathData(HEART_OUTLINE, primary, secondary, zoom), [primary, secondary, zoom]);
  const projectedRibs = useMemo(() => RIBS.map(points => pathData(points, primary, secondary, zoom)), [primary, secondary, zoom]);
  const projectedSpine = useMemo(() => pathData(SPINE, primary, secondary, zoom), [primary, secondary, zoom]);
  const projectedVessels = useMemo(() => visibleVessels.map(vessel => ({
    ...vessel,
    d: pathData(vessel.points, primary, secondary, zoom),
    labelPoint: project(vessel.points[vessel.points.length - 1], primary, secondary, zoom),
    lesionPoint: project(vessel.points[Math.floor((vessel.points.length - 1) / 2)], primary, secondary, zoom)
  })), [visibleVessels, primary, secondary, zoom]);

  const chooseStudy = (id: string) => {
    const next = STUDIES.find(item => item.id === id) || STUDIES[0];
    setStudyId(id);
    setMode(next.mode);
    setContrast(false);
    setCine(false);
    setFeedback('');
    setChallengeDone(false);
    if (id === 'left-main') { setPrimary(40); setSecondary(-30); }
    if (id === 'lad-stenosis') { setPrimary(-30); setSecondary(30); }
    if (id === 'right-coronary') { setPrimary(45); setSecondary(0); }
  };

  const checkProjection = () => {
    const ok = Math.abs(primary - study.target[0]) <= 10 && Math.abs(secondary - study.target[1]) <= 10;
    if (ok) {
      setFeedback('Target acquired. You matched the angle range for this educational objective. Compare with a complementary projection before drawing conclusions.');
      setChallengeDone(true);
    } else {
      setFeedback('Not in the target range yet. Adjust primary rotation and secondary tilt, then check again. Preset angles are learning references—not universal clinical rules.');
      setChallengeDone(false);
    }
  };

  const inject = () => {
    setCine(false);
    setContrast(true);
  };

  const reset = () => {
    setPrimary(40);
    setSecondary(-30);
    setZoom(1);
    setMode('LCA');
    setStudyId('left-main');
    setContrast(false);
    setCine(false);
    setLabels(false);
    setFeedback('');
    setChallengeDone(false);
  };

  return <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f4f6f3] p-4 md:p-7">
    <style>{'.angio-grain{opacity:.09;mix-blend-mode:screen}.angio-cine{animation:angioPulse .9s ease-in-out infinite alternate}.angio-fill{animation:angioFill 1.1s ease-out both}@keyframes angioFill{0%{stroke-dashoffset:100;opacity:.15}100%{stroke-dashoffset:0;opacity:1}}@keyframes angioPulse{0%{stroke-dashoffset:100;opacity:.35}75%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:.85}}'}</style>
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#34746a]"><span className="h-1.5 w-1.5 rounded-full bg-[#3d9079]"/> Simulation suite / 01</div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-[#17232c] md:text-[32px]">Virtual Angio Lab</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Operate the virtual C-arm, inject contrast, and compare coronary views. The model projection responds to your angles; it is not patient imaging.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e7df] bg-[#eaf5ef] px-3 py-2 text-[10px] font-semibold text-[#27665a]"><ShieldCheck size={13}/> Educational simulation</span>
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={14}/> Reset</button>
        </div>
      </div>

      <div className={expanded ? 'fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-[#f4f6f3] p-3 md:p-6' : 'grid items-start gap-4 2xl:grid-cols-[minmax(0,1.38fr)_minmax(340px,0.62fr)]'}>
        <section className="min-w-0 overflow-hidden rounded-[22px] border border-[#233838] bg-[#0b1114] shadow-[0_18px_45px_rgba(15,35,30,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111e21] px-4 py-3 md:px-5">
            <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#21423d] text-[#a4e4ce]"><ScanLine size={17}/></span><div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8ba69d]">Fluoroscopy monitor</div><div className="mt-0.5 text-xs font-semibold text-white">{mode === 'LCA' ? 'LEFT CORONARY SYSTEM' : 'RIGHT CORONARY SYSTEM'}</div></div></div>
            <div className="flex items-center gap-2 text-[9px] font-semibold tracking-[0.1em] text-[#b9c9c2]"><span className={contrast ? 'h-1.5 w-1.5 rounded-full bg-[#9bdfc4] shadow-[0_0_9px_#80d7b7]' : 'h-1.5 w-1.5 rounded-full bg-[#73847f]'}/>{cine ? 'CINE LOOP' : contrast ? 'CONTRAST OPACIFIED' : 'LIVE · NO CONTRAST'}</div>
            <button onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Exit expanded monitor' : 'Expand monitor'} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">{expanded ? <X size={16}/> : <Maximize2 size={15}/>}</button>
          </div>

          <div className="relative bg-[#060a0d]">
            <svg viewBox="0 0 720 620" className={expanded ? 'block h-[min(70vh,800px)] w-full' : 'block max-h-[640px] w-full'} role="img" aria-label="Model-based coronary projection controlled by C-arm angulation">
              <defs>
                <radialGradient id="xray-field" cx="49%" cy="48%" r="72%"><stop offset="0%" stopColor="#485253"/><stop offset="42%" stopColor="#20292b"/><stop offset="79%" stopColor="#0c1316"/><stop offset="100%" stopColor="#030709"/></radialGradient>
                <linearGradient id="heart-haze" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#99a6a2" stopOpacity=".07"/><stop offset="45%" stopColor="#d1d7d4" stopOpacity=".16"/><stop offset="100%" stopColor="#6c7b78" stopOpacity=".025"/></linearGradient>
                <filter id="soft-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
                <filter id="vessel-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.1"/></filter>
                <filter id="grain-filter"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .22"/></feComponentTransfer></filter>
                <pattern id="monitor-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#b5c6c2" strokeOpacity=".035" strokeWidth=".7"/></pattern>
              </defs>
              <rect width="720" height="620" fill="url(#xray-field)"/>
              <rect width="720" height="620" fill="url(#monitor-grid)"/>
              <path d="M28 38h24M40 26v24M668 38h24M680 26v24M28 582h24M40 570v24M668 582h24M680 570v24" stroke="#bdd0c9" strokeOpacity=".32" strokeWidth="1.2" fill="none"/>
              <g opacity=".13" stroke="#cad2cf" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {projectedRibs.map((d, index) => <path key={index} d={d} />)}
              </g>
              <path d={projectedSpine} fill="none" stroke="#c2ceca" strokeOpacity=".08" strokeWidth="10" strokeLinecap="round" />
              <path d={projectedHeart} fill="url(#heart-haze)" stroke="#c6d3cf" strokeOpacity={showHeart ? '.2' : '0'} strokeWidth="3.8" strokeLinejoin="round" filter="url(#soft-glow)"/>
              <path d={projectedHeart} fill="url(#heart-haze)" stroke="#b5c5bf" strokeOpacity={showHeart ? '.11' : '0'} strokeWidth="1.4" strokeLinejoin="round"/>

              {projectedVessels.map(vessel => {
                const narrowed = studyId === 'lad-stenosis' && vessel.id === 'lad-mid';
                const strokeWidth = narrowed ? vessel.width * 0.57 : vessel.width;
                const progress = contrast ? 0 : 100;
                return <g key={vessel.id}>
                  <path d={vessel.d} fill="none" stroke="#e6f5f0" strokeWidth={vessel.width * 3.2} strokeOpacity={contrast ? '.2' : '.025'} filter="url(#vessel-glow)"/>
                  <path d={vessel.d} fill="none" stroke="#aebdb8" strokeWidth={vessel.width} strokeOpacity={contrast ? '.18' : '.11'} strokeLinecap="round" strokeLinejoin="round"/>
                  <path d={vessel.d} pathLength="100" strokeDasharray="100" strokeDashoffset={progress} fill="none" stroke="#f0faf6" strokeWidth={strokeWidth * 1.7} strokeOpacity={contrast ? '.23' : '0'} filter="url(#vessel-glow)" strokeLinecap="round" strokeLinejoin="round" className={contrast ? (cine ? 'angio-cine' : 'angio-fill') : ''} style={{animationDelay: String(Math.max(0, VESSELS.indexOf(vessel)) * .045) + 's'}}/>
                  <path d={vessel.d} pathLength="100" strokeDasharray="100" strokeDashoffset={progress} fill="none" stroke="#ecf7f3" strokeWidth={strokeWidth} strokeOpacity={contrast ? '.94' : '.14'} strokeLinecap="round" strokeLinejoin="round" className={contrast ? (cine ? 'angio-cine' : 'angio-fill') : ''} style={{animationDelay: String(Math.max(0, VESSELS.indexOf(vessel)) * .045) + 's'}}/>
                  {narrowed && <g><circle cx={vessel.lesionPoint.x} cy={vessel.lesionPoint.y} r="10" fill="#ef9d59" fillOpacity=".11" stroke="#edaa70" strokeOpacity=".9" strokeDasharray="2 3"/><circle cx={vessel.lesionPoint.x} cy={vessel.lesionPoint.y} r="3" fill="#f4bc80"/>{labels && <text x={vessel.lesionPoint.x + 12} y={vessel.lesionPoint.y - 9} fill="#f4bc80" fontSize="10" fontWeight="700">MODEL NARROWING</text>}</g>}
                  {labels && vessel.label && <g><path d={'M' + vessel.labelPoint.x + ',' + vessel.labelPoint.y + ' l' + (vessel.labelPoint.x > 360 ? 13 : -13) + ',-8'} fill="none" stroke="#b7e2d3" strokeWidth="1" strokeOpacity=".78"/><text x={vessel.labelPoint.x + (vessel.labelPoint.x > 360 ? 17 : -17)} y={vessel.labelPoint.y - 10} textAnchor={vessel.labelPoint.x > 360 ? 'start' : 'end'} fill="#d5f1e7" fontSize="10" fontWeight="700" letterSpacing=".7">{vessel.label}</text></g>}
                </g>;
              })}
              <rect width="720" height="620" filter="url(#grain-filter)" className="angio-grain"/>
              <rect x="18" y="18" width="684" height="584" rx="2" fill="none" stroke="#c5d4cf" strokeOpacity=".15"/>
              <g fill="#c4d1cc" fontSize="10" fontFamily="monospace" opacity=".72">
                <text x="34" y="58">MEDALICUS / VIRTUAL ANGIO</text>
                <text x="686" y="58" textAnchor="end">{mode} · {primaryLabel} {Math.abs(primary)}° / {secondaryLabel} {Math.abs(secondary)}°</text>
                <text x="34" y="578">{contrast ? 'CONTRAST PHASE · MODEL' : 'NO CONTRAST · FLUOROSCOPY GUIDE'}</text>
                <text x="686" y="578" textAnchor="end">ZOOM {Math.round(zoom * 100)}%</text>
              </g>
              {!contrast && <g transform="translate(360 515)"><rect x="-117" y="-18" width="234" height="36" rx="18" fill="#10191c" fillOpacity=".8" stroke="#d9e4df" strokeOpacity=".13"/><text x="0" y="4" fill="#b7c6c0" fontSize="10" textAnchor="middle" letterSpacing=".7">INJECT CONTRAST TO BEGIN ACQUISITION</text></g>}
            </svg>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#111b1e] px-4 py-3 md:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={inject} className="inline-flex items-center gap-2 rounded-xl bg-[#d8f0e5] px-4 py-2.5 text-xs font-bold text-[#143b35] hover:bg-white"><Syringe size={15}/> Inject contrast</button>
                <button onClick={() => { setContrast(true); setCine(value => !value); }} className={cine ? 'inline-flex items-center gap-2 rounded-xl border border-[#71b49d] bg-[#1b4840] px-3 py-2.5 text-xs font-semibold text-[#c6efdf]' : 'inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/5'}>{cine ? <Pause size={14}/> : <Play size={14}/>} {cine ? 'Pause cine' : 'Play cine'}</button>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[#98aaa3]"><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#a4e4ce]"/>Model lumen</span><span>Model-based cine loop</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
            <div className="bg-[#101a1d] px-4 py-3"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-[#7e9990]">Primary</div><div className="mt-1.5 text-sm font-semibold text-white">{primaryLabel} {Math.abs(primary)}°</div></div>
            <div className="bg-[#101a1d] px-4 py-3"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-[#7e9990]">Secondary</div><div className="mt-1.5 text-sm font-semibold text-white">{secondaryLabel} {Math.abs(secondary)}°</div></div>
            <div className="bg-[#101a1d] px-4 py-3"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-[#7e9990]">Acquisition mode</div><div className="mt-1.5 text-sm font-semibold text-white">{cine ? 'Cine loop' : contrast ? 'Contrast run' : 'Fluoro'}</div></div>
            <div className="bg-[#101a1d] px-4 py-3"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-[#7e9990]">Anatomy</div><div className="mt-1.5 text-sm font-semibold text-white">{mode === 'LCA' ? 'Left coronary' : 'Right coronary'}</div></div>
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#3e7f70]">Study setup</div><h2 className="mt-1.5 text-base font-semibold tracking-tight text-slate-900">Choose a teaching case</h2></div><span className="rounded-xl bg-[#edf5ef] p-2.5 text-[#387365]"><Activity size={17}/></span></div>
            <div className="mt-4 space-y-2">{STUDIES.map(item => <button key={item.id} onClick={() => chooseStudy(item.id)} className={studyId === item.id ? 'flex w-full items-center justify-between gap-3 rounded-xl border border-[#91bfae] bg-[#eef7f1] px-3.5 py-3 text-left' : 'flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#fafbf9] px-3.5 py-3 text-left hover:border-slate-300'}><span><span className="block text-xs font-semibold text-slate-800">{item.name}</span><span className="mt-1 block text-[10px] text-slate-500">{item.mode === 'LCA' ? 'Left coronary' : 'Right coronary'} · model-based</span></span>{studyId === item.id ? <Check size={15} className="shrink-0 text-[#357d6c]"/> : <ArrowRight size={14} className="shrink-0 text-slate-300"/>}</button>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => chooseStudy('left-main')} className={mode === 'LCA' ? 'rounded-xl bg-[#173e39] px-3 py-2.5 text-xs font-semibold text-white' : 'rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600'}>Left coronary</button>
              <button onClick={() => chooseStudy('right-coronary')} className={mode === 'RCA' ? 'rounded-xl bg-[#173e39] px-3 py-2.5 text-xs font-semibold text-white' : 'rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600'}>Right coronary</button>
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex items-center justify-between gap-2"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#3e7f70]">C-arm control</div><h2 className="mt-1.5 text-base font-semibold tracking-tight text-slate-900">Adjust the projection</h2></div><button onClick={() => {setPrimary(0);setSecondary(0);}} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Reset angle"><RotateCcw size={14}/></button></div>
            <div className="mt-3 rounded-xl border border-slate-100 bg-[#fafbf9] px-3 pb-1 pt-2"><AngleDial primary={primary} secondary={secondary}/></div>
            <label className="mt-4 block"><span className="flex items-center justify-between text-xs font-semibold text-slate-700"><span>RAO ← → LAO</span><span className="font-mono text-[#2c7668]">{primaryLabel} {Math.abs(primary)}°</span></span><input aria-label="RAO and LAO angle" type="range" min="-90" max="90" step="1" value={primary} onChange={event => {setPrimary(Number(event.target.value));setFeedback('');}} className="mt-3 w-full accent-[#2c7668]"/><span className="mt-1 flex justify-between text-[9px] text-slate-400"><span>RAO 90°</span><span>AP 0°</span><span>LAO 90°</span></span></label>
            <label className="mt-4 block"><span className="flex items-center justify-between text-xs font-semibold text-slate-700"><span>Caudal ↕ Cranial</span><span className="font-mono text-[#b27d35]">{secondaryLabel} {Math.abs(secondary)}°</span></span><input aria-label="Cranial and caudal angle" type="range" min="-50" max="50" step="1" value={secondary} onChange={event => {setSecondary(Number(event.target.value));setFeedback('');}} className="mt-3 w-full accent-[#c18a42]"/><span className="mt-1 flex justify-between text-[9px] text-slate-400"><span>Caudal 50°</span><span>Straight 0°</span><span>Cranial 50°</span></span></label>
            <div className="mt-4 grid grid-cols-2 gap-2">{PRESETS.map(preset => <button key={preset.name} onClick={() => {setPrimary(preset.primary);setSecondary(preset.secondary);setFeedback('');}} className="rounded-xl border border-slate-100 bg-[#fafbf9] px-3 py-2.5 text-left hover:border-[#b4d5c8] hover:bg-[#f1f8f3]"><span className="block text-[11px] font-semibold text-slate-800">{preset.name}</span><span className="mt-1 block text-[9px] text-slate-400">{preset.hint}</span></button>)}</div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff1dd] text-[#9d692b]"><Target size={16}/></span><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9d692b]">Practice objective</div><h2 className="mt-1 text-sm font-semibold text-slate-900">{study.prompt}</h2></div></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{study.clue}</p>
            <button onClick={checkProjection} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#183e39] px-3 py-3 text-xs font-semibold text-white hover:bg-[#245a4f]"><Crosshair size={14}/> Check my projection</button>
            {feedback && <div className={challengeDone ? 'mt-3 rounded-xl border border-[#cfe6d8] bg-[#eff8f2] p-3 text-[11px] leading-5 text-[#2d6e5c]' : 'mt-3 rounded-xl border border-[#e8dfca] bg-[#fff9ed] p-3 text-[11px] leading-5 text-[#856333]'}>{feedback}</div>}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setLabels(value => !value)} className={labels ? 'rounded-lg bg-[#eaf5ef] px-3 py-2 text-[10px] font-semibold text-[#28675a]' : 'rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-500'}>{labels ? 'Hide labels' : 'Show vessel labels'}</button>
                <button onClick={() => setShowHeart(value => !value)} className={showHeart ? 'rounded-lg bg-[#eaf5ef] px-3 py-2 text-[10px] font-semibold text-[#28675a]' : 'rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-500'}>{showHeart ? 'Hide outline' : 'Show outline'}</button>
              </div>
              <label className="mt-3 block"><span className="flex items-center justify-between text-[10px] font-semibold text-slate-600"><span>Image magnification</span><span>{Math.round(zoom * 100)}%</span></span><input aria-label="Image zoom" type="range" min=".7" max="1.35" step=".05" value={zoom} onChange={event => setZoom(Number(event.target.value))} className="mt-2 w-full accent-[#2c7668]"/></label>
            </div>
          </section>

          <div className="flex items-start gap-2 rounded-xl border border-[#e0e7e2] bg-[#edf2ee] px-3.5 py-3 text-[10px] leading-5 text-slate-500"><CircleHelp size={14} className="mt-0.5 shrink-0 text-[#648579]"/> Model-based anatomy and angle projection for learning only. Vessel geometry, contrast behavior and C-arm geometry are simplified; no real angiogram or patient data is shown, and this is not intended for clinical decisions.</div>
        </aside>
      </div>
    </div>
  </div>;
}
