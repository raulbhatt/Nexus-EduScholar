
import React, { useEffect, useRef, useState } from 'react';
import { 
  Cpu, 
  Activity, 
  Settings, 
  Zap, 
  Layers, 
  Maximize2, 
  Minus, 
  Plus, 
  Play, 
  Pause, 
  Database,
  RefreshCcw,
  Target,
  ChevronRight,
  Info,
  Eye,
  EyeOff,
  Dice5,
  ShieldAlert,
  BarChart3
} from 'lucide-react';

/* --- 3D Projection Helper --- */
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

/* --- Types --- */
interface Node {
  id: string;
  x: number; y: number; z: number;
  layer: 'INPUT' | 'HIDDEN_1' | 'HIDDEN_2' | 'OUTPUT';
  color: string;
  active: number; 
  internalRotation: number;
  val: number; // Computed scalar value (0-1)
}

interface Connection {
  fromId: string;
  toId: string;
  path: {x: number, y: number, z: number}[];
}

interface Signal {
  fromId: string;
  toId: string;
  progress: number;
  intensity: number;
  jitterOffset: number;
}

interface Aura {
  x: number; y: number; z: number;
  radius: number;
  opacity: number;
}

export const AINeuralNetworkViz: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 0.2, y: -0.6 });
  const [zoom, setZoom] = useState(0.9);
  const [speed, setSpeed] = useState(1.5);
  const [threshold, setThreshold] = useState(0.5);
  const [dropoutRate, setDropoutRate] = useState(0.1); 
  const [noiseLevel, setNoiseLevel] = useState(0.05); 
  const [isPaused, setIsPaused] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const nodes = useRef<Node[]>([]);
  const connections = useRef<Connection[]>([]);
  const signals = useRef<Signal[]>([]);
  const auras = useRef<Aura[]>([]);
  const lastMouse = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const timeRef = useRef(0);
  const animRef = useRef<number>(0);

  const initNetwork = () => {
    const newNodes: Node[] = [];
    const newConns: Connection[] = [];

    // Input Layer (4 nodes)
    for (let i = 0; i < 4; i++) {
      newNodes.push({
        id: `IN-${i}`,
        layer: 'INPUT',
        x: -300,
        y: (i - 1.5) * 100,
        z: 0,
        color: '#3b82f6',
        active: 0,
        internalRotation: 0,
        val: Math.random()
      });
    }

    // Hidden Layer 1 (6 nodes, 3x2 grid)
    for (let i = 0; i < 6; i++) {
      newNodes.push({
        id: `H1-${i}`,
        layer: 'HIDDEN_1',
        x: -100,
        y: (Math.floor(i / 2) - 1) * 80,
        z: (i % 2 - 0.5) * 80,
        color: '#22c55e',
        active: 0,
        internalRotation: 0,
        val: 0
      });
    }

    // Hidden Layer 2 (6 nodes, 3x2 grid)
    for (let i = 0; i < 6; i++) {
      newNodes.push({
        id: `H2-${i}`,
        layer: 'HIDDEN_2',
        x: 100,
        y: (Math.floor(i / 2) - 1) * 80,
        z: (i % 2 - 0.5) * 80,
        color: '#22c55e',
        active: 0,
        internalRotation: 0,
        val: 0
      });
    }

    // Output Layer (3 nodes)
    for (let i = 0; i < 3; i++) {
      newNodes.push({
        id: `OUT-${i}`,
        layer: 'OUTPUT',
        x: 300,
        y: 0,
        z: (i - 1) * 120,
        color: '#ef4444',
        active: 0,
        internalRotation: 0,
        val: Math.random() * 0.9 + 0.1
      });
    }

    const buildConns = (fromLayer: string, toLayer: string) => {
      const froms = newNodes.filter(n => n.layer === fromLayer);
      const tos = newNodes.filter(n => n.layer === toLayer);
      froms.forEach(f => {
        tos.forEach(t => {
          const path = [];
          for (let step = 0; step <= 20; step++) {
            const tParam = step / 20;
            const bend = Math.sin(tParam * Math.PI) * 20;
            path.push({
              x: f.x + (t.x - f.x) * tParam,
              y: f.y + (t.y - f.y) * tParam + bend,
              z: f.z + (t.z - f.z) * tParam
            });
          }
          newConns.push({ fromId: f.id, toId: t.id, path });
        });
      });
    };

    buildConns('INPUT', 'HIDDEN_1');
    buildConns('HIDDEN_1', 'HIDDEN_2');
    buildConns('HIDDEN_2', 'OUTPUT');

    nodes.current = newNodes;
    connections.current = newConns;
    signals.current = [];
    auras.current = [];
  };

  useEffect(() => {
    initNetwork();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      if (!isPaused) {
        timeRef.current += 0.016 * speed;

        if (Math.random() < 0.08 * speed) {
          const inputs = nodes.current.filter(n => n.layer === 'INPUT');
          const source = inputs[Math.floor(Math.random() * inputs.length)];
          source.active = 1.0;
          auras.current.push({ x: source.x, y: source.y, z: source.z, radius: 20, opacity: 0.8 });
          
          connections.current.filter(c => c.fromId === source.id).forEach(c => {
            if (Math.random() > dropoutRate) {
              signals.current.push({ 
                fromId: c.fromId, 
                toId: c.toId, 
                progress: 0, 
                intensity: 1.0, 
                jitterOffset: (Math.random() - 0.5) * noiseLevel * 40
              });
            }
          });
        }

        const nextSignals: Signal[] = [];
        const activeSignals = signals.current.filter(s => {
          const noiseJitter = (Math.random() - 0.5) * noiseLevel * 0.05;
          s.progress += (0.02 * speed) + noiseJitter;
          
          if (s.progress >= 1.0) {
            const target = nodes.current.find(n => n.id === s.toId);
            if (target) {
              target.active = 1.0;
              // Slightly perturb value on activation
              target.val = Math.max(0.1, Math.min(0.99, target.val + (Math.random() - 0.5) * 0.05));
              
              if (target.layer === 'HIDDEN_1' || target.layer === 'HIDDEN_2') {
                connections.current.filter(c => c.fromId === target.id).forEach(c => {
                  if (Math.random() > dropoutRate && s.intensity > (threshold * 0.4)) { 
                    nextSignals.push({ 
                      fromId: c.fromId, 
                      toId: c.toId, 
                      progress: 0, 
                      intensity: s.intensity * (0.9 + Math.random() * 0.1),
                      jitterOffset: (Math.random() - 0.5) * noiseLevel * 40
                    });
                  }
                });
              }
            }
            return false;
          }
          return true;
        });
        
        signals.current = [...activeSignals, ...nextSignals];

        nodes.current.forEach(n => {
          if (n.active > 0) n.active -= 0.04 * speed;
          n.internalRotation += 0.1 * speed;
        });

        auras.current = auras.current.filter(a => {
          a.radius += 4 * speed;
          a.opacity -= 0.02 * speed;
          return a.opacity > 0;
        });
      }

      ctx.fillStyle = '#010413';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const fov = 750 * zoom;

      connections.current.forEach(conn => {
        const fromNode = nodes.current.find(n => n.id === conn.fromId)!;
        const activeSignal = signals.current.find(s => s.fromId === conn.fromId && s.toId === conn.toId);
        
        let alpha = 0.03 + (fromNode.active * 0.08); 
        let lineWidth = 0.5;

        if (activeSignal) {
          alpha = 0.12 + (activeSignal.intensity * 0.4); 
          lineWidth = 0.8 + (activeSignal.intensity * 2);
        }

        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        conn.path.forEach((pt, i) => {
          const p = project3D(pt.x, pt.y, pt.z, rotation, canvas.width, canvas.height, fov);
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        });
        
        ctx.strokeStyle = activeSignal ? `rgba(255, 255, 255, ${alpha})` : `rgba(100, 116, 139, ${alpha})`;
        ctx.stroke();
      });

      auras.current.forEach(a => {
        const p = project3D(a.x, a.y, a.z, rotation, canvas.width, canvas.height, fov);
        if (p.scale > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, a.radius * p.scale, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(59, 130, 246, ${a.opacity})`;
          ctx.lineWidth = 2 * p.scale;
          ctx.stroke();
        }
      });

      signals.current.forEach(s => {
        const conn = connections.current.find(c => c.fromId === s.fromId && c.toId === s.toId)!;
        const pointIdx = Math.floor(Math.max(0, Math.min(1, s.progress)) * (conn.path.length - 1));
        const pt = conn.path[pointIdx];
        
        const p = project3D(pt.x + s.jitterOffset * Math.sin(timeRef.current * 10), pt.y + s.jitterOffset * Math.cos(timeRef.current * 10), pt.z, rotation, canvas.width, canvas.height, fov);
        
        if (p.scale > 0) {
          const r = Math.max(0.1, (5 + noiseLevel * 10) * p.scale);
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.5);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(0.4, `rgba(255, 255, 255, ${s.intensity * 0.8})`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2); ctx.fill();
        }
      });

      nodes.current.forEach(n => {
        const p = project3D(n.x, n.y, n.z, rotation, canvas.width, canvas.height, fov);
        if (p.scale > 0) {
          const isOutput = n.layer === 'OUTPUT';
          const baseRadius = (isOutput ? 24 : 18) * p.scale;
          const radius = baseRadius * (1 + n.active * 0.25);
          
          let nodeColor = n.color;
          if (isOutput) {
            // Output color intensity based on its computed 'val'
            // We interpolate from dark red to bright glowing red/white
            const intensity = 0.3 + n.val * 0.7;
            const r = Math.floor(239 * intensity);
            const g = Math.floor(68 * intensity + n.active * 100);
            const b = Math.floor(68 * intensity + n.active * 100);
            nodeColor = `rgb(${r}, ${g}, ${b})`;
          } else if ((n.layer === 'HIDDEN_1' || n.layer === 'HIDDEN_2') && n.active > 0) {
            const r = Math.floor(34 + (234 - 34) * n.active);
            const g = Math.floor(197 + (179 - 197) * n.active);
            const b = Math.floor(94 + (32 - 94) * n.active);
            nodeColor = `rgb(${r}, ${g}, ${b})`;
          }
          
          ctx.shadowBlur = Math.max(0, (isOutput ? 30 : 20) * n.active * p.scale);
          ctx.shadowColor = nodeColor;

          const grad = ctx.createRadialGradient(p.x - radius * 0.3, p.y - radius * 0.3, radius * 0.1, p.x, p.y, radius);
          grad.addColorStop(0, n.active > 0.5 ? '#fff' : nodeColor);
          grad.addColorStop(1, '#000');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;

          if (n.layer === 'HIDDEN_1' || n.layer === 'HIDDEN_2') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(n.internalRotation);
            ctx.globalAlpha = 0.4 + n.active * 0.6;
            for (let i = 0; i < 4; i++) {
               const angle = (i / 4) * Math.PI * 2;
               const d = radius * 0.55;
               ctx.fillStyle = n.active > 0.1 ? '#fbbf24' : '#fff';
               ctx.beginPath(); ctx.arc(Math.cos(angle) * d, Math.sin(angle) * d, 1.2 * p.scale, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
          }
          
          if (isOutput) {
            // Enhanced Output Indicators
            ctx.textAlign = 'center';
            
            // 1. Numerical Label
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.4, n.active * 2)})`;
            ctx.font = `bold ${10 * p.scale + 4}px JetBrains Mono`;
            ctx.fillText(n.val.toFixed(2), p.x, p.y - radius - 20);

            // 2. Bar Meter
            const barW = 8 * p.scale;
            const barH = 60 * p.scale;
            const barX = p.x + radius + 15;
            const barY = p.y - barH / 2;

            // Bar Background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(barX, barY, barW, barH);
            
            // Value Fill
            const fillH = barH * n.val;
            const fillGrad = ctx.createLinearGradient(barX, barY + barH, barX, barY);
            fillGrad.addColorStop(0, '#ef4444');
            fillGrad.addColorStop(1, '#f87171');
            ctx.fillStyle = fillGrad;
            ctx.fillRect(barX, barY + (barH - fillH), barW, fillH);

            // Activation Glow on Bar
            if (n.active > 0) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${n.active})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);
            }
            
            // Confidence Score Label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '7px JetBrains Mono';
            ctx.fillText('CONF', barX + barW / 2, barY + barH + 10);
          }
        }
      });
      animRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [rotation, zoom, speed, threshold, dropoutRate, noiseLevel, isPaused]);

  return (
    <div className="flex flex-col h-full w-full relative group bg-black overflow-hidden select-none font-sans">
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
        onMouseLeave={() => isDragging.current = false}
      />

      {/* UI Panels */}
      <div className={`absolute top-5 left-5 flex flex-col gap-2 transition-all duration-500 ${showUI ? 'opacity-100' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
        <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
          <Cpu className="text-nexus-accent" size={16} />
          <div className="flex flex-col">
            <span className="text-[9px] text-nexus-400 uppercase tracking-widest font-bold">Neural Engine v8.0</span>
            <span className="text-[10px] text-white font-bold uppercase flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               CONNECTED
            </span>
          </div>
        </div>
      </div>

      <div className={`absolute top-5 right-5 flex flex-col gap-2 transition-all duration-500 ${showUI ? 'opacity-100' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
        <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-3 w-64">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Settings size={12} className="text-slate-400" />
                    <span className="text-[9px] text-slate-400 uppercase font-bold">System Tuning</span>
                </div>
                <button onClick={initNetwork} className="p-1.5 hover:bg-white/5 rounded-lg text-nexus-accent transition-colors">
                    <RefreshCcw size={12} />
                </button>
            </div>
            
            <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase">
                    <span>Inference Speed</span>
                    <span className="text-nexus-accent">{speed.toFixed(1)}x</span>
                </div>
                <input type="range" min="0.5" max="4" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-nexus-accent cursor-pointer" />
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase">
                    <span>Activation Gate</span>
                    <span className="text-nexus-purple">{threshold.toFixed(2)}</span>
                </div>
                <input type="range" min="0.1" max="0.9" step="0.05" value={threshold} onChange={e => setThreshold(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-nexus-purple cursor-pointer" />
            </div>

            <div className="h-px bg-white/5 my-1" />

            <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase">
                    <span className="flex items-center gap-1"><Dice5 size={8} /> Jitter</span>
                    <span className="text-amber-400">{noiseLevel.toFixed(2)}</span>
                </div>
                <input type="range" min="0" max="0.5" step="0.01" value={noiseLevel} onChange={e => setNoiseLevel(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-amber-400 cursor-pointer" />
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase">
                    <span className="flex items-center gap-1"><ShieldAlert size={8} /> Dropout</span>
                    <span className="text-red-400">{(dropoutRate * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="0.6" step="0.05" value={dropoutRate} onChange={e => setDropoutRate(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-red-400 cursor-pointer" />
            </div>
        </div>
      </div>

      <div className={`absolute bottom-24 left-5 flex flex-col gap-2 transition-all duration-500 ${showUI ? 'opacity-100' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
         <div className="bg-black/40 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
                <Layers size={12} className="text-nexus-accent" />
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Layers: 4 -> 6 -> 6 -> 3</span>
            </div>
            <div className="flex items-center gap-2">
                <Activity size={12} className="text-nexus-purple" />
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Active Signals: {signals.current.length}</span>
            </div>
         </div>
      </div>

      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 transition-all duration-500 ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <div className="glass-panel px-6 py-3 rounded-full flex items-center gap-6 border border-white/10 shadow-2xl">
            <button onClick={() => setIsPaused(!isPaused)} className="text-nexus-accent hover:scale-110 transition-transform">
              {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
            </button>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-4">
                <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="text-slate-500 hover:text-white transition-colors"><Minus size={16} /></button>
                <span className="text-[10px] font-mono w-8 text-center text-slate-400">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="text-slate-500 hover:text-white transition-colors"><Plus size={16} /></button>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <button onClick={() => setShowDetails(!showDetails)} className={`text-xs font-bold uppercase tracking-widest transition-colors ${showDetails ? 'text-nexus-accent' : 'text-slate-500'}`}>
                {showDetails ? 'Hide Theory' : 'Show Theory'}
            </button>
        </div>
      </div>

      <div className={`absolute top-5 right-[24rem] transition-all duration-500 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
         <button onClick={() => setShowUI(!showUI)} className="p-2.5 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all">
            {showUI ? <EyeOff size={18} /> : <Eye size={18} />}
         </button>
      </div>

      <div className={`absolute right-5 bottom-24 w-72 bg-black/90 backdrop-blur-xl rounded-3xl border border-white/10 p-6 transition-all duration-500 shadow-3xl ${showDetails ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
         <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-nexus-accent" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Output Inference</h4>
         </div>
         <p className="text-[10px] text-slate-400 leading-relaxed font-light mb-4">
            The output layer performs the <strong>Softmax</strong> or <strong>Logit</strong> computation. 
            Final activation levels represent class probabilities. Observe the bar meters indicating the network's final confidence scores.
         </p>
         <div className="space-y-2 border-t border-white/5 pt-4">
            <div className="flex items-center gap-2 text-[9px] text-nexus-purple">
                <Target size={12} /> <span>Classification Certainty</span>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-red-400">
                <Zap size={12} /> <span>Dynamic Weight Recalculation</span>
            </div>
         </div>
         <button onClick={() => setShowDetails(false)} className="mt-6 w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] text-slate-500 uppercase font-bold transition-all">
            Close Panel
         </button>
      </div>

      {!showUI && (
        <button onClick={() => setShowUI(true)} className="absolute top-5 left-5 p-2.5 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all">
            <Eye size={18} />
        </button>
      )}
    </div>
  );
};
