
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RefreshCcw, 
  Layers, 
  Zap, 
  Settings, 
  Info,
  Maximize2,
  Minus,
  Plus,
  Compass,
  History,
  Activity
} from 'lucide-react';

/* --- Physics & Stages --- */
type CosmicStage = 'SINGULARITY' | 'INFLATION' | 'CMB' | 'STRUCTURE';

const STAGE_DATA = {
  SINGULARITY: { name: "Singularity", time: "t = 0", temp: "10^32 K", label: "Initial Singularity" },
  INFLATION: { name: "Cosmic Inflation", time: "10^-36s to 10^-32s", temp: "10^27 K", label: "Exponential Expansion" },
  CMB: { name: "Recombination", time: "380,000 Years", temp: "3,000 K", label: "CMB Decoupling" },
  STRUCTURE: { name: "Reionization", time: "400 Million Years", temp: "2.7 K", label: "First Stars & Galaxies" }
};

interface CosmicParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number;
  color: string;
  type: 'quantum' | 'star' | 'galaxy';
  mass: number;
}

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

export const CosmologyViz: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<CosmicStage>('SINGULARITY');
  const [isPaused, setIsPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [rotation, setRotation] = useState({ x: 0.5, y: -0.5 });
  const [zoom, setZoom] = useState(0.8);
  const [showGrid, setShowGrid] = useState(true);
  const [showParticles, setShowParticles] = useState(true);

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const animRef = useRef<number>(0);
  const particles = useRef<CosmicParticle[]>([]);

  const cmbNoise = useMemo(() => {
    const data = [];
    for(let i = 0; i < 400; i++) {
      data.push({
        phi: Math.random() * Math.PI * 2,
        theta: Math.acos(2 * Math.random() - 1),
        val: Math.random()
      });
    }
    return data;
  }, []);

  const initStage = (s: CosmicStage) => {
    particles.current = [];
    if (s === 'INFLATION' || s === 'SINGULARITY') {
       for(let i = 0; i < 1000; i++) {
         particles.current.push({
           x: (Math.random() - 0.5) * 10,
           y: (Math.random() - 0.5) * 10,
           z: (Math.random() - 0.5) * 10,
           vx: (Math.random() - 0.5) * 2,
           vy: (Math.random() - 0.5) * 2,
           vz: (Math.random() - 0.5) * 2,
           size: Math.random() * 2,
           color: '#fff',
           type: 'quantum',
           mass: 1
         });
       }
    } else if (s === 'STRUCTURE') {
       for(let i = 0; i < 500; i++) {
          const r = Math.random() * 400;
          const a = Math.random() * Math.PI * 2;
          particles.current.push({
            x: Math.cos(a) * r,
            y: (Math.random() - 0.5) * 50,
            z: Math.sin(a) * r,
            vx: 0, vy: 0, vz: 0,
            size: Math.random() * 4 + 1,
            color: i % 10 === 0 ? '#60a5fa' : '#ffffff',
            type: 'star',
            mass: Math.random() * 10 + 5
          });
       }
    }
  };

  useEffect(() => {
    initStage(stage);
  }, [stage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      if (!isPaused) timeRef.current += 0.016 * timeScale;
      ctx.fillStyle = '#010413';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const fov = 700 * zoom;

      if (stage === 'SINGULARITY') {
        const pulse = Math.sin(timeRef.current * 10) * 5;
        const p = project3D(0, 0, 0, rotation, canvas.width, canvas.height, fov);
        const radius = Math.max(0.1, (10 + pulse) * p.scale);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, '#fff');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 40; ctx.shadowColor = '#fff';
      } 
      
      else if (stage === 'INFLATION') {
        const expansion = Math.exp(Math.min(5, timeRef.current * 2));
        if (showGrid) {
          ctx.strokeStyle = `rgba(96, 165, 250, ${Math.max(0, 0.4 - expansion/150)})`;
          ctx.lineWidth = 0.5;
          const gSize = 12; const gStep = 40 * expansion;
          for(let i = -gSize; i <= gSize; i++) {
            ctx.beginPath();
            for(let j = -gSize; j <= gSize; j++) {
              const p = project3D(i * gStep, 0, j * gStep, rotation, canvas.width, canvas.height, fov);
              if (j === -gSize) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.beginPath();
            for(let j = -gSize; j <= gSize; j++) {
              const p = project3D(j * gStep, 0, i * gStep, rotation, canvas.width, canvas.height, fov);
              if (j === -gSize) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
          }
        }
        particles.current.forEach(p => {
          p.x *= 1.05; p.y *= 1.05; p.z *= 1.05;
          const proj = project3D(p.x, p.y, p.z, rotation, canvas.width, canvas.height, fov);
          if (proj.scale > 0 && showParticles) {
            ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5 * proj.scale;
            ctx.beginPath(); ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2); ctx.fill();
          }
        });
      }

      else if (stage === 'CMB') {
        const radius = 300;
        cmbNoise.forEach(point => {
          const x = radius * Math.sin(point.theta) * Math.cos(point.phi);
          const y = radius * Math.sin(point.theta) * Math.sin(point.phi);
          const z = radius * Math.cos(point.theta);
          const p = project3D(x, y, z, rotation, canvas.width, canvas.height, fov);
          if (p.scale > 0) {
            ctx.fillStyle = point.val > 0.5 ? `rgba(239, 68, 68, ${p.scale * 0.8})` : `rgba(59, 130, 246, ${p.scale * 0.8})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, 4 * p.scale, 0, Math.PI * 2); ctx.fill();
          }
        });
      }

      else if (stage === 'STRUCTURE') {
        particles.current.forEach(p => {
          particles.current.forEach(other => {
            if (p === other) return;
            const dx = other.x - p.x; const dy = other.y - p.y; const dz = other.z - p.z;
            const d2 = dx*dx + dy*dy + dz*dz + 1000;
            const f = (other.mass * 0.05) / d2;
            p.vx += dx * f; p.vy += dy * f; p.vz += dz * f;
          });
          p.x += p.vx * timeScale; p.y += p.vy * timeScale; p.z += p.vz * timeScale;
          const proj = project3D(p.x, p.y, p.z, rotation, canvas.width, canvas.height, fov);
          if (proj.scale > 0) {
            ctx.fillStyle = p.color; ctx.shadowBlur = p.type === 'star' ? 10 : 0;
            ctx.shadowColor = p.color; ctx.globalAlpha = proj.scale;
            ctx.beginPath(); ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [stage, rotation, timeScale, isPaused, zoom, showGrid, showParticles]);

  return (
    <div className="flex flex-col h-full w-full relative group bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full cursor-move"
        onMouseDown={e => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }}
        onMouseMove={e => {
          if (!isDragging.current) return;
          const dx = e.clientX - lastMouse.current.x;
          const dy = e.clientY - lastMouse.current.y;
          setRotation(r => ({ x: r.x + dy * 0.005, y: r.y + dx * 0.005 }));
          lastMouse.current = { x: e.clientX, y: e.clientY };
        }}
        onMouseUp={() => isDragging.current = false}
      />

      <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl">
          <History className="text-nexus-accent animate-pulse" size={18} />
          <div className="flex flex-col">
            <span className="text-[10px] text-nexus-400 font-mono uppercase tracking-widest">Epoch Status</span>
            <span className="text-sm font-bold text-white">{STAGE_DATA[stage].name}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(STAGE_DATA[stage]).map(([key, val], idx) => (
            key !== 'name' && (
              <div key={idx} className="bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-white/5 flex flex-col">
                <span className="text-[8px] text-slate-500 uppercase font-mono">{key}</span>
                <span className="text-[10px] text-nexus-accent font-bold">{val}</span>
              </div>
            )
          ))}
        </div>
      </div>

      <div className="absolute top-6 right-6 flex flex-col gap-2">
        {(Object.keys(STAGE_DATA) as CosmicStage[]).map(s => (
          <button
            key={s}
            onClick={() => { setStage(s); timeRef.current = 0; }}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
              stage === s 
                ? 'bg-nexus-accent/20 border-nexus-accent text-nexus-accent shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                : 'bg-black/60 border-white/10 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {s === 'SINGULARITY' && <Zap size={12} />}
            {s === 'INFLATION' && <Activity size={12} />}
            {s === 'CMB' && <Compass size={12} />}
            {s === 'STRUCTURE' && <Maximize2 size={12} />}
            {STAGE_DATA[s].name.split(' (')[0]}
          </button>
        ))}
      </div>

      <div className="absolute bottom-6 left-6 right-6 glass-panel p-5 rounded-3xl flex items-center gap-8 opacity-0 group-hover:opacity-100 transition-all duration-500 border border-white/5 shadow-2xl translate-y-2 group-hover:translate-y-0">
        <button onClick={() => setIsPaused(!isPaused)} className="p-4 bg-nexus-500/20 text-nexus-400 rounded-2xl hover:bg-nexus-500/30 transition-all border border-nexus-500/30">
          {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
        </button>

        <div className="flex-1 space-y-3">
          <div className="flex justify-between text-[10px] text-nexus-400 font-mono uppercase tracking-[0.2em]">Temporal Compression <span>{timeScale.toFixed(1)}x</span></div>
          <input 
            type="range" min="0.1" max="10" step="0.1" 
            value={timeScale} 
            onChange={e => setTimeScale(parseFloat(e.target.value))} 
            className="w-full accent-nexus-accent h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer" 
          />
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 rounded-2xl p-2 border border-slate-800">
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-2.5 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"><Minus size={16} /></button>
            <span className="text-sm font-mono w-10 text-center text-slate-100 font-bold">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2.5 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"><Plus size={16} /></button>
        </div>
      </div>
    </div>
  );
};
