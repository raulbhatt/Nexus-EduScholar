
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Topic, Level } from '../types';
import { SolarSystemViz } from './SolarSystemViz';
import { StarFormationViz } from './StarFormationViz';
import { CosmologyViz } from './CosmologyViz';
import { QuantumPhysicsViz } from './QuantumPhysicsViz';
import { QuantumComputingViz } from './QuantumComputingViz';
import { ParticlePhysicsViz } from './ParticlePhysicsViz';
import { NeuroscienceViz } from './NeuroscienceViz';
import { AINeuralNetworkViz } from './AINeuralNetworkViz';
import { Move, Minus, Plus, Rotate3d, RefreshCcw, Zap, Activity, BrainCircuit, Info, Brain, MousePointer2, Sparkles, Wind, Play, Pause, Layers, Target, Waves, ScanSearch, Cpu, Network, Database } from 'lucide-react';

/* --- Shared 3D Math Helpers --- */
const project3D = (x: number, y: number, z: number, rotation: {x: number, y: number}, width: number, height: number, fov: number, lensEffect: boolean = false) => {
    let tx = x * Math.cos(rotation.y) - z * Math.sin(rotation.y);
    let tz = z * Math.cos(rotation.y) + x * Math.sin(rotation.y);
    let x1 = tx; let z1 = tz;

    let ty = y * Math.cos(rotation.x) - z1 * Math.sin(rotation.x);
    let z2 = z1 * Math.cos(rotation.x) + y * Math.sin(rotation.x);
    let y1 = ty;

    if (lensEffect) {
        const distSq = x1 * x1 + y1 * y1;
        if (z2 > -50) {
            const mag = Math.exp(-distSq / 15000);
            const warpStrength = 140 * (z2 / 400 + 0.5);
            y1 += (y1 > 0 ? 1 : -1) * warpStrength * mag;
            x1 *= (1 + 0.35 * mag);
        }
    }

    const scale = fov / (Math.max(1, fov + z2));
    const x2d = (width / 2) + x1 * scale;
    const y2d = (height / 2) + y1 * scale;

    return { x: x2d, y: y2d, scale, z: z2, xRaw: x, yRaw: y, zRaw: z };
};

/* --- 1. General Physics Engine (Fallback) --- */

interface Particle {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  angle: number;
  radius: number;
  type: 'bh' | 'planet' | 'star' | 'debris' | 'dust' | 'binary_star';
  name?: string;
  speed?: number;
  orbitTilt?: number;
  intensity?: number;
  temperature?: number;
}

