
import React, { useEffect, useRef, useState } from 'react';
import { 
  Activity, 
  Brain, 
  Zap, 
  Minus, 
  Plus, 
  RefreshCcw, 
  Settings, 
  Eye, 
  EyeOff, 
  Dna,
  Layers,
  Database,
  Search,
  Wind,
  MousePointer2,
  X
} from 'lucide-react';

/* --- Physics & Math Helpers --- */
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

interface Neuron {
  id: string;
  x: number; y: number; z: number;
  region: 'Frontal' | 'Parietal' | 'Temporal' | 'Occipital' | 'Cerebellum';
  color: string;
  size: number;
  firingRate: number;
  connections: string[];
  flashIntensity: number; // For firing animation
}

interface SignalPulse {
  fromId: string;
  toId: string;
  progress: number;
  speed: number;
}

const REGION_COLORS = {
  Frontal: '#3b82f6',    // Blue
  Parietal: '#fbbf24',   // Yellow/Amber
  Temporal: '#4ade80',   // Green
  Occipital: '#f87171',  // Red
  Cerebellum: '#c084fc'  // Purple
};

export const NeuroscienceViz: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 0.3, y: -0.4 });
  const [zoom, setZoom] = useState(0.85);
  const [firingRateMult, setFiringRateMult] = useState(1);
  const [pulseSpeedMult, setPulseSpeedMult] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredNeuron, setHoveredNeuron] = useState<Neuron | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedNeuronId, setSelectedNeuronId] = useState<string | null>(null);
  const [showBrainShell, setShowBrainShell] = useState(true);
  
  const neurons = useRef<Neuron[]>([]);
  const pulses = useRef<SignalPulse[]>([]);
  const brainShellPoints = useRef<{x: number, y: number, z: number, region: string}[][]>([]);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const animRef = useRef<number>(0);

  const generateBrainShell = () => {
    const contours: {x: number, y: number, z: number, region: string}[][] = [];
    
    // Generate two hemispheres
    const hemispheres = [-1, 1];
    hemispheres.forEach(hSide => {
      // Horizontal loops (Latitudes)
      for (let z = -140; z <= 180; z += 20) {
        const loop: {x: number, y: number, z: number, region: string}[] = [];
        for (let angle = 0; angle <= Math.PI; angle += 0.15) {
          const radiusY = 180;
          const radiusX = 150;
          const radiusZ = 160;
          
          const normZ = (z - 20) / radiusZ;
          const widthAtZ = Math.sqrt(Math.max(0, 1 - normZ * normZ)) * radiusX;
          const lengthAtZ = Math.sqrt(Math.max(0, 1 - normZ * normZ)) * radiusY;

          const y = Math.cos(angle) * lengthAtZ - 10;
          const x = hSide * (Math.sin(angle) * widthAtZ + 10);
          
          // Add gyrus/sulcus "wrinkles"
          const gyrus = Math.sin(angle * 10) * Math.cos(z * 0.1) * 6;
          
          // Determine region for shell coloring
          let region = 'Frontal';
          if (y > 100) region = 'Occipital';
          else if (z < -30) region = 'Frontal';
          else if (z > 80) region = 'Parietal';
          else if (Math.abs(x) > 100) region = 'Temporal';

          loop.push({ x: x + gyrus, y: y + gyrus, z, region });
        }
        contours.push(loop);
      }

      // Vertical loops (Longitudes)
      for (let angle = 0; angle < Math.PI; angle += 0.3) {
        const loop: {x: number, y: number, z: number, region: string}[] = [];
        for (let z = -140; z <= 180; z += 15) {
          const radiusY = 180;
          const radiusX = 150;
          const radiusZ = 160;
          const normZ = (z - 20) / radiusZ;
          const widthAtZ = Math.sqrt(Math.max(0, 1 - normZ * normZ)) * radiusX;
          const lengthAtZ = Math.sqrt(Math.max(0, 1 - normZ * normZ)) * radiusY;

          const y = Math.cos(angle) * lengthAtZ - 10;
          const x = hSide * (Math.sin(angle) * widthAtZ + 10);
          
          let region = 'Frontal';
          if (y > 100) region = 'Occipital';
          else if (z < -30) region = 'Frontal';
          else if (z > 80) region = 'Parietal';
          else if (Math.abs(x) > 100) region = 'Temporal';

          loop.push({ x, y, z, region });
        }
        contours.push(loop);
      }
    });

    // Add Cerebellum shell (distinct bottom back area)
    for (let angle = 0; angle <= Math.PI * 2; angle += 0.6) {
        const loop: {x: number, y: number, z: number, region: string}[] = [];
        for (let ring = 0; ring <= Math.PI; ring += 0.25) {
            const r = 70;
            const x = Math.sin(ring) * Math.cos(angle) * r;
            const y = Math.sin(ring) * Math.sin(angle) * (r * 0.8) + 120;
            const z = Math.cos(ring) * (r * 0.7) - 110;
            loop.push({x, y, z, region: 'Cerebellum'});
        }
        contours.push(loop);
    }

    brainShellPoints.current = contours;
  };

  const initConnectome = () => {
    const newNeurons: Neuron[] = [];
    const regions: Neuron['region'][] = ['Frontal', 'Parietal', 'Temporal', 'Occipital', 'Cerebellum'];
    
    const counts: Record<Neuron['region'], number> = {
      Frontal: 140,
      Parietal: 90,
      Temporal: 110, 
      Occipital: 70,
      Cerebellum: 100
    };

    regions.forEach(region => {
      const count = counts[region];
      
      for (let i = 0; i < count; i++) {
        let baseX = 0, baseY = 0, baseZ = 0;
        let spread = 120;

        switch(region) {
          case 'Frontal': 
            baseX = (Math.random() - 0.5) * 80; 
            baseY = -140 - Math.random() * 40; 
            baseZ = 20 + (Math.random() - 0.5) * 70; 
            spread = 65;
            break;
          case 'Parietal': 
            baseX = (Math.random() - 0.5) * 110; 
            baseY = -40 + (Math.random() - 0.5) * 90; 
            baseZ = 130 + Math.random() * 40; 
            spread = 55;
            break;
          case 'Temporal': 
            baseX = (i % 2 === 0 ? 150 : -150) + (Math.random() - 0.5) * 40; 
            baseY = -20 + (Math.random() - 0.5) * 110; 
            baseZ = -20 + (Math.random() - 0.5) * 70; 
            spread = 55;
            break;
          case 'Occipital': 
            baseX = (Math.random() - 0.5) * 80; 
            baseY = 130 + Math.random() * 40; 
            baseZ = 20 + (Math.random() - 0.5) * 60; 
            spread = 50;
            break;
          case 'Cerebellum': 
            baseX = (Math.random() - 0.5) * 130; 
            baseY = 90 + Math.random() * 40; 
            baseZ = -110 - Math.random() * 40; 
            spread = 60;
            break;
        }

        newNeurons.push({
          id: `${region}-${i}`,
          x: baseX + (Math.random() - 0.5) * spread,
          y: baseY + (Math.random() - 0.5) * spread,
          z: baseZ + (Math.random() - 0.5) * spread,
          region,
          color: REGION_COLORS[region],
          size: 1.5 + Math.random() * 2.5,
          firingRate: 0.03 + Math.random() * 0.07,
          connections: [],
          flashIntensity: 0
        });
      }
    });

    newNeurons.forEach(n => {
      const numConn = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < numConn; j++) {
        const isLongRange = Math.random() > 0.94;
        let target;
        if (isLongRange) {
           target = newNeurons[Math.floor(Math.random() * newNeurons.length)];
        } else {
           const sameRegion = newNeurons.filter(other => other.region === n.region && other.id !== n.id);
           target = sameRegion[Math.floor(Math.random() * sameRegion.length)];
        }
        if (target && target.id !== n.id) n.connections.push(target.id);
      }
    });

    neurons.current = newNeurons;
    pulses.current = [];
    generateBrainShell();
  };

  useEffect(() => {
    initConnectome();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      if (!isPaused) {
        timeRef.current += 0.016;
        
        neurons.current.forEach(n => {
          if (n.flashIntensity > 0) {
            n.flashIntensity -= 0.05;
            if (n.flashIntensity < 0) n.flashIntensity = 0;
          }
        });

        if (pulses.current.length < 1500) {
            neurons.current.forEach(n => {
                const chance = n.firingRate * firingRateMult * 0.08;
                if (Math.random() < chance) {
                    const targetId = n.connections[Math.floor(Math.random() * n.connections.length)];
                    if (targetId) {
                        n.flashIntensity = 1.0; 
                        pulses.current.push({
                            fromId: n.id,
                            toId: targetId,
                            progress: 0,
                            speed: (0.01 + Math.random() * 0.02) * pulseSpeedMult
                        });
                    }
                }
            });
        }

        pulses.current = pulses.current.filter(p => {
          p.progress += p.speed;
          return p.progress < 1;
        });
      }

      ctx.fillStyle = '#010413';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const fov = 750 * zoom;

      // Render Back-Half of Brain Shell first for depth
      if (showBrainShell) {
        ctx.lineWidth = 0.5;
        brainShellPoints.current.forEach(loop => {
          ctx.beginPath();
          let started = false;
          loop.forEach((pt, i) => {
            const p = project3D(pt.x, pt.y, pt.z, rotation, canvas.width, canvas.height, fov);
            // Only draw points that are "behind" the center for depth sorting
            if (p.scale > 0 && p.z > 0) {
              const regionColor = REGION_COLORS[pt.region as keyof typeof REGION_COLORS] || '#334155';
              ctx.strokeStyle = `${regionColor}11`; // Very subtle back shell
              if (!started) { ctx.moveTo(p.x, p.y); started = true; }
              else ctx.lineTo(p.x, p.y);
            }
          });
          if (started) ctx.stroke();
        });
      }

      // Draw Connections (Background)
      ctx.globalAlpha = 0.03;
      neurons.current.forEach(n => {
        const p1 = project3D(n.x, n.y, n.z, rotation, canvas.width, canvas.height, fov);
        if (p1.scale <= 0) return;
        
        const isRegionSelected = selectedRegion && n.region === selectedRegion;
        const isNeuronSelected = selectedNeuronId && n.id === selectedNeuronId;
        
        n.connections.forEach(targetId => {
          const target = neurons.current.find(tn => tn.id === targetId);
          if (target) {
            const p2 = project3D(target.x, target.y, target.z, rotation, canvas.width, canvas.height, fov);
            if (p2.scale > 0) {
              const isPathwaySelected = isNeuronSelected || (selectedNeuronId && target.id === selectedNeuronId);
              
              if (selectedRegion || selectedNeuronId) {
                  if (isRegionSelected || isPathwaySelected) {
                      ctx.globalAlpha = isPathwaySelected ? 0.6 : 0.2;
                      ctx.lineWidth = isPathwaySelected ? 1.5 : 0.6;
                      ctx.strokeStyle = n.color;
                  } else {
                      ctx.globalAlpha = 0.01;
                      ctx.lineWidth = 0.4;
                      ctx.strokeStyle = '#334155';
                  }
              } else {
                  ctx.globalAlpha = 0.04;
                  ctx.lineWidth = 0.4;
                  ctx.strokeStyle = n.color;
              }
              
              ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            }
          }
        });
      });
      ctx.globalAlpha = 1;

      // Draw Pulses
      pulses.current.forEach(p => {
        const from = neurons.current.find(n => n.id === p.fromId);
        const to = neurons.current.find(n => n.id === p.toId);
        if (from && to) {
          const isSelected = (selectedRegion && (from.region === selectedRegion || to.region === selectedRegion)) || 
                             (selectedNeuronId && (from.id === selectedNeuronId || to.id === selectedNeuronId));
          
          const alpha = (selectedRegion || selectedNeuronId) && !isSelected ? 0.05 : 0.8;
          ctx.globalAlpha = alpha;

          const x = from.x + (to.x - from.x) * p.progress;
          const y = from.y + (to.y - from.y) * p.progress;
          const z = from.z + (to.z - from.z) * p.progress;
          const proj = project3D(x, y, z, rotation, canvas.width, canvas.height, fov);
          if (proj.scale > 0) {
            ctx.fillStyle = isSelected ? '#fff' : from.color;
            if (isSelected) { ctx.shadowBlur = 10; ctx.shadowColor = from.color; }
            ctx.beginPath(); ctx.arc(proj.x, proj.y, (isSelected ? 2.5 : 1.2) * proj.scale, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });
      ctx.globalAlpha = 1;

      // Draw Neurons (Nodes)
      neurons.current.forEach(n => {
        const proj = project3D(n.x, n.y, n.z, rotation, canvas.width, canvas.height, fov);
        if (proj.scale > 0) {
          const isHovered = hoveredNeuron?.id === n.id;
          const isSelected = selectedNeuronId === n.id;
          const isRegionSelected = selectedRegion === n.region;
          
          if ((selectedRegion || selectedNeuronId) && !isSelected && !isRegionSelected) {
              ctx.globalAlpha = 0.08;
          } else {
              ctx.globalAlpha = 0.9;
          }

          const fireSizeMult = 1 + n.flashIntensity * 2;
          const r = (n.size * fireSizeMult + (isHovered || isSelected ? 3 : 0)) * proj.scale;
          
          if (n.flashIntensity > 0) {
            ctx.shadowBlur = 15 * n.flashIntensity * proj.scale;
            ctx.shadowColor = '#fff';
            ctx.fillStyle = '#fff'; 
          } else {
            ctx.fillStyle = n.color;
          }
          
          ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2); ctx.fill();
          
          if (isHovered || isSelected) {
             ctx.strokeStyle = '#fff'; ctx.lineWidth = isSelected ? 1.5 : 0.8; ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }
      });
      ctx.globalAlpha = 1;

      // Render Front-Half of Brain Shell with "Scanning" effect
      if (showBrainShell) {
        const scanPos = Math.sin(timeRef.current * 0.5) * 200;
        brainShellPoints.current.forEach(loop => {
          ctx.beginPath();
          let started = false;
          loop.forEach((pt, i) => {
            const p = project3D(pt.x, pt.y, pt.z, rotation, canvas.width, canvas.height, fov);
            if (p.scale > 0 && p.z <= 0) { // Points "in front"
              const regionColor = REGION_COLORS[pt.region as keyof typeof REGION_COLORS] || '#334155';
              const distToScan = Math.abs(pt.y - scanPos);
              const scanIntensity = Math.exp(-distToScan * distToScan / 2000);
              
              if (scanIntensity > 0.1) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * scanIntensity})`;
                ctx.lineWidth = 1;
              } else {
                ctx.strokeStyle = `${regionColor}22`; // More visible front shell
                ctx.lineWidth = 0.5;
              }

              if (!started) { ctx.moveTo(p.x, p.y); started = true; }
              else ctx.lineTo(p.x, p.y);
            }
          });
          if (started) ctx.stroke();
        });
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [rotation, zoom, firingRateMult, pulseSpeedMult, isPaused, hoveredNeuron, selectedRegion, selectedNeuronId, showBrainShell]);

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

    const fov = 750 * zoom;
    let found: Neuron | null = null;
    let minDist = 12;
    neurons.current.forEach(n => {
      const p = project3D(n.x, n.y, n.z, rotation, canvas.width, canvas.height, fov);
      const d = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
      if (d < minDist) {
        minDist = d;
        found = n;
      }
    });
    setHoveredNeuron(found);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
      if (hoveredNeuron) {
          if (selectedNeuronId === hoveredNeuron.id) {
              setSelectedNeuronId(null);
              setSelectedRegion(null);
          } else {
              setSelectedNeuronId(hoveredNeuron.id);
              setSelectedRegion(hoveredNeuron.region);
          }
      } else {
          setSelectedNeuronId(null);
          setSelectedRegion(null);
      }
  };

  return (
    <div className="flex flex-col h-full w-full relative group bg-black overflow-hidden select-none font-mono">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full cursor-pointer"
        onMouseDown={e => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => isDragging.current = false}
        onClick={handleCanvasClick}
      />

      {/* Cluster Analysis Overlay */}
      <div className={`absolute right-6 top-24 w-64 bg-[#010413]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 shadow-2xl z-20 ${hoveredNeuron || selectedNeuronId ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white border border-white/20" style={{ backgroundColor: (hoveredNeuron || neurons.current.find(n => n.id === selectedNeuronId))?.color }}>
             <Brain size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">{(hoveredNeuron || neurons.current.find(n => n.id === selectedNeuronId))?.region} Lobe</h4>
            <p className="text-[10px] text-slate-400 font-mono tracking-tighter">Cluster Node ID: {(hoveredNeuron || neurons.current.find(n => n.id === selectedNeuronId))?.id.split('-')[1]}</p>
          </div>
          {(selectedNeuronId || selectedRegion) && (
              <button onClick={() => { setSelectedNeuronId(null); setSelectedRegion(null); }} className="p-1 hover:bg-white/10 rounded-full text-slate-500">
                <X size={14} />
              </button>
          )}
        </div>

        <div className="space-y-4">
           <div className="bg-slate-900/50 p-3 rounded-2xl border border-white/5">
              <span className="text-[8px] text-slate-500 uppercase block mb-1">Local Firing Frequency</span>
              <span className="text-xs font-bold text-nexus-accent">{((hoveredNeuron || neurons.current.find(n => n.id === selectedNeuronId))?.firingRate ? (hoveredNeuron || neurons.current.find(n => n.id === selectedNeuronId))!.firingRate * firingRateMult * 100 : 0).toFixed(1)} Hz</span>
           </div>
           
           <div className="bg-slate-900/50 p-3 rounded-2xl border border-white/5">
              <span className="text-[8px] text-slate-500 uppercase block mb-1">Functional Specialty</span>
              <span className="text-xs font-bold text-white">
                {((hoveredNeuron || neurons.current.find(n => n.id === selectedNeuronId))?.region === 'Frontal' ? 'Executive Planning' : 
                 (hoveredNeuron || neurons.current.find(n => n.id === selectedNeuronId))?.region === 'Parietal' ? 'Sensory Integration' : 
                 (hoveredNeuron || neurons.current.find(n => n.id === selectedNeuronId))?.region === 'Temporal' ? 'Auditory Processing' : 
                 (hoveredNeuron || neurons.current.find(n => n.id === selectedNeuronId))?.region === 'Occipital' ? 'Visual Synthesis' : 'Motor Coordination')}
              </span>
           </div>

           <div className="pt-4 border-t border-white/10">
              <p className="text-[9px] text-slate-500 leading-relaxed italic">
                {(selectedNeuronId || hoveredNeuron) ? `Tracing pathways from node ${(hoveredNeuron || neurons.current.find(n => n.id === selectedNeuronId))?.id}. Click to lock focus.` : `Synaptic signals in the lobe facilitate complex cross-modal communication.`}
              </p>
           </div>
        </div>
      </div>

      {/* Connectivity HUD */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl">
          <Activity className="text-nexus-accent animate-pulse" size={18} />
          <div className="flex flex-col">
            <span className="text-[10px] text-nexus-400 uppercase tracking-widest font-bold">Neural Connectome v3.5</span>
            <span className="text-xs font-bold text-white uppercase">
                {selectedRegion ? `FOCUS: ${selectedRegion} REGION` : (isPaused ? 'Signal Lock Engaged' : 'Anatomical Parallel Synaptic Flow')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
           <div className="bg-black/60 backdrop-blur-sm p-2 rounded-lg border border-white/5 flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Total Nodes</span>
              <span className="text-[10px] text-nexus-accent font-bold">{neurons.current.length} Neurons</span>
           </div>
           <div className="bg-black/60 backdrop-blur-sm p-2 rounded-lg border border-white/5 flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Active Signals</span>
              <span className="text-[10px] text-nexus-purple font-bold">{pulses.current.length} Spikes</span>
           </div>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="absolute bottom-8 left-8 right-8 flex flex-col gap-4 items-center">
         <div className="glass-panel p-5 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 border border-white/5 shadow-2xl max-w-2xl w-full">
            <div className="flex gap-2 w-full md:w-auto">
                <button 
                    onClick={() => setIsPaused(!isPaused)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 border rounded-2xl font-bold text-xs uppercase transition-all whitespace-nowrap ${
                      isPaused ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'
                    }`}
                >
                    {isPaused ? <RefreshCcw size={14} /> : <Minus size={14} />} 
                    {isPaused ? 'RESUME FLOW' : 'HALT SIGNALS'}
                </button>
                <button 
                    onClick={() => { initConnectome(); setSelectedNeuronId(null); setSelectedRegion(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 text-slate-400 border border-slate-700 rounded-2xl font-bold text-xs uppercase hover:bg-slate-700 transition-all whitespace-nowrap"
                >
                    <Zap size={14} /> REGENERATE
                </button>
            </div>
            
            <div className="flex-1 w-full grid grid-cols-2 gap-6 px-2">
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        <span>Firing Rate</span>
                        <span className="text-nexus-accent">{firingRateMult.toFixed(1)}x</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="5" step="0.1" 
                        value={firingRateMult} 
                        onChange={e => setFiringRateMult(parseFloat(e.target.value))} 
                        className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-nexus-accent cursor-pointer"
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        <span>Pulse Speed</span>
                        <span className="text-nexus-purple">{pulseSpeedMult.toFixed(1)}x</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="5" step="0.1" 
                        value={pulseSpeedMult} 
                        onChange={e => setPulseSpeedMult(parseFloat(e.target.value))} 
                        className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-nexus-purple cursor-pointer"
                    />
                </div>
            </div>

            <div className="hidden md:block w-px h-12 bg-white/10" />

            <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-2xl">
               <button 
                onClick={() => setShowBrainShell(!showBrainShell)} 
                className={`p-2 rounded-xl transition-all border ${showBrainShell ? 'bg-nexus-500/10 border-nexus-500/30 text-nexus-400' : 'text-slate-500 border-transparent hover:bg-white/5'}`}
                title="Toggle Brain Structure"
               >
                 <Layers size={18} />
               </button>
               <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-2 text-slate-500 hover:text-white transition-colors"><Minus size={16} /></button>
               <span className="text-xs font-bold text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="p-2 text-slate-500 hover:text-white transition-colors"><Plus size={16} /></button>
            </div>
         </div>
         
         <div className="flex items-center gap-2 text-[9px] text-nexus-400 bg-nexus-500/5 px-4 py-1.5 rounded-full border border-nexus-500/10 uppercase tracking-[0.2em] font-bold">
            <MousePointer2 size={12} />
            <span>Anatomical Projection: Neurons are localized within specific cerebral lobes</span>
         </div>
      </div>

      <div className="absolute bottom-6 left-6 hidden xl:block pointer-events-none">
         <div className="max-w-[280px] p-4 bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 text-[9px] text-slate-400 leading-relaxed shadow-2xl border-l-2 border-l-nexus-accent">
            <div className="flex items-center gap-2 mb-2 text-white font-bold uppercase tracking-tighter">
               <Database size={12} className="text-nexus-accent" />
               Cortical Enclosure v3.5
            </div>
            This structural replication utilizes roughly 500 nodes enclosed within a high-fidelity cortical shell mapping the standard human longitudinal fissure and cerebral lobes.
         </div>
      </div>
    </div>
  );
};
