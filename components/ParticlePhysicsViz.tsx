
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  ScanSearch, 
  Rotate3d, 
  RefreshCcw, 
  Minus, 
  Plus, 
  Zap, 
  Activity, 
  Eye, 
  EyeOff, 
  Layers,
  Sparkles,
  Waves,
  Database,
  Crosshair,
  Wind,
  Target,
  Info,
  TrendingUp,
  Atom,
  Flame
} from 'lucide-react';

/* --- Physics Helpers --- */
const project3D = (x: number, y: number, z: number, rotation: {x: number, y: number}, width: number, height: number, fov: number) => {
    let tx = x * Math.cos(rotation.y) - z * Math.sin(rotation.y);
    let tz = z * Math.cos(rotation.y) + x * Math.sin(rotation.y);
    let x1 = tx; let z1 = tz;
    let ty = y * Math.cos(rotation.x) - z1 * Math.sin(rotation.x);
    let z2 = z1 * Math.cos(rotation.x) + y * Math.sin(rotation.x);
    let y1 = ty;
    const scale = fov / (Math.max(1, fov + z2));
    return { x: (width / 2) + x1 * scale, y: (height / 2) + y1 * scale, scale, z: z2 };
};

interface Track {
  id: string;
  type: 'MUON' | 'ELECTRON' | 'PION' | 'PHOTON' | 'NEUTRINO' | 'JET' | 'QUARK' | 'GLUON' | 'W_BOSON';
  pT: number; 
  phi: number; 
  eta: number; 
  charge: number;
  energy: number;
  points: {x: number, y: number, z: number}[];
  parent?: string;
  isVertex?: boolean;
}

interface CalorimeterDeposit {
  theta: number;
  phi: number;
  energy: number;
  layer: 'ECAL' | 'HCAL';
}

