
import React, { useEffect, useRef, useState } from 'react';
// Added missing ChevronRight import
import { Minus, Plus, RefreshCcw, Info, Settings, Play, Pause, FastForward, Eye, EyeOff, X, Globe, Thermometer, Wind, Target, Zap, Clock, ChevronRight } from 'lucide-react';

/* --- Astronomy Data --- */
interface PlanetInfo {
  name: string;
  distance: number; // Million km
  au: number;
  size: number;
  color: string;
  orbitalPeriod: number; // days
  rotationPeriod: number; // days
  tilt: number;
  texture: string;
  hasRings?: boolean;
  atmosphere: string;
  description: string;
}

const PLANET_DATA: PlanetInfo[] = [
  { name: 'Mercury', distance: 57.9, au: 0.387, size: 4, color: '#A5A5A5', orbitalPeriod: 88, rotationPeriod: 58.6, tilt: 0.03, texture: 'rocky', atmosphere: 'Trace amounts of Oxygen, Sodium, Hydrogen, Helium, and Potassium.', description: 'The smallest planet in the Solar System and the closest to the Sun.' },
  { name: 'Venus', distance: 108.2, au: 0.723, size: 9, color: '#E3BB76', orbitalPeriod: 224.7, rotationPeriod: -243, tilt: 177.3, texture: 'dense', atmosphere: 'Dense Carbon Dioxide (96.5%) and Nitrogen (3.5%), with clouds of Sulfuric Acid.', description: 'Spinning slowly in the opposite direction from most planets.' },
  { name: 'Earth', distance: 149.6, au: 1.000, size: 10, color: '#2271B3', orbitalPeriod: 365.2, rotationPeriod: 1, tilt: 23.4, texture: 'terrestrial', atmosphere: 'Nitrogen (78%), Oxygen (21%), Argon (0.9%), and trace Carbon Dioxide.', description: 'Our home planet, the only place we know of so far that’s inhabited by living things.' },
  { name: 'Mars', distance: 227.9, au: 1.524, size: 5, color: '#E27B58', orbitalPeriod: 687, rotationPeriod: 1.03, tilt: 25.2, texture: 'dusty', atmosphere: 'Thin Carbon Dioxide (95.3%), Nitrogen (2.7%), and Argon (1.6%).', description: 'A dusty, cold, desert world with a very thin atmosphere.' },
  { name: 'Jupiter', distance: 778.3, au: 5.203, size: 22, color: '#D39C7E', orbitalPeriod: 4331, rotationPeriod: 0.41, tilt: 3.1, texture: 'gas', atmosphere: 'Mostly Hydrogen (90%) and Helium (10%), with traces of Methane and Ammonia.', description: 'The largest planet in our solar system, more than twice as massive as all the other planets combined.' },
  { name: 'Saturn', distance: 1427.0, au: 9.537, size: 18, color: '#C5AB6E', orbitalPeriod: 10747, rotationPeriod: 0.44, tilt: 26.7, texture: 'rings', hasRings: true, atmosphere: 'Mostly Hydrogen (96%) and Helium (3%), with traces of Methane and Ammonia.', description: 'Adorned with a dazzling, complex system of icy rings.' },
  { name: 'Uranus', distance: 2871.0, au: 19.191, size: 14, color: '#BBE1E4', orbitalPeriod: 30589, rotationPeriod: -0.72, tilt: 97.8, texture: 'ice', atmosphere: 'Hydrogen (83%), Helium (15%), and Methane (2.3%).', description: 'The first planet found with the aid of a telescope, Uranus was discovered in 1781.' },
  { name: 'Neptune', distance: 4498.0, au: 30.069, size: 13, color: '#6081FF', orbitalPeriod: 59800, rotationPeriod: 0.67, tilt: 28.3, texture: 'ice', atmosphere: 'Hydrogen (80%), Helium (19%), and Methane (1.5%).', description: 'Dark, cold, and whipped by supersonic winds, giant Neptune is the eighth and most distant major planet.' },
];

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

