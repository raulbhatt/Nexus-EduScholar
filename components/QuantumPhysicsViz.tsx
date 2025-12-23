
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
  Dna,
  Layers,
  Sparkles,
  Waves
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

interface QuantumParticle {
  x: number; y: number; z: number;
  startX: number; startY: number; startZ: number; 
  r: number; theta: number; phi: number;
  phase: number;
  size: number;
  color: string;
}

export const QuantumPhysicsViz: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [observed, setObserved] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [collapseProgress, setCollapseProgress] = useState(0);
  const [energyLevel, setEnergyLevel] = useState(1);
  const [rotation, setRotation] = useState({ x: 0.3, y: -0.4 });
  const [zoom, setZoom] = useState(1);
  const [showProbabilityMap, setShowProbabilityMap] = useState(true);

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const animRef = useRef<number>(0);
  const collapseAnimRef = useRef<number>(0);
  
  const cloudParticles = useRef<QuantumParticle[]>([]);
  const collapsedState = useRef<QuantumParticle | null>(null);

  const generateCloud = (level: number) => {
    const p: QuantumParticle[] = [];
    const count = 1200;
    
    for (let i = 0; i < count; i++) {
      const rBase = 60 * level;
      const r = rBase + (Math.random() - 0.5) * 40 * level;
      let theta = Math.acos(2 * Math.random() - 1);
      let phi = Math.random() * Math.PI * 2;

      if (level === 2) {
        const bias = Math.cos(theta);
        if (Math.random() > Math.abs(bias)) {
            theta = (Math.random() > 0.5 ? 0.2 : 0.8) * Math.PI;
        }
      } else if (level === 3) {
        if (Math.random() > 0.5) {
            phi += Math.sin(theta * 3) * 0.5;
        }
      }

      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);

      p.push({
        x, y, z,
        startX: x, startY: y, startZ: z,
        r, theta, phi,
        phase: Math.random() * Math.PI * 2,
        size: Math.random() * 1.5 + 0.5,
        color: `hsla(${180 + Math.random() * 40}, 80%, 60%, 0.6)`
      });
    }
    cloudParticles.current = p;

    const target = p[Math.floor(Math.random() * p.length)];
    collapsedState.current = { ...target, size: 4, color: '#06b6d4' };
  };

  useEffect(() => {
    generateCloud(energyLevel);
  }, [energyLevel]);

  useEffect(() => {
    if (isCollapsing) {
      let start: number | null = null;
      const duration = 1200; 

      const animateCollapse = (timestamp: number) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = progress * progress * progress;
        setCollapseProgress(easedProgress);

        if (progress < 1) {
          collapseAnimRef.current = requestAnimationFrame(animateCollapse);
        } else {
          setIsCollapsing(false);
          setObserved(true);
        }
      };
      
      collapseAnimRef.current = requestAnimationFrame(animateCollapse);
      return () => cancelAnimationFrame(collapseAnimRef.current);
    }
  }, [isCollapsing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      timeRef.current += 0.02;
      ctx.fillStyle = '#010413';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const fov = 600 * zoom;

      const nucleusP = project3D(0, 0, 0, rotation, canvas.width, canvas.height, fov);
      if (nucleusP.scale > 0) {
        const radius = Math.max(0.1, 8 * nucleusP.scale);
        const nGrad = ctx.createRadialGradient(nucleusP.x, nucleusP.y, 0, nucleusP.x, nucleusP.y, radius);
        nGrad.addColorStop(0, '#f87171');
        nGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nGrad;
        ctx.beginPath();
        ctx.arc(nucleusP.x, nucleusP.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(nucleusP.x, nucleusP.y, 3 * nucleusP.scale, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!observed || isCollapsing) {
        cloudParticles.current.forEach((p, idx) => {
          let px = p.startX;
          let py = p.startY;
          let pz = p.startZ;

          if (isCollapsing && collapsedState.current) {
            const target = collapsedState.current;
            px = p.startX + (target.startX - p.startX) * collapseProgress;
            py = p.startY + (target.startY - p.startY) * collapseProgress;
            pz = p.startZ + (target.startZ - p.startZ) * collapseProgress;
          }

          const jitterMult = isCollapsing ? (1 - collapseProgress) : 1;
          const jitter = Math.sin(timeRef.current * 2 + p.phase) * 2 * jitterMult;
          
          const proj = project3D(px + jitter, py + jitter, pz + jitter, rotation, canvas.width, canvas.height, fov);
          if (proj.scale > 0) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = (isCollapsing ? (0.4 + collapseProgress * 0.6) : 0.4) * proj.scale;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        
        if (showProbabilityMap && !isCollapsing) {
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const radius = 60 * energyLevel;
            for (let a = 0; a < Math.PI * 2; a += 0.2) {
                const op = project3D(Math.cos(a) * radius, 0, Math.sin(a) * radius, rotation, canvas.width, canvas.height, fov);
                if (a === 0) ctx.moveTo(op.x, op.y); else ctx.lineTo(op.x, op.y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        if (isCollapsing && collapseProgress > 0.7) {
            const pulse = (collapseProgress - 0.7) / 0.3;
            const target = collapsedState.current!;
            const targetP = project3D(target.startX, target.startY, target.startZ, rotation, canvas.width, canvas.height, fov);
            
            ctx.beginPath();
            ctx.arc(targetP.x, targetP.y, Math.max(0.1, pulse * 100 * targetP.scale), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(6, 182, 212, ${1 - pulse})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
      } else {
        if (collapsedState.current) {
            const p = collapsedState.current;
            const proj = project3D(p.x, p.y, p.z, rotation, canvas.width, canvas.height, fov);
            if (proj.scale > 0) {
                const radius = Math.max(0.1, 15 * proj.scale);
                const glow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, radius);
                glow.addColorStop(0, 'rgba(6, 182, 212, 0.8)');
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#06b6d4';
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(nucleusP.x, nucleusP.y);
                ctx.lineTo(proj.x, proj.y);
                ctx.stroke();
                ctx.setLineDash([]);
                
                ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
                ctx.font = '10px JetBrains Mono';
                ctx.fillText(`ψ(x) Collapsed`, proj.x + 10, proj.y - 10);
            }
        }
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [observed, rotation, zoom, energyLevel, showProbabilityMap, isCollapsing, collapseProgress]);

  const handleToggleObservation = () => {
    if (!observed && !isCollapsing) {
        setCollapseProgress(0);
        setIsCollapsing(true);
    } else {
        setObserved(false);
        setIsCollapsing(false);
        setCollapseProgress(0);
        generateCloud(energyLevel);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative group bg-black overflow-hidden select-none font-mono">
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
          <ScanSearch className={`text-nexus-accent ${!observed ? 'animate-pulse' : ''}`} size={18} />
          <div className="flex flex-col">
            <span className="text-[10px] text-nexus-400 uppercase tracking-widest">Quantum State</span>
            <span className="text-sm font-bold text-white">
              {isCollapsing ? 'Collapsing...' : observed ? 'Eigenstate |ψ⟩' : 'Superposition Σ c_i |φ_i⟩'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
           <div className="bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-white/5 flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Energy (n)</span>
              <span className="text-[10px] text-nexus-accent font-bold">{energyLevel} ({(energyLevel * 13.6).toFixed(1)} eV)</span>
           </div>
           <div className="bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-white/5 flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Observer</span>
              <span className={`text-[10px] font-bold ${observed ? 'text-red-400' : 'text-emerald-400'}`}>
                {observed ? 'ACTIVE' : isCollapsing ? 'MEASURING' : 'NONE'}
              </span>
           </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 flex flex-col gap-2">
        <div className="bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 flex flex-col gap-2 shadow-2xl">
          <button 
            onClick={() => setEnergyLevel(l => Math.min(3, l + 1))}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
            title="Increase Energy Level"
          >
            <Plus size={18} />
          </button>
          <button 
            onClick={() => setEnergyLevel(l => Math.max(1, l - 1))}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
            title="Decrease Energy Level"
          >
            <Minus size={18} />
          </button>
          <div className="h-px bg-white/10 mx-1 my-1" />
          <button 
            onClick={() => setShowProbabilityMap(!showProbabilityMap)}
            className={`p-2.5 rounded-xl transition-all border ${showProbabilityMap ? 'bg-nexus-500/20 border-nexus-500/50 text-nexus-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
            title="Toggle Probability Map"
          >
            <Layers size={18} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 left-8 right-8 flex flex-col gap-4 items-center">
         <div className="glass-panel p-4 rounded-3xl flex items-center gap-6 border border-white/5 shadow-2xl max-w-lg w-full">
            <button 
                onClick={handleToggleObservation}
                disabled={isCollapsing}
                className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-2xl font-bold tracking-[0.2em] transition-all border disabled:opacity-50 ${
                    observed 
                    ? 'bg-nexus-purple/20 text-nexus-purple border-nexus-purple/50 hover:bg-nexus-purple/30' 
                    : isCollapsing 
                    ? 'bg-nexus-accent/10 text-nexus-accent border-nexus-accent/30'
                    : 'bg-nexus-500/20 text-nexus-400 border-nexus-500/50 hover:bg-nexus-500/30'
                }`}
            >
                {observed ? <EyeOff size={20} /> : isCollapsing ? <Waves size={20} className="animate-spin" /> : <Eye size={20} />}
                {isCollapsing ? 'COLLAPSING...' : observed ? 'RE-SUPERPOSE SYSTEM' : 'COLLAPSE WAVE FUNCTION'}
            </button>
            <div className="w-px h-10 bg-white/10" />
            <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl">
               <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 text-slate-500 hover:text-white"><Minus size={16} /></button>
               <span className="text-xs text-slate-400 w-8 text-center">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="p-2 text-slate-500 hover:text-white"><Plus size={16} /></button>
            </div>
         </div>
         
         {!observed && !isCollapsing && (
            <div className="flex items-center gap-2 text-[10px] text-nexus-400 animate-pulse bg-nexus-500/5 px-4 py-1.5 rounded-full border border-nexus-500/10">
                <Sparkles size={12} />
                <span>Probabilistic Distribution represents the electron's Wave Function</span>
            </div>
         )}
      </div>

      <div className="absolute bottom-6 left-6 hidden xl:block">
         <div className="max-w-[240px] p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-[10px] text-slate-400 leading-relaxed">
            <div className="flex items-center gap-2 mb-2 text-white font-bold">
               <Activity size={12} className="text-nexus-accent" />
               PHYSICS INSIGHT
            </div>
            In the Copenhagen interpretation, a quantum system remains in superposition until a measurement is made, at which point the wave function "collapses" into a single definite eigenstate.
         </div>
      </div>
    </div>
  );
};