export const ParticlePhysicsViz: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 0.4, y: -0.6 });
  const [zoom, setZoom] = useState(0.85);
  const [isColliding, setIsColliding] = useState(false);
  const [eventTime, setEventTime] = useState(-1.5); 
  const eventTimeRef = useRef(-1.5);
  const [magneticField, setMagneticField] = useState(3.8); 
  const [filter, setFilter] = useState<string[]>(['MUON', 'ELECTRON', 'PION', 'PHOTON', 'NEUTRINO', 'JET', 'QUARK', 'GLUON', 'W_BOSON']);
  const [eventType, setEventType] = useState<'Higgs' | 'QCD' | 'W_Decay'>('Higgs');
  const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null);
  
  const tracks = useRef<Track[]>([]);
  const deposits = useRef<CalorimeterDeposit[]>([]);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);

  const generateEvent = (type: 'Higgs' | 'QCD' | 'W_Decay' = 'Higgs') => {
    setEventType(type);
    const newTracks: Track[] = [];
    const newDeposits: CalorimeterDeposit[] = [];
    
    const numPartons = type === 'QCD' ? 6 : 2;
    for (let i = 0; i < numPartons; i++) {
        newTracks.push(createTrack(Math.random() > 0.4 ? 'QUARK' : 'GLUON', 20 + Math.random() * 50, undefined, undefined, true));
    }

    if (type === 'Higgs') {
      const phiOffset = Math.random() * Math.PI;
      for (let i = 0; i < 4; i++) {
        const isMuon = i % 2 === 0;
        const phi = phiOffset + (i * Math.PI / 2) + (Math.random() - 0.5) * 0.4;
        newTracks.push(createTrack(isMuon ? 'MUON' : 'ELECTRON', 60 + Math.random() * 120, (Math.random()-0.5)*2, phi, true));
      }
    } else if (type === 'W_Decay') {
      newTracks.push(createTrack('ELECTRON', 80 + Math.random() * 40, (Math.random()-0.5)*1.5, Math.random()*6.28, true));
      newTracks.push(createTrack('NEUTRINO', 80 + Math.random() * 40, (Math.random()-0.5)*1.5, Math.random()*6.28, true));
    }

    const numHadrons = type === 'QCD' ? 60 : 35;
    for (let j = 0; j < numHadrons; j++) {
      const trk = createTrack('PION', 2 + Math.random() * 20);
      newTracks.push(trk);
      if (Math.random() > 0.6) {
          newDeposits.push({
            theta: 2 * Math.atan(Math.exp(-trk.eta)),
            phi: trk.phi,
            energy: trk.energy * (0.3 + Math.random() * 0.7),
            layer: 'HCAL'
          });
      }
    }

    for (let k = 0; k < 4; k++) {
      const ph = createTrack('PHOTON', 10 + Math.random() * 40);
      newTracks.push(ph);
      newDeposits.push({
        theta: 2 * Math.atan(Math.exp(-ph.eta)),
        phi: ph.phi,
        energy: ph.energy,
        layer: 'ECAL'
      });
    }

    tracks.current = newTracks;
    deposits.current = newDeposits;
    eventTimeRef.current = -1.5;
    setEventTime(-1.5); 
    setIsColliding(true);
    setHoveredTrack(null);
  };

  const createTrack = (type: Track['type'], pT: number, eta?: number, phi?: number, isVertex: boolean = false): Track => {
    const _eta = eta ?? (Math.random() - 0.5) * 5.0;
    const _phi = phi ?? Math.random() * Math.PI * 2;
    const theta = 2 * Math.atan(Math.exp(-_eta));
    const charge = (type === 'MUON' || type === 'ELECTRON' || type === 'PION' || type === 'QUARK') ? (Math.random() > 0.5 ? 1 : -1) : 0;
    
    const points: {x: number, y: number, z: number}[] = [];
    const steps = 100;
    const maxR = (type === 'QUARK' || type === 'GLUON' || type === 'W_BOSON') ? 80 : 450; 
    
    for (let i = 0; i < steps; i++) {
        const r = (i / steps) * maxR;
        const curvature = (0.28 * magneticField * charge) / (pT + 0.01);
        const localPhi = _phi + r * curvature * 0.05;
        const x = r * Math.sin(theta) * Math.cos(localPhi);
        const y = r * Math.sin(theta) * Math.sin(localPhi);
        const z = r * Math.cos(theta);
        points.push({x, y, z});
    }

    return { 
      id: Math.random().toString(36).substr(2, 9),
      type, pT, phi: _phi, eta: _eta, charge, energy: pT * Math.cosh(_eta), points,
      isVertex
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setRotation(r => ({ x: r.x + dy * 0.005, y: r.y + dx * 0.005 }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (eventTimeRef.current > 0.1) {
      const fov = 750 * zoom;
      let found: Track | null = null;
      let minDist = 18;
      const currentETime = eventTimeRef.current;

      for (const track of tracks.current) {
        if (!filter.includes(track.type)) continue;
        const progress = Math.min(1, currentETime);
        const points = track.points.slice(0, Math.floor(track.points.length * progress));
        for (let i = 0; i < points.length; i += 4) {
          const p = project3D(points[i].x, points[i].y, points[i].z, rotation, canvas.width, canvas.height, fov);
          const d = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
          if (d < minDist) {
            minDist = d;
            found = track;
          }
        }
      }
      setHoveredTrack(found);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      if (isColliding) {
        const speed = eventTimeRef.current < 0 ? 0.035 : 0.012;
        eventTimeRef.current = Math.min(2, eventTimeRef.current + speed);
        // Throttle state update for UI to avoid render storm
        if (Math.random() > 0.8) setEventTime(eventTimeRef.current);
      }
      const currentETime = eventTimeRef.current;

      ctx.fillStyle = '#010413';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const fov = 750 * zoom;

      const drawCylinder = (radius: number, height: number, color: string, segments = 32, opacity = 1) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = opacity;
        for (let i = 0; i < segments; i++) {
          const a = (i / segments) * Math.PI * 2;
          const cosA = Math.cos(a);
          const sinA = Math.sin(a);
          const p1 = project3D(cosA * radius, -height/2, sinA * radius, rotation, canvas.width, canvas.height, fov);
          const p2 = project3D(cosA * radius, height/2, sinA * radius, rotation, canvas.width, canvas.height, fov);
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
          
          const nextA = ((i+1) / segments) * Math.PI * 2;
          const p3 = project3D(Math.cos(nextA) * radius, height/2, Math.sin(nextA) * radius, rotation, canvas.width, canvas.height, fov);
          const p4 = project3D(Math.cos(nextA) * radius, -height/2, Math.sin(nextA) * radius, rotation, canvas.width, canvas.height, fov);
          ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p4.x, p4.y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      };

      drawCylinder(100, 300, 'rgba(71, 85, 105, 0.1)'); 
      drawCylinder(240, 500, 'rgba(6, 182, 212, 0.04)'); 
      drawCylinder(360, 600, 'rgba(249, 115, 22, 0.03)'); 
      drawCylinder(450, 800, 'rgba(148, 163, 184, 0.08)'); 

      if (currentETime < 0) {
          const beamDist = Math.abs(currentETime) * 1000;
          const beamRad = 4;
          const p1 = project3D(0, beamDist, 0, rotation, canvas.width, canvas.height, fov);
          const p2 = project3D(0, -beamDist, 0, rotation, canvas.width, canvas.height, fov);
          
          ctx.fillStyle = '#fff';
          ctx.shadowBlur = 25; ctx.shadowColor = '#60a5fa';
          ctx.beginPath(); ctx.arc(p1.x, p1.y, Math.max(0.1, beamRad * p1.scale), 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(p2.x, p2.y, Math.max(0.1, beamRad * p2.scale), 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;

          ctx.strokeStyle = 'rgba(96, 165, 250, 0.2)';
          ctx.setLineDash([5, 15]);
          const bStart = project3D(0, 1500, 0, rotation, canvas.width, canvas.height, fov);
          const bEnd = project3D(0, -1500, 0, rotation, canvas.width, canvas.height, fov);
          ctx.beginPath(); ctx.moveTo(bStart.x, bStart.y); ctx.lineTo(bEnd.x, bEnd.y); ctx.stroke();
          ctx.setLineDash([]);
      }

      if (currentETime >= -0.15 && currentETime < 0.4) {
          const v = project3D(0, 0, 0, rotation, canvas.width, canvas.height, fov);
          const t = currentETime + 0.15;
          const flash = t < 0.1 ? t / 0.1 : Math.max(0, 1 - (t - 0.1) / 0.4);
          const radius = Math.max(0.1, 300 * flash * v.scale);
          
          const grad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, radius);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
          grad.addColorStop(0.5, 'rgba(96, 165, 250, 0.4)');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(v.x, v.y, radius, 0, Math.PI * 2); ctx.fill();
          
          if (t > 0.05) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 * v.scale;
            for(let i=0; i<12; i++) {
                const a = (i/12)*Math.PI*2;
                ctx.beginPath();
                ctx.moveTo(v.x, v.y);
                ctx.lineTo(v.x + Math.cos(a)*100*t*v.scale, v.y + Math.sin(a)*100*t*v.scale);
                ctx.stroke();
            }
          }
      }

      if (currentETime > 0) {
        const progress = Math.min(1.2, currentETime) / 1.2;
        tracks.current.forEach(track => {
          if (!filter.includes(track.type)) return;
          const numPoints = Math.floor(track.points.length * progress);
          const points = track.points.slice(0, numPoints);
          if (points.length < 2) return;

          const isHovered = hoveredTrack?.id === track.id;

          ctx.beginPath();
          points.forEach((pt, i) => {
            const proj = project3D(pt.x, pt.y, pt.z, rotation, canvas.width, canvas.height, fov);
            if (i === 0) ctx.moveTo(proj.x, proj.y); else ctx.lineTo(proj.x, proj.y);
          });

          switch(track.type) {
              case 'MUON': 
                ctx.strokeStyle = '#f87171';
                ctx.lineWidth = isHovered ? 7 : 4; 
                break;
              case 'ELECTRON': 
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = isHovered ? 5 : 2; 
                break;
              case 'PION': 
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
                ctx.lineWidth = isHovered ? 2.5 : 0.8; 
                break;
              case 'PHOTON': 
                ctx.strokeStyle = '#fde047';
                ctx.setLineDash([6, 4]); 
                ctx.lineWidth = isHovered ? 2.5 : 1.2; 
                break;
              case 'QUARK': 
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = isHovered ? 10 : 6; 
                break;
              case 'GLUON': 
                ctx.strokeStyle = '#4ade80';
                ctx.lineWidth = isHovered ? 10 : 6; 
                break;
              case 'NEUTRINO':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.setLineDash([2, 10]);
                ctx.lineWidth = 1;
                break;
              default: ctx.strokeStyle = '#fff'; break;
          }
          if (isHovered) {
             ctx.shadowBlur = 20;
             ctx.shadowColor = ctx.strokeStyle as string;
          }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;

          if (progress < 0.95) {
             const lead = points[points.length - 1];
             const leadP = project3D(lead.x, lead.y, lead.z, rotation, canvas.width, canvas.height, fov);
             ctx.fillStyle = ctx.strokeStyle;
             ctx.beginPath(); ctx.arc(leadP.x, leadP.y, Math.max(0.1, (isHovered ? 4 : 2) * leadP.scale), 0, Math.PI * 2); ctx.fill();
          }
        });
      }

      if (currentETime > 0.8) {
        const depProg = Math.min(1, (currentETime - 0.8) / 0.4);
        deposits.current.forEach(dep => {
            const r = dep.layer === 'ECAL' ? 240 : 360;
            const x = r * Math.sin(dep.theta) * Math.cos(dep.phi);
            const y = r * Math.sin(dep.theta) * Math.sin(dep.phi);
            const z = r * Math.cos(dep.theta);
            const start = project3D(x, y, z, rotation, canvas.width, canvas.height, fov);
            const heightFactor = dep.energy * 0.008 * depProg;
            const end = project3D(x * (1 + heightFactor), y * (1 + heightFactor), z * (1 + heightFactor), rotation, canvas.width, canvas.height, fov);
            
            ctx.lineWidth = Math.max(0.1, 4 * start.scale);
            ctx.strokeStyle = dep.layer === 'ECAL' ? `rgba(34, 211, 238, ${0.7 * depProg})` : `rgba(249, 115, 22, ${0.7 * depProg})`;
            ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
        });
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [rotation, zoom, isColliding, magneticField, filter]); // eventTime removed from dependencies

  const toggleFilter = (type: string) => {
    setFilter(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  return (
    <div className="flex flex-col h-full w-full relative group bg-black overflow-hidden select-none font-mono">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full cursor-move"
        onMouseDown={e => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => isDragging.current = false}
      />

      <div className={`absolute right-6 top-24 w-64 bg-[#010413]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 shadow-2xl z-20 ${hoveredTrack ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-nexus-accent/20 flex items-center justify-center text-nexus-accent border border-nexus-accent/30">
             <Atom size={20} className="animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">{hoveredTrack?.type} RECON</h4>
            <p className="text-[10px] text-nexus-400 font-mono tracking-tighter">Event Segment: {hoveredTrack?.id}</p>
          </div>
        </div>

        <div className="space-y-4">
           <div className="bg-slate-900/50 p-3 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-1">
                 <span className="text-[8px] text-slate-500 uppercase">Momentum (pT)</span>
                 <TrendingUp size={10} className="text-nexus-accent" />
              </div>
              <span className="text-xs font-bold text-slate-200">{(hoveredTrack?.pT || 0).toFixed(2)} GeV/c</span>
           </div>
           
           <div className="bg-slate-900/50 p-3 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-1">
                 <span className="text-[8px] text-slate-500 uppercase">Energy</span>
                 <Zap size={10} className="text-yellow-400" />
              </div>
              <span className="text-xs font-bold text-slate-200">{(hoveredTrack?.energy || 0).toFixed(2)} GeV</span>
           </div>

           <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/50 p-3 rounded-2xl border border-white/5">
                 <span className="text-[8px] text-slate-500 uppercase block mb-1">Charge</span>
                 <span className={`text-xs font-bold ${hoveredTrack?.charge === 0 ? 'text-slate-400' : hoveredTrack?.charge && hoveredTrack.charge > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {hoveredTrack?.charge === 0 ? 'Neutral' : hoveredTrack?.charge && hoveredTrack.charge > 0 ? '+1e' : '-1e'}
                 </span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-2xl border border-white/5">
                 <span className="text-[8px] text-slate-500 uppercase block mb-1">Rapidity (η)</span>
                 <span className="text-xs font-bold text-slate-200">{hoveredTrack?.eta.toFixed(3)}</span>
              </div>
           </div>
           
           <div className="pt-4 border-t border-white/10">
              <p className="text-[9px] text-slate-500 leading-relaxed italic">
                 {hoveredTrack?.type === 'QUARK' || hoveredTrack?.type === 'GLUON' 
                   ? "Primary Parton: Simulation shows early-stage confinement before hadronization." 
                   : "Reconstructed final-state object. Trajectory determined by Lorentz force in 3.8T field."}
              </p>
           </div>
        </div>
      </div>

      <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl">
          <Activity className="text-nexus-accent animate-pulse" size={18} />
          <div className="flex flex-col">
            <span className="text-[10px] text-nexus-400 uppercase tracking-widest font-bold">CERN LHC - Event Display</span>
            <span className="text-xs font-bold text-white uppercase">
                {eventTime < 0 ? 'Beams Synchronizing' : eventTime < 0.2 ? 'LUMINOSITY PEAK' : `${eventType} ANALYSIS`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
           <div className="bg-black/60 backdrop-blur-sm p-2 rounded-lg border border-white/5 flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Center-of-Mass</span>
              <span className="text-[10px] text-nexus-accent font-bold">13.6 TeV</span>
           </div>
           <div className="bg-black/60 backdrop-blur-sm p-2 rounded-lg border border-white/5 flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Solenoid Field</span>
              <span className="text-[10px] text-nexus-purple font-bold">{magneticField} Tesla</span>
           </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 flex flex-col gap-2">
         <div className="bg-black/80 backdrop-blur-xl p-3 rounded-2xl border border-white/10 flex flex-col gap-2 shadow-2xl items-center">
            <div className="text-[8px] text-slate-500 uppercase tracking-tighter mb-1 font-bold">Detector ID</div>
            {[
                {id: 'MUON', color: 'bg-red-500', label: 'μ'},
                {id: 'ELECTRON', color: 'bg-cyan-400', label: 'e'},
                {id: 'QUARK', color: 'bg-purple-500', label: 'q'},
                {id: 'GLUON', color: 'bg-green-500', label: 'g'},
                {id: 'PHOTON', color: 'bg-yellow-400', label: 'γ'},
                {id: 'NEUTRINO', color: 'bg-slate-200/20', label: 'ν'},
            ].map(p => (
                <button 
                    key={p.id}
                    onClick={() => toggleFilter(p.id)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all text-xs font-bold ${
                        filter.includes(p.id) 
                        ? `${p.color} border-white/40 text-black shadow-lg` 
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                >
                    {p.label}
                </button>
            ))}
         </div>
      </div>

      <div className="absolute bottom-8 left-8 right-8 flex flex-col gap-4 items-center">
         <div className="glass-panel p-5 rounded-[2.5rem] flex items-center gap-6 border border-white/5 shadow-2xl max-w-xl w-full">
            <div className="flex gap-2 flex-1">
                <button 
                    onClick={() => generateEvent('Higgs')}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-nexus-500/20 text-nexus-400 border border-nexus-500/50 rounded-2xl font-bold text-xs uppercase hover:bg-nexus-500/30 transition-all shadow-lg active:scale-95"
                >
                    <Flame size={16} className="text-nexus-accent" /> H→4l
                </button>
                <button 
                    onClick={() => generateEvent('QCD')}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-nexus-purple/20 text-nexus-purple border border-nexus-purple/50 rounded-2xl font-bold text-xs uppercase hover:bg-nexus-purple/30 transition-all shadow-lg active:scale-95"
                >
                    <Wind size={16} /> JET SPRAY
                </button>
                <button 
                    onClick={() => generateEvent('W_Decay')}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-800 text-slate-400 border border-slate-700 rounded-2xl font-bold text-xs uppercase hover:bg-slate-700 transition-all shadow-lg active:scale-95"
                >
                    <Zap size={16} /> W DECAY
                </button>
            </div>
            
            <div className="hidden md:block w-px h-12 bg-white/10" />
            
            <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-2xl">
               <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-2 text-slate-500 hover:text-white transition-colors"><Minus size={18} /></button>
               <span className="text-xs font-bold text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="p-2 text-slate-500 hover:text-white transition-colors"><Plus size={18} /></button>
            </div>
         </div>
         
         <div className="flex items-center gap-2 text-[9px] text-nexus-400 bg-nexus-500/5 px-6 py-2 rounded-full border border-nexus-500/10 uppercase tracking-[0.2em] font-bold">
            <Target size={12} />
            <span>{eventTime < 0 ? 'Wait for proton pulse...' : 'Subatomic shower active: High-fidelity particle reconstruction'}</span>
         </div>
      </div>

      <div className="absolute bottom-6 left-6 hidden xl:block pointer-events-none">
         <div className="max-w-[300px] p-5 bg-black/80 backdrop-blur-md rounded-[2rem] border border-white/10 text-[9px] text-slate-400 leading-relaxed shadow-3xl border-l-4 border-l-nexus-accent">
            <div className="flex items-center gap-2 mb-2 text-white font-bold uppercase tracking-tighter">
               <Database size={14} className="text-nexus-accent" />
               LHC EVENT SIMULATION
            </div>
            Protons collide at 99.9999991% light speed. The energy density creates new particles. Curvature in the central tracks measures momentum, while calorimeter blocks measure energy absorption.
         </div>
      </div>
    </div>
  );
};
