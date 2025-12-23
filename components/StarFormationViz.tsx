import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RefreshCcw, 
  Layers, 
  Wind, 
  Zap, 
  Search, 
  Settings, 
  Info,
  ChevronRight,
  Maximize2,
  // Added missing Minus and Plus icons
  Minus,
  Plus
} from 'lucide-react';

/* --- Physics Constants --- */
const STAGE_CONFIGS = {
  CLOUD: { name: "Molecular Cloud", density: "10^-20 g/cm³", temp: "10 K" },
  ACCRETION: { name: "Protostellar Core", density: "10^-12 g/cm³", temp: "2,000 K", rate: "10^-6 M☉/yr" },
  ATMOSPHERE: { name: "Stellar Atmosphere (R-MHD)", density: "10^-7 g/cm³", temp: "5,800 K", bField: "10-100 μG" }
};

type Stage = 'CLOUD' | 'ACCRETION' | 'ATMOSPHERE';

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number;
  color: string;
  type: 'dust' | 'plasma' | 'jet';
  life?: number;
}

const project3D = (x: number, y: number, z: number, rotation: {x: number, y: number}, width: number, height: number, fov: number) => {
    let tx = x * Math.cos(rotation.y) - z * Math.sin(rotation.y);
    let tz = z * Math.cos(rotation.y) + x * Math.sin(rotation.y);
    let x1 = tx; let z1 = tz;
    let ty = y * Math.cos(rotation.x) - z1 * Math.sin(rotation.x);
    let z2 = z1 * Math.cos(rotation.x) + y * Math.sin(rotation.x);
    let y1 = ty;
    const scale = fov / (fov + z2);
    return { x: (width / 2) + x1 * scale, y: (height / 2) + y1 * scale, scale, z: z2 };
};

