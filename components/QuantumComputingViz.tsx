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
  Waves,
  Link,
  Cpu,
  Unlink,
  Binary
} from 'lucide-react';

/* --- Quantum Math Helpers --- */
// Represents a 2 or 3 qubit state vector for Bell/GHZ states
type Complex = { r: number; i: number };
type QubitState = '|0⟩' | '|1⟩' | 'SUPERPOSITION' | 'ENTANGLED';

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

interface Qubit {
  id: number;
  x: number; y: number; z: number;
  alpha: number; // probability amplitude for |0>
  beta: number;  // probability amplitude for |1>
  isEntangled: boolean;
  targetId: number | null;
  color: string;
  name: string;
}

export const QuantumComputingViz: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qubits, setQubits] = useState<Qubit[]>([
    { id: 1, x: -120, y: 0, z: 0, alpha: 1, beta: 0, isEntangled: false, targetId: null, color: '#3b82f6', name: 'Qubit 1' },
    { id: 2, x: 120, y: 0, z: 0, alpha: 1, beta: 0, isEntangled: false, targetId: null, color: '#ef4444', name: 'Qubit 2' },
  ]);
  const [rotation, setRotation] = useState({ x: 0.3, y: -0.4 });
  const [zoom, setZoom] = useState(1);
  const [isObserving, setIsObserving] = useState(false);
  const [decoherence, setDecoherence] = useState(0); // 0 to 1
  
  const isDragging = useRef<number | null>(null); // Stores Qubit ID being dragged
  const lastMouse = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const animRef = useRef<number>(0);

  const applyHadamard = (id: number) => {
    setQubits(prev => prev.map(q => {
      if (q.id === id) {
        // H gate: 1/sqrt(2) * [[1, 1], [1, -1]]
        const newAlpha = (q.alpha + q.beta) / Math.sqrt(2);
        const newBeta = (q.alpha - q.beta) / Math.sqrt(2);
        return { ...q, alpha: newAlpha, beta: newBeta };
      }
      return q;
    }));
  };

  const applyEntangle = () => {
    setQubits(prev => {
      // Logic for Bell State: 1/sqrt(2)(|00> + |11>)
      return prev.map(q => ({
        ...q,
        isEntangled: true,
        alpha: 1/Math.sqrt(2),
        beta: 1/Math.sqrt(2),
        targetId: q.id === 1 ? 2 : 1
      }));
    });
  };

  const applyMeasure = () => {
    const outcome = Math.random() > 0.5 ? 0 : 1;
    setQubits(prev => prev.map(q => ({
      ...q,
      alpha: outcome === 0 ? 1 : 0,
      beta: outcome === 0 ? 0 : 1,
      isEntangled: false,
      targetId: null
    })));
  };

  const resetQubits = () => {
    setQubits([
      { id: 1, x: -120, y: 0, z: 0, alpha: 1, beta: 0, isEntangled: false, targetId: null, color: '#3b82f6', name: 'Qubit 1' },
      { id: 2, x: 120, y: 0, z: 0, alpha: 1, beta: 0, isEntangled: false, targetId: null, color: '#ef4444', name: 'Qubit 2' },
    ]);
    setIsObserving(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      timeRef.current += 0.016;
      ctx.fillStyle = '#010413';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const fov = 700 * zoom;

      // Draw Entanglement Links
      if (qubits[0].isEntangled) {
        const q1 = project3D(qubits[0].x, qubits[0].y, qubits[0].z, rotation, canvas.width, canvas.height, fov);
        const q2 = project3D(qubits[1].x, qubits[1].y, qubits[1].z, rotation, canvas.width, canvas.height, fov);
        
        if (q1.scale > 0 && q2.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(q1.x, q1.y);
          
          // Draw Wavy Pulsating Link
          const dist = Math.sqrt(Math.pow(q2.x - q1.x, 2) + Math.pow(q2.y - q1.y, 2));
          const segments = 40;
          for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const x = q1.x + (q2.x - q1.x) * t;
            const y = q1.y + (q2.y - q1.y) * t;
            const wave = Math.sin(t * 10 + timeRef.current * 5) * 5 * (1 - decoherence);
            ctx.lineTo(x, y + wave);
          }
          
          ctx.strokeStyle = `rgba(34, 211, 238, ${0.4 * (1 - decoherence)})`;
          ctx.lineWidth = 4 * q1.scale;
          ctx.lineCap = 'round';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#06b6d4';
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Flowing Photons animation along the link
          const photonPos = (timeRef.current * 0.5) % 1;
          const px = q1.x + (q2.x - q1.x) * photonPos;
          const py = q1.y + (q2.y - q1.y) * photonPos;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(px, py + Math.sin(photonPos * 10 + timeRef.current * 5) * 5, 3 * q1.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Qubits
      qubits.forEach(q => {
        const p = project3D(q.x, q.y, q.z, rotation, canvas.width, canvas.height, fov);
        if (p.scale > 0) {
          const r = 35 * p.scale;
          
          // Basis State Color Blending (α|0⟩ + β|1⟩)
          // |α|^2 is probability of |0> (blue)
          // |β|^2 is probability of |1> (red)
          const prob0 = Math.pow(q.alpha, 2);
          const prob1 = Math.pow(q.beta, 2);
          
          // Draw Qubit Body with Shaders/Glow
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.5);
          glow.addColorStop(0, q.isEntangled ? 'rgba(34, 211, 238, 0.4)' : `rgba(59, 130, 246, ${prob0 * 0.4})`);
          glow.addColorStop(0.5, q.isEntangled ? 'rgba(168, 85, 247, 0.2)' : `rgba(239, 68, 68, ${prob1 * 0.4})`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Icosahedron-like polyhedral flicker for superposition
          if (Math.abs(q.alpha * q.beta) > 0.1) {
             ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * p.scale})`;
             ctx.lineWidth = 1;
             ctx.beginPath();
             for(let i=0; i<6; i++) {
                 const a = (i/6) * Math.PI * 2 + timeRef.current;
                 const ox = p.x + Math.cos(a) * r;
                 const oy = p.y + Math.sin(a) * r;
                 ctx.moveTo(p.x, p.y);
                 ctx.lineTo(ox, oy);
             }
             ctx.stroke();
          }

          // Basis indicator hemispheres
          ctx.save();
          ctx.globalAlpha = 0.8;
          // Blue for |0>
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, Math.PI / 2, -Math.PI / 2);
          ctx.globalAlpha = prob0 * 0.8 + 0.1;
          ctx.fill();
          // Red for |1>
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, -Math.PI / 2, Math.PI / 2);
          ctx.globalAlpha = prob1 * 0.8 + 0.1;
          ctx.fill();
          ctx.restore();

          // Labels
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px JetBrains Mono';
          ctx.textAlign = 'center';
          ctx.fillText(q.name, p.x, p.y - r - 15);
          
          ctx.font = '10px JetBrains Mono';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          const stateStr = q.isEntangled ? 'ψ = 1/√2(|00⟩+|11⟩)' : `${q.alpha.toFixed(2)}|0⟩ + ${q.beta.toFixed(2)}|1⟩`;
          ctx.fillText(stateStr, p.x, p.y + r + 20);
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [qubits, rotation, zoom, decoherence]);

  return (
    <div className="flex flex-col h-full w-full relative group bg-black overflow-hidden select-none font-mono">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full cursor-move"
        onMouseDown={e => {
            // Simple hit test for qubits (optional, just rotation for now)
            isDragging.current = 100; // special code for rotation
            lastMouse.current = { x: e.clientX, y: e.clientY };
        }}
        onMouseMove={e => {
          if (isDragging.current === null) return;
          const dx = e.clientX - lastMouse.current.x;
          const dy = e.clientY - lastMouse.current.y;
          setRotation(r => ({ x: r.x + dy * 0.005, y: r.y + dx * 0.005 }));
          lastMouse.current = { x: e.clientX, y: e.clientY };
        }}
        onMouseUp={() => isDragging.current = null}
      />

      {/* Quantum HUD */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl">
          <Binary className="text-nexus-accent animate-pulse" size={18} />
          <div className="flex flex-col">
            <span className="text-[10px] text-nexus-400 uppercase tracking-widest">Quantum Register</span>
            <span className="text-sm font-bold text-white">
              {qubits[0].isEntangled ? 'Maximally Entangled' : 'Separable States'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
           <div className="bg-black/40 backdrop-blur-sm p-3 rounded-lg border border-white/5 flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Entanglement Entropy</span>
              <span className="text-[10px] text-nexus-accent font-bold">
                  {qubits[0].isEntangled ? 'S = log₂(2) ≈ 1.00 bits' : 'S = 0.00 bits'}
              </span>
           </div>
           <div className="bg-black/40 backdrop-blur-sm p-3 rounded-lg border border-white/5 flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Fidelity</span>
              <span className="text-[10px] text-emerald-400 font-bold">{(1 - decoherence * 0.4).toFixed(3)} F</span>
           </div>
        </div>
      </div>

      {/* Circuit Controls (Quantum Gates) */}
      <div className="absolute top-6 right-6 flex flex-col gap-4">
        <div className="bg-black/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 flex flex-col gap-3 shadow-2xl items-center">
          <div className="text-[8px] text-slate-500 uppercase tracking-tighter">Apply Gates</div>
          <button 
            onClick={() => applyHadamard(1)}
            className="w-10 h-10 flex items-center justify-center bg-nexus-500/20 text-nexus-400 rounded-xl border border-nexus-500/30 hover:bg-nexus-500/30 transition-all font-bold"
            title="Hadamard Gate (Qubit 1)"
          >
            H
          </button>
          <button 
            onClick={applyEntangle}
            className="w-10 h-10 flex items-center justify-center bg-nexus-accent/20 text-nexus-accent rounded-xl border border-nexus-accent/30 hover:bg-nexus-accent/30 transition-all"
            title="CNOT (Entangle 1 & 2)"
          >
            <Link size={18} />
          </button>
          <div className="h-px w-6 bg-white/10" />
          <button 
            onClick={resetQubits}
            className="w-10 h-10 flex items-center justify-center bg-slate-800 text-slate-400 rounded-xl border border-slate-700 hover:bg-slate-700 transition-all"
            title="Reset Register"
          >
            <RefreshCcw size={18} />
          </button>
        </div>

        <div className="bg-black/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 flex flex-col gap-2">
            <div className="text-[8px] text-slate-500 uppercase tracking-tighter text-center">Noise</div>
            <input 
                type="range" min="0" max="1" step="0.01" value={decoherence}
                onChange={e => setDecoherence(parseFloat(e.target.value))}
                className="w-24 accent-nexus-purple h-1 bg-slate-800 rounded-full"
            />
        </div>
      </div>

      {/* Observation Bar */}
      <div className="absolute bottom-8 left-8 right-8 flex flex-col gap-4 items-center">
         <div className="glass-panel p-4 rounded-3xl flex items-center gap-6 border border-white/5 shadow-2xl max-w-lg w-full">
            <button 
                onClick={applyMeasure}
                className="flex-1 flex items-center justify-center gap-3 py-3 bg-red-500/10 text-red-400 border border-red-500/30 rounded-2xl font-bold tracking-[0.2em] hover:bg-red-500/20 transition-all shadow-xl"
            >
                <Eye size={20} />
                OBSERVE (COLLAPSE)
            </button>
            <div className="w-px h-10 bg-white/10" />
            <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl">
               <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 text-slate-500 hover:text-white"><Minus size={16} /></button>
               <span className="text-xs text-slate-400 w-8 text-center">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="p-2 text-slate-500 hover:text-white"><Plus size={16} /></button>
            </div>
         </div>
         
         {qubits[0].isEntangled && (
            <div className="flex items-center gap-2 text-[10px] text-nexus-accent animate-pulse bg-nexus-accent/5 px-4 py-1.5 rounded-full border border-nexus-accent/10">
                <Zap size={12} />
                <span>Non-local Correlation Active: Changing one affects the other instantly</span>
            </div>
         )}
      </div>

      {/* Physics Insight Tooltip */}
      <div className="absolute bottom-6 left-6 hidden xl:block pointer-events-none">
         <div className="max-w-[260px] p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-[10px] text-slate-400 leading-relaxed shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-white font-bold">
               <Cpu size={12} className="text-nexus-accent" />
               BELL STATE ψ+
            </div>
            Entanglement is a non-local correlation where qubits share a unified wave function. Measuring one resolves the state of the other regardless of distance.
         </div>
      </div>
    </div>
  );
};