export const SolarSystemViz: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 0.6, y: -0.4 });
  const [zoom, setZoom] = useState(0.8);
  const [timeScale, setTimeScale] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showOrbits, setShowOrbits] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetInfo | null>(null);
  
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const starsRef = useRef<{x: number, y: number, z: number, size: number}[]>([]);
  const projectedPlanets = useRef<{name: string, x: number, y: number, r: number}[]>([]);

  useEffect(() => {
    starsRef.current = Array.from({ length: 800 }).map(() => ({
      x: (Math.random() - 0.5) * 8000,
      y: (Math.random() - 0.5) * 8000,
      z: (Math.random() - 0.5) * 8000,
      size: Math.random() * 1.5 + 0.5
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;
    const render = () => {
      if (!isPaused) {
        timeRef.current += 0.05 * timeScale;
      }

      ctx.fillStyle = '#010413';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const fov = 800 * zoom;

      // Draw background stars
      ctx.fillStyle = '#ffffff';
      starsRef.current.forEach(star => {
        const p = project3D(star.x, star.y, star.z, rotation, canvas.width, canvas.height, fov);
        if (p.scale > 0 && p.z > -fov) {
          ctx.globalAlpha = Math.max(0, Math.min(1, p.scale * 0.5));
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.1, star.size * p.scale), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      const sunP = project3D(0, 0, 0, rotation, canvas.width, canvas.height, fov);
      const sunSize = Math.max(0.1, 40 * sunP.scale);
      
      // Hit test storage for clicks
      projectedPlanets.current = [];

      const sunGrad = ctx.createRadialGradient(sunP.x, sunP.y, Math.max(0.1, sunSize * 0.1), sunP.x, sunP.y, Math.max(0.2, sunSize * 1.5));
      sunGrad.addColorStop(0, '#fff7ed');
      sunGrad.addColorStop(0.2, '#fbbf24');
      sunGrad.addColorStop(0.5, '#f59e0b');
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunP.x, sunP.y, Math.max(0.1, sunSize * 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = Math.max(0, 40 * sunP.scale);
      ctx.shadowColor = '#f59e0b';
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(sunP.x, sunP.y, Math.max(0.1, sunSize), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      PLANET_DATA.forEach((pData) => {
        const orbitalRadius = 80 + Math.sqrt(pData.au) * 250;
        const angle = (timeRef.current / (pData.orbitalPeriod / 365.2)) * 0.1;
        
        const px = Math.cos(angle) * orbitalRadius;
        const pz = Math.sin(angle) * orbitalRadius;
        const py = 0;

        if (showOrbits) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          for (let a = 0; a <= Math.PI * 2; a += 0.1) {
            const op = project3D(Math.cos(a) * orbitalRadius, 0, Math.sin(a) * orbitalRadius, rotation, canvas.width, canvas.height, fov);
            if (a === 0) ctx.moveTo(op.x, op.y);
            else ctx.lineTo(op.x, op.y);
          }
          ctx.stroke();
        }

        const p = project3D(px, py, pz, rotation, canvas.width, canvas.height, fov);
        if (p.scale > 0) {
          const r = Math.max(0.1, pData.size * p.scale);
          
          // Store for click detection - enlarged hit area
          projectedPlanets.current.push({ name: pData.name, x: p.x, y: p.y, r: Math.max(r, 15) });

          const pGrad = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, Math.max(0.1, r * 0.1), p.x, p.y, Math.max(0.2, r));
          pGrad.addColorStop(0, pData.color);
          pGrad.addColorStop(1, '#000000');
          
          if (pData.hasRings) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(197, 171, 110, 0.4)';
            ctx.lineWidth = Math.max(0.1, 4 * p.scale);
            ctx.ellipse(p.x, p.y, Math.max(0.1, r * 2.5), Math.max(0.1, r * 0.8), rotation.x, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (selectedPlanet?.name === pData.name) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = pData.color;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, r + 6), 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.1, r), 0, Math.PI * 2);
          ctx.fill();

          if (showLabels) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText(pData.name, p.x, p.y - r - 10);
            
            if (selectedPlanet?.name === pData.name) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.setLineDash([2, 4]);
                ctx.moveTo(sunP.x, sunP.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
          }
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [rotation, zoom, timeScale, isPaused, showLabels, showOrbits, selectedPlanet]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setRotation(prev => ({
      x: Math.max(-0.2, Math.min(Math.PI / 2, prev.x + dy * 0.005)),
      y: prev.y + dx * 0.005
    }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging.current) {
        const dx = Math.abs(e.clientX - lastMouse.current.x);
        const dy = Math.abs(e.clientY - lastMouse.current.y);
        
        // Treat as a click if movement was minimal
        if (dx < 10 && dy < 10) {
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                
                // Scale click coordinates to internal canvas resolution (800x600)
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const clickX = (e.clientX - rect.left) * scaleX;
                const clickY = (e.clientY - rect.top) * scaleY;
                
                const found = projectedPlanets.current.find(p => {
                    const dist = Math.sqrt((p.x - clickX) ** 2 + (p.y - clickY) ** 2);
                    return dist < p.r + 10;
                });

                if (found) {
                    const planet = PLANET_DATA.find(p => p.name === found.name);
                    if (planet) setSelectedPlanet(planet);
                } else {
                    setSelectedPlanet(null);
                }
            }
        }
    }
    isDragging.current = false;
  };

  return (
    <div className="flex flex-col h-full w-full relative group bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => isDragging.current = false}
      />

      {/* Planet Info Panel (Popup Box) */}
      {selectedPlanet && (
        <div className="absolute right-6 top-6 w-80 animate-slide-up-fade z-20">
            <div className="glass-panel p-6 rounded-[2rem] border border-nexus-500/40 shadow-[0_0_40px_rgba(0,0,0,0.8)] space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: selectedPlanet.color }}>
                            <Globe size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight leading-tight">{selectedPlanet.name}</h3>
                            <p className="text-[10px] text-nexus-400 font-mono uppercase tracking-widest">Planetary Profile</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedPlanet(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed font-light italic bg-white/5 p-3 rounded-xl border border-white/5">
                        "{selectedPlanet.description}"
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10 space-y-1">
                            <div className="flex items-center gap-1.5 text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                                <Clock size={10} className="text-nexus-accent" /> Orbital Period
                            </div>
                            <p className="text-xs font-bold text-white">{selectedPlanet.orbitalPeriod.toLocaleString()} Days</p>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10 space-y-1">
                            <div className="flex items-center gap-1.5 text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                                <Target size={10} className="text-nexus-purple" /> AU Distance
                            </div>
                            <p className="text-xs font-bold text-white">{selectedPlanet.au.toFixed(3)} AU</p>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10 space-y-1 col-span-2">
                            <div className="flex items-center gap-1.5 text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                                <Zap size={10} className="text-amber-400" /> Heliocentric Distance
                            </div>
                            <p className="text-xs font-bold text-white tracking-tight">{selectedPlanet.distance.toLocaleString()} Million KM</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-2">
                        <div className="flex items-center gap-1.5 text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                            <Wind size={10} className="text-emerald-400" /> Atmospheric Composition
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-medium">
                            {selectedPlanet.atmosphere}
                        </p>
                    </div>

                    <div className="pt-2">
                        <button className="w-full py-2.5 bg-nexus-500/20 text-nexus-400 border border-nexus-500/40 rounded-xl hover:bg-nexus-500/30 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            Access Full Telemetry <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Header HUD */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 text-xs font-mono text-nexus-400 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 uppercase tracking-widest shadow-lg">
          <OrbitIcon className="text-nexus-accent animate-spin-slow" size={16} />
          <span>Solar System Dynamics v4.1</span>
        </div>
        {!selectedPlanet && (
            <div className="flex flex-col gap-1 bg-black/40 backdrop-blur-sm p-3 rounded-xl border border-white/5">
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                    <Target size={10} className="text-nexus-accent" />
                    STATUS: <span className="text-emerald-400 font-bold">LIVE FEED</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                    <Info size={10} className="text-nexus-purple" />
                    SELECT PLANET FOR DATA
                </div>
            </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-6 left-6 right-6 glass-panel p-5 rounded-3xl flex items-center gap-10 opacity-0 group-hover:opacity-100 transition-all duration-500 border border-white/5 shadow-2xl translate-y-2 group-hover:translate-y-0">
        <div className="flex items-center gap-4">
            <button onClick={() => setIsPaused(!isPaused)} className="p-3 bg-nexus-500/10 text-nexus-400 rounded-xl hover:bg-nexus-500/20 transition-all border border-nexus-500/20">
              {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
            </button>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex gap-2">
                <button onClick={() => setShowLabels(!showLabels)} className={`p-2 rounded-lg transition-colors ${showLabels ? 'text-nexus-accent bg-nexus-500/10' : 'text-slate-400 hover:bg-white/5'}`}>
                    {showLabels ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button onClick={() => setShowOrbits(!showOrbits)} className={`p-2 rounded-lg transition-colors ${showOrbits ? 'text-nexus-purple bg-nexus-purple/10' : 'text-slate-400 hover:bg-white/5'}`}>
                    <RefreshCcw size={18} />
                </button>
            </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex justify-between text-[10px] text-nexus-400 font-mono uppercase tracking-[0.2em]">Orbital Velocity <span>{timeScale.toFixed(1)}x</span></div>
          <input 
            type="range" min="0.1" max="10" step="0.1" 
            value={timeScale} 
            onChange={e => setTimeScale(parseFloat(e.target.value))} 
            className="w-full accent-nexus-accent h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer" 
          />
        </div>
        <div className="flex items-center gap-3 bg-slate-900/80 rounded-2xl p-2 border border-slate-800">
            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2.5 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"><Minus size={16} /></button>
            <span className="text-sm font-mono w-12 text-center text-slate-100 font-bold">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2.5 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"><Plus size={16} /></button>
        </div>
      </div>
    </div>
  );
};

const OrbitIcon = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <path d="M15 12c0-3.3-2.7-6-6-6s-6 2.7-6 6" />
    <path d="M3 4c0 3.3 2.7 6 6 6s6-2.7 6-6" />
  </svg>
);