export const StarFormationViz: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<Stage>('CLOUD');
  const [isPaused, setIsPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [rotation, setRotation] = useState({ x: 0.4, y: -0.4 });
  const [showMagneticFields, setShowMagneticFields] = useState(true);
  const [showDust, setShowDust] = useState(true);
  const [zoom, setZoom] = useState(1);

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const particles = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const animRef = useRef<number>(0);

  const initStage = (s: Stage) => {
    particles.current = [];
    if (s === 'CLOUD') {
      for (let i = 0; i < 2000; i++) {
        const r = 200 + Math.random() * 300;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        particles.current.push({
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi),
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          vz: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 3 + 1,
          color: `hsla(${240 + Math.random() * 60}, 70%, 50%, 0.4)`,
          type: 'dust'
        });
      }
    } else if (s === 'ACCRETION') {
      for (let i = 0; i < 1500; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 50 + Math.random() * 250;
        particles.current.push({
          x: Math.cos(angle) * r,
          y: (Math.random() - 0.5) * 20,
          z: Math.sin(angle) * r,
          vx: -Math.sin(angle) * 2,
          vy: 0,
          vz: Math.cos(angle) * 2,
          size: Math.random() * 2 + 1,
          color: '#fb923c',
          type: 'dust'
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
      const fov = 600 * zoom;

      // Draw Stage Content
      if (stage === 'CLOUD') {
        const collapseFactor = Math.min(1, timeRef.current * 0.05);
        particles.current.forEach(p => {
          // Gravitational attraction to center
          const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
          p.vx -= (p.x / dist) * 0.1 * timeScale;
          p.vy -= (p.y / dist) * 0.1 * timeScale;
          p.vz -= (p.z / dist) * 0.1 * timeScale;
          
          p.x += p.vx * timeScale;
          p.y += p.vy * timeScale;
          p.z += p.vz * timeScale;

          const proj = project3D(p.x, p.y, p.z, rotation, canvas.width, canvas.height, fov);
          if (proj.scale > 0 && showDust) {
            ctx.fillStyle = dist < 100 ? '#ef4444' : p.color;
            ctx.globalAlpha = 0.3 * proj.scale;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      } else if (stage === 'ACCRETION') {
        // Accretion Disk and Jets
        const core = project3D(0, 0, 0, rotation, canvas.width, canvas.height, fov);
        
        // Central Protostar
        const glow = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, 30 * core.scale);
        glow.addColorStop(0, '#fff7ed');
        glow.addColorStop(0.5, '#fb923c');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(core.x, core.y, 30 * core.scale, 0, Math.PI * 2);
        ctx.fill();

        // Accretion Particles
        particles.current.forEach(p => {
          const angle = Math.atan2(p.z, p.x);
          const r = Math.sqrt(p.x * p.x + p.z * p.z);
          const orbitalSpeed = Math.sqrt(2000 / r);
          
          p.vx = -Math.sin(angle) * orbitalSpeed + (Math.random() - 0.5) * 0.5;
          p.vz = Math.cos(angle) * orbitalSpeed + (Math.random() - 0.5) * 0.5;
          
          // Infall velocity
          p.x += (p.vx - (p.x/r) * 0.5) * timeScale;
          p.z += (p.vz - (p.z/r) * 0.5) * timeScale;
          
          if (r < 20) {
            p.x = Math.cos(Math.random() * 6.28) * 300;
            p.z = Math.sin(Math.random() * 6.28) * 300;
          }

          const proj = project3D(p.x, p.y, p.z, rotation, canvas.width, canvas.height, fov);
          if (proj.scale > 0) {
            ctx.fillStyle = '#fed7aa';
            ctx.globalAlpha = (r / 300) * proj.scale;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Bipolar Jets
        ctx.lineWidth = 15 * core.scale;
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.3)';
        const jetLen = 400;
        const topJet = project3D(0, -jetLen, 0, rotation, canvas.width, canvas.height, fov);
        const botJet = project3D(0, jetLen, 0, rotation, canvas.width, canvas.height, fov);
        
        ctx.beginPath();
        ctx.moveTo(core.x, core.y);
        ctx.lineTo(topJet.x, topJet.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(core.x, core.y);
        ctx.lineTo(botJet.x, botJet.y);
        ctx.stroke();
      } else if (stage === 'ATMOSPHERE') {
        // R-MHD Photosphere & Granulation
        const rows = 12, cols = 12;
        const cellSize = 600 / rows;
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            const noise = Math.sin(i * 0.5 + timeRef.current) * Math.cos(j * 0.5 + timeRef.current);
            ctx.fillStyle = noise > 0 ? '#f97316' : '#ea580c';
            ctx.fillRect(i * cellSize, j * cellSize, cellSize - 2, cellSize - 2);
          }
        }

        // Magnetic Field Lines
        if (showMagneticFields) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.6;
          for (let k = 0; k < 5; k++) {
            const ox = 100 + k * 120;
            const oy = 300;
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            ctx.bezierCurveTo(ox + 50, oy - 200 - Math.sin(timeRef.current) * 50, ox + 100, oy - 200, ox + 150, oy);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [stage, rotation, timeScale, isPaused, zoom, showMagneticFields, showDust]);

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

      {/* Science HUD Overlay */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl">
          <Layers className="text-nexus-accent animate-pulse" size={18} />
          <div className="flex flex-col">
            <span className="text-[10px] text-nexus-400 font-mono uppercase tracking-widest">Active Simulation</span>
            <span className="text-sm font-bold text-white">{STAGE_CONFIGS[stage].name}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(STAGE_CONFIGS[stage]).map(([key, val], idx) => (
            key !== 'name' && (
              <div key={idx} className="bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-white/5 flex flex-col">
                <span className="text-[8px] text-slate-500 uppercase font-mono">{key}</span>
                <span className="text-[10px] text-nexus-accent font-bold">{val}</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Phase Selector */}
      <div className="absolute top-6 right-6 flex flex-col gap-2">
        {(['CLOUD', 'ACCRETION', 'ATMOSPHERE'] as Stage[]).map(s => (
          <button
            key={s}
            onClick={() => { setStage(s); timeRef.current = 0; }}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
              stage === s 
                ? 'bg-nexus-accent/20 border-nexus-accent text-nexus-accent shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                : 'bg-black/60 border-white/10 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {s === 'CLOUD' && <RefreshCcw size={12} />}
            {s === 'ACCRETION' && <Wind size={12} />}
            {s === 'ATMOSPHERE' && <Zap size={12} />}
            {STAGE_CONFIGS[s].name.split(' (')[0]}
          </button>
        ))}
      </div>

      {/* Simulation Toolbox */}
      <div className="absolute bottom-24 right-6 flex flex-col gap-2">
        <div className="bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 flex flex-col gap-2 shadow-2xl">
          <button onClick={() => setShowMagneticFields(!showMagneticFields)} className={`p-2 rounded-xl transition-all ${showMagneticFields ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:bg-white/5'}`} title="Toggle Magnetic Fields">
            <Zap size={20} />
          </button>
          <button onClick={() => setShowDust(!showDust)} className={`p-2 rounded-xl transition-all ${showDust ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:bg-white/5'}`} title="Toggle Dust Layers">
            <Layers size={20} />
          </button>
          <div className="h-px bg-white/10 mx-1" />
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 text-slate-400 hover:bg-white/5 rounded-xl"><Settings size={20} /></button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-6 left-6 right-6 glass-panel p-5 rounded-3xl flex items-center gap-8 opacity-0 group-hover:opacity-100 transition-all duration-500 border border-white/5 shadow-2xl translate-y-2 group-hover:translate-y-0">
        <button onClick={() => setIsPaused(!isPaused)} className="p-4 bg-nexus-500/20 text-nexus-400 rounded-2xl hover:bg-nexus-500/30 transition-all border border-nexus-500/30">
          {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
        </button>

        <div className="flex-1 space-y-3">
          <div className="flex justify-between text-[10px] text-nexus-400 font-mono uppercase tracking-[0.2em]">Temporal Compression <span>{timeScale.toFixed(1)}x (10^5 yrs/s)</span></div>
          <input 
            type="range" min="0.1" max="10" step="0.1" 
            value={timeScale} 
            onChange={e => setTimeScale(parseFloat(e.target.value))} 
            className="w-full accent-nexus-accent h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer" 
          />
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 rounded-2xl p-2 border border-slate-800">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2.5 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"><Minus size={16} /></button>
            <span className="text-sm font-mono w-10 text-center text-slate-100 font-bold">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2.5 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"><Plus size={16} /></button>
        </div>
      </div>
    </div>
  );
};