const SpaceViz3D: React.FC<VizProps> = ({ topic, level, concept }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 0.4, y: -0.4 });
  const [zoom, setZoom] = useState(1);
  const [speed, setSpeed] = useState(1);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const animationRef = useRef<number>(0);

  const [gwState, setGwState] = useState<'INSPIRAL' | 'MERGER' | 'RINGDOWN'>('INSPIRAL');
  const gwPhase = useRef(0);
  const gwRadius = useRef(180);
  const gwFrequency = useRef(0.04);
  const gwAmplitude = useRef(0.1);
  const gwRecoil = useRef({ x: 0, y: 0, z: 0 });
  const mergerTime = useRef(0);
  const ringdownTime = useRef(0);
  const mergerWaveRadius = useRef(0);

  const config = useMemo(() => {
    const c = concept?.toLowerCase() || '';
    if (c.includes('gravitational wave') || c.includes('ligo') || c.includes('collision') || c.includes('merger')) {
      return { mode: 'WAVES' as const, particleCount: 0 };
    }
    if (c.includes('black hole') || c.includes('singularity')) {
      return { mode: 'ACCRETION' as const, particleCount: 1600 };
    }
    return { mode: 'WAVES' as const, particleCount: 0 }; 
  }, [concept, topic]);

  const particles = useRef<Particle[]>([]);
  const backgroundStars = useRef<{x: number, y: number, z: number, size: number}[]>([]);

  const resetSimulation = () => {
    timeRef.current = 0;
    if (config.mode === 'WAVES') {
      setGwState('INSPIRAL');
      gwRadius.current = 180;
      gwPhase.current = 0;
      gwFrequency.current = 0.04;
      gwAmplitude.current = 0.1;
      gwRecoil.current = { x: 0, y: 0, z: 0 };
      mergerTime.current = 0;
      mergerWaveRadius.current = 0;
      ringdownTime.current = 0;
      particles.current = [
        { x: 0, y: 0, z: 0, size: 22, color: '#000000', angle: 0, radius: 180, type: 'bh' },
        { x: 0, y: 0, z: 0, size: 22, color: '#000000', angle: Math.PI, radius: 180, type: 'bh' }
      ];
    }
  };

  useEffect(() => {
    backgroundStars.current = Array.from({ length: 600 }).map(() => ({
      x: (Math.random() - 0.5) * 6000,
      y: (Math.random() - 0.5) * 6000,
      z: (Math.random() - 0.5) * 6000,
      size: Math.random() * 2.2
    }));
    resetSimulation();
  }, [config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const dt = 0.016 * speed;
      timeRef.current += dt;
      ctx.fillStyle = '#010413';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const fov = 650 * zoom;

      if (config.mode === 'WAVES') {
        if (gwState === 'INSPIRAL') {
          const decay = 0.00025 * Math.pow(180 / Math.max(8, gwRadius.current), 3.5);
          gwRadius.current -= decay * speed;
          gwFrequency.current = 0.035 * Math.pow(180 / Math.max(5, gwRadius.current), 1.5);
          gwPhase.current += gwFrequency.current * speed;
          gwAmplitude.current = 0.1 + (180 / Math.max(20, gwRadius.current)) * 0.5;
          if (gwRadius.current < 10) { setGwState('MERGER'); mergerTime.current = 1.0; }
        } else if (gwState === 'MERGER') {
          mergerTime.current -= 0.03 * speed;
          mergerWaveRadius.current += 15 * speed; 
          if (mergerTime.current < 0.2) {
            setGwState('RINGDOWN');
            ringdownTime.current = 1.0;
            gwRecoil.current = { x: (Math.random()-0.5)*30, y: (Math.random()-0.5)*30, z: (Math.random()-0.5)*30 };
          }
        } else if (gwState === 'RINGDOWN') {
          ringdownTime.current *= 0.97;
          mergerWaveRadius.current += 15 * speed; 
          gwRecoil.current.x *= 0.94; gwRecoil.current.y *= 0.94; gwRecoil.current.z *= 0.94;
          if (ringdownTime.current < 0.01 && mergerWaveRadius.current > 1200) resetSimulation();
        }
        const gridSize = 18;
        const step = 45;
        ctx.lineWidth = 0.8;
        for(let i = -gridSize; i <= gridSize; i++) {
          ctx.beginPath();
          for(let j = -gridSize; j <= gridSize; j++) {
            let gx = i * step; let gz = j * step; let gy = 0;
            const dist = Math.sqrt(gx*gx + gz*gz);
            if (gwState === 'INSPIRAL') {
              const angle = Math.atan2(gz, gx);
              const wave = Math.sin(dist * 0.035 - gwPhase.current * 8 + angle * 2) * (gwAmplitude.current * 15);
              gy = wave * Math.exp(-dist / 600);
              particles.current.forEach(bh => {
                const dx = gx - bh.x; const dz = gz - bh.z;
                const dLoc = Math.sqrt(dx*dx + dz*dz);
                gy -= 1500 / (dLoc + 40);
              });
            } else {
              const pulseDist = Math.abs(dist - mergerWaveRadius.current);
              const wavePacket = Math.sin((dist - mergerWaveRadius.current) * 0.15) * 100;
              const envelope = Math.exp(-Math.pow(pulseDist / 60, 2));
              const dissipation = 250 / (dist + 50);
              gy = wavePacket * envelope * dissipation;
            }
            const p = project3D(gx, gy, gz, rotation, canvas.width, canvas.height, fov);
            const intensity = Math.abs(gy) / 60;
            const r = Math.floor(60 + intensity * 195);
            const g = Math.floor(100 + intensity * 155);
            const b = Math.floor(255 - intensity * 50);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, 0.1 + p.scale * 0.15)})`;
            if (j === -gridSize) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
      }

      backgroundStars.current.forEach(star => {
        const p = project3D(star.x, star.y, star.z, rotation, canvas.width, canvas.height, fov, true);
        if (p.z < -fov + 10 || p.scale <= 0) return;
        ctx.globalAlpha = Math.max(0, 0.4 * p.scale);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, star.size * p.scale), 0, Math.PI * 2); ctx.fill();
      });

      const proj = particles.current.map(p => {
        if (p.type === 'bh') {
          if (gwState === 'INSPIRAL') {
            p.angle += (0.04 * Math.pow(180 / Math.max(5, gwRadius.current), 1.5)) * speed;
            p.x = Math.cos(p.angle) * gwRadius.current;
            p.z = Math.sin(p.angle) * gwRadius.current;
          } else {
            p.x = gwRecoil.current.x; p.y = gwRecoil.current.y; p.z = gwRecoil.current.z;
            p.size = 44;
          }
        }
        return { ...p, ...project3D(p.x, p.y, p.z, rotation, canvas.width, canvas.height, fov, true) };
      }).sort((a, b) => b.z - a.z);

      proj.forEach(p => {
        if (p.scale <= 0) return;
        const r = Math.max(0.5, p.size * p.scale);
        if (p.type === 'bh') {
          const isMerger = gwState === 'MERGER';
          ctx.shadowBlur = Math.max(0, (isMerger ? 80 : 40) * p.scale);
          ctx.shadowColor = isMerger ? '#ffffff' : '#06b6d4';
          const grad = ctx.createRadialGradient(p.x, p.y, Math.max(0.1, r * 0.9), p.x, p.y, Math.max(0.2, r * 3));
          grad.addColorStop(0, '#000000');
          grad.addColorStop(0.3, isMerger ? '#ffffff' : 'rgba(6, 182, 212, 0.5)');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          const eccentricity = (gwState === 'INSPIRAL' && gwRadius.current < 45) ? (1 + (45-gwRadius.current)/70) : 1;
          ctx.ellipse(p.x, p.y, Math.max(0.1, r * 3 * eccentricity), Math.max(0.1, r * 3 / eccentricity), rotation.x + p.angle, 0, Math.PI*2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000000';
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, r), 0, Math.PI*2); ctx.fill();
        }
      });
      if (mergerTime.current > 0.3) {
        ctx.globalAlpha = Math.max(0, mergerTime.current * 0.8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
      animationRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [rotation, zoom, speed, config, gwState]);

  return (
    <div className="flex flex-col h-full w-full relative group bg-black overflow-hidden">
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full cursor-move active:cursor-grabbing"
        onMouseDown={e => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }}
        onMouseMove={e => {
          if (!isDragging.current) return;
          setRotation(prev => ({ 
            x: Math.max(-0.1, Math.min(Math.PI/2, prev.x + (e.clientY - lastMouse.current.y) * 0.008)),
            y: prev.y + (e.clientX - lastMouse.current.x) * 0.008 
          }));
          lastMouse.current = { x: e.clientX, y: e.clientY };
        }}
        onMouseUp={() => isDragging.current = false}
      />
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 text-xs font-mono text-nexus-400 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 uppercase tracking-widest shadow-lg">
          <Waves size={16} className="text-nexus-accent animate-pulse" />
          <span>General Relativity: Spacetime Ripple Simulation</span>
        </div>
      </div>
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
           <button onClick={resetSimulation} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-[11px] font-bold uppercase hover:bg-slate-700 transition-all border border-slate-700 shadow-2xl group">
             <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
             Re-Collimate System
           </button>
      </div>
    </div>
  );
};

interface VizProps {
  topic: Topic;
  level: Level;
  concept?: string | null;
}

export const InteractiveViz: React.FC<VizProps> = (props) => {
  switch (props.topic) {
    case Topic.Astronomy:
      return <SolarSystemViz />;
    case Topic.Astrophysics:
      return <StarFormationViz />;
    case Topic.Cosmology:
      return <CosmologyViz />;
    case Topic.QuantumPhysics:
      return <QuantumPhysicsViz />;
    case Topic.QuantumComputing:
      return <QuantumComputingViz />;
    case Topic.ParticlePhysics:
      return <ParticlePhysicsViz />;
    case Topic.AI:
        return <AINeuralNetworkViz />;
    case Topic.Neuroscience:
        return <NeuroscienceViz />;
    default:
      return <SpaceViz3D {...props} />;
  }
};
