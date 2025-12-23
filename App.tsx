
import React, { useState, useEffect } from 'react';
import { Topic, Level, LearningContent, ConceptDetail, IndustryUpdate } from './types';
import { fetchLearningContent, fetchConceptExplanation } from './services/geminiService';
import { InteractiveViz } from './components/Visualizations';
import { ChatWidget } from './components/ChatWidget';
import { 
  Atom, 
  BrainCircuit, 
  Cpu, 
  Globe, 
  Rocket, 
  Sparkles, 
  BookOpen, 
  ChevronRight,
  X,
  ArrowLeft,
  ArrowRight,
  RefreshCcw,
  Search,
  GitBranch,
  Route,
  Activity,
  ExternalLink,
  CircleDashed,
  Wrench,
  Database,
  Brain,
  AlertTriangle,
  Telescope,
  Milestone,
  History,
  Compass,
  ArrowUpRight,
  BookMarked,
  Quote,
  Library,
  GraduationCap,
  Microscope,
  Zap,
  Loader2
} from 'lucide-react';

/* --- Constants --- */
const TOPIC_IMAGES: Record<Topic, string> = {
  [Topic.Astronomy]: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop',
  [Topic.Astrophysics]: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2027&auto=format&fit=crop',
  [Topic.Cosmology]: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2070&auto=format&fit=crop',
  [Topic.QuantumPhysics]: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop',
  [Topic.QuantumComputing]: 'https://images.unsplash.com/photo-1610465299993-e6675c9f9efa?q=80&w=2070&auto=format&fit=crop',
  [Topic.ParticlePhysics]: 'https://images.unsplash.com/photo-1618335829737-2228915674e0?q=80&w=2000&auto=format&fit=crop',
  [Topic.AI]: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop',
  [Topic.Neuroscience]: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?q=80&w=2000&auto=format&fit=crop'
};

const SectionLoader: React.FC<{ label?: string }> = ({ label = "Synchronizing Neural Core" }) => (
  <div className="flex flex-col items-center justify-center p-12 space-y-6 animate-in fade-in duration-500 w-full min-h-[300px]">
    <div className="relative w-20 h-20">
      <div className="absolute inset-0 border-4 border-nexus-accent/10 rounded-full"></div>
      <div className="absolute inset-0 border-t-4 border-nexus-accent rounded-full animate-spin"></div>
      <div className="absolute inset-4 bg-nexus-accent/10 rounded-full animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.2)]"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles size={20} className="text-nexus-accent animate-pulse" />
      </div>
    </div>
    <div className="flex flex-col items-center space-y-2">
      <span className="text-xs font-mono text-nexus-400 uppercase tracking-[0.4em] animate-pulse">{label}</span>
      <div className="flex gap-1">
        <div className="w-1 h-1 bg-nexus-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1 h-1 bg-nexus-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1 h-1 bg-nexus-accent rounded-full animate-bounce"></div>
      </div>
      <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Accessing Quantum Archive</span>
    </div>
  </div>
);

const NavButton: React.FC<{ 
  label: string; 
  active: boolean; 
  icon: React.ReactNode; 
  onClick: () => void 
}> = ({ label, active, icon, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
      active 
        ? 'bg-nexus-500/10 text-nexus-400 border border-nexus-500/20 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-110 text-nexus-accent' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className="font-medium tracking-wide text-sm whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-nexus-accent animate-pulse shadow-[0_0_10px_#06b6d4]" />}
  </button>
);

const LevelBadge: React.FC<{ level: Level; current: Level; onClick: () => void }> = ({ level, current, onClick }) => {
  const isActive = level === current;
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
        isActive 
          ? 'bg-nexus-accent text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
          : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700 border border-white/5'
      }`}
    >
      {level}
    </button>
  );
};

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [exiting, setExiting] = useState(false);
  const [status, setStatus] = useState("Initializing Core...");
  useEffect(() => {
    const steps = [
      { t: 600, msg: "Establishing Neural Link..." },
      { t: 1400, msg: "Accessing Quantum Archives..." },
      { t: 2200, msg: "Calibrating Simulations..." },
      { t: 2800, msg: "WELCOME SCHOLAR" }
    ];
    steps.forEach(({ t, msg }) => {
      setTimeout(() => setStatus(msg), t);
    });
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onComplete, 800);
    }, 3200);
    return () => clearTimeout(timer);
  }, [onComplete]);
  return (
    <div className={`fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${exiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'}`}>
      <div className="relative w-48 h-48 flex items-center justify-center mb-12">
        <div className="absolute inset-0 border border-nexus-500/30 rounded-full orbit-ring-1"></div>
        <div className="absolute inset-4 border border-nexus-purple/40 rounded-full orbit-ring-2"></div>
        <div className="absolute inset-8 border border-nexus-accent/50 rounded-full orbit-ring-3"></div>
        <div className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.8)] animate-pulse"></div>
        <div className="absolute w-20 h-20 bg-nexus-500/20 rounded-full blur-xl animate-pulse"></div>
        <Sparkles className="text-white opacity-80" size={32} />
      </div>
      <h1 className="text-4xl font-bold text-white tracking-[0.2em] mb-4 font-mono">
        NEXUS <span className="text-nexus-accent">SCHOLAR</span>
      </h1>
      <div className="flex items-center gap-3">
        <Activity size={16} className="text-nexus-purple animate-bounce" />
        <span className="text-sm font-mono text-nexus-400 min-w-[200px] text-center uppercase tracking-widest">
           {status}
        </span>
      </div>
    </div>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTopic, setActiveTopic] = useState<Topic>(Topic.Astronomy);
  const [activeLevel, setActiveLevel] = useState<Level>(Level.Beginner);
  const [content, setContent] = useState<LearningContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'lesson' | 'concept'>('lesson');
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [conceptDetail, setConceptDetail] = useState<ConceptDetail | null>(null);
  const [loadingConcept, setLoadingConcept] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      setViewMode('lesson');
      setSelectedConcept(null);
      setErrorBanner(null);
      const data = await fetchLearningContent(activeTopic, activeLevel);
      if ('isError' in data) {
        setErrorBanner(data.message);
        setContent(null);
      } else {
        setContent(data);
      }
      setLoading(false);
    };
    loadContent();
  }, [activeTopic, activeLevel]);

  const handleConceptClick = async (concept: string) => {
    setSelectedConcept(concept);
    setViewMode('concept');
    setLoadingConcept(true);
    setConceptDetail(null);
    setErrorBanner(null);
    const detail = await fetchConceptExplanation(activeTopic, activeLevel, concept);
    if ('isError' in detail) {
      setErrorBanner(detail.message);
      setConceptDetail(null);
    } else {
      setConceptDetail(detail);
    }
    setLoadingConcept(false);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleConceptClick(searchQuery.trim());
      setSearchQuery('');
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 font-sans selection:bg-nexus-accent/30 selection:text-nexus-accent overflow-hidden">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      {errorBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-4 animate-in slide-in-from-top-4">
          <div className="bg-red-950/80 border border-red-500/50 backdrop-blur-md rounded-xl p-4 flex items-center gap-4 shadow-2xl">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-200 uppercase tracking-wider">System Anomaly Detected</h4>
              <p className="text-xs text-red-300 leading-relaxed">{errorBanner}</p>
            </div>
            <button onClick={() => setErrorBanner(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X size={16} className="text-red-400" />
            </button>
          </div>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0b1121] border-r border-slate-800/50 transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nexus-500 to-nexus-purple flex items-center justify-center shadow-lg shadow-nexus-500/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-xl text-white tracking-tight">Nexus Scholar</h1>
              <p className="text-[10px] text-nexus-400 font-mono uppercase tracking-[0.2em]">Scholarly Interface</p>
            </div>
          </div>
          <div className="mb-6">
            <form onSubmit={handleSearch} className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-nexus-accent transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Query Knowledge Core..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-nexus-500/50 focus:bg-slate-900 transition-all font-mono" 
              />
            </form>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest px-4 mb-2">Cosmic Sciences</p>
            <NavButton label="Astronomy" active={activeTopic === Topic.Astronomy} icon={<Globe size={18} />} onClick={() => setActiveTopic(Topic.Astronomy)} />
            <NavButton label="Astrophysics" active={activeTopic === Topic.Astrophysics} icon={<Rocket size={18} />} onClick={() => setActiveTopic(Topic.Astrophysics)} />
            <NavButton label="Cosmology" active={activeTopic === Topic.Cosmology} icon={<Sparkles size={18} />} onClick={() => setActiveTopic(Topic.Cosmology)} />
            <div className="my-4 border-t border-slate-800/30"></div>
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest px-4 mb-2">Fundamental Physics</p>
            <NavButton label="Quantum Physics" active={activeTopic === Topic.QuantumPhysics} icon={<Atom size={18} />} onClick={() => setActiveTopic(Topic.QuantumPhysics)} />
            <NavButton label="Particle Physics" active={activeTopic === Topic.ParticlePhysics} icon={<CircleDashed size={18} />} onClick={() => setActiveTopic(Topic.ParticlePhysics)} />
            <div className="my-4 border-t border-slate-800/30"></div>
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest px-4 mb-2">Biological & Artificial</p>
            <NavButton label="Neuroscience" active={activeTopic === Topic.Neuroscience} icon={<Brain size={18} />} onClick={() => setActiveTopic(Topic.Neuroscience)} />
            <NavButton label="Artificial Intelligence" active={activeTopic === Topic.AI} icon={<BrainCircuit size={18} />} onClick={() => setActiveTopic(Topic.AI)} />
            <NavButton label="Quantum Computing" active={activeTopic === Topic.QuantumComputing} icon={<Cpu size={18} />} onClick={() => setActiveTopic(Topic.QuantumComputing)} />
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/30">
             <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-nexus-accent/20 flex items-center justify-center text-nexus-accent">
                   <GraduationCap size={16} />
                </div>
                <div className="flex-1">
                   <p className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">Academic Status</p>
                   <p className="text-xs font-bold text-slate-200">Verified Scholar</p>
                </div>
             </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-6 md:px-12 bg-[#020617]/80 backdrop-blur-xl z-20">
           <div className="flex items-center gap-3">
             <div className="flex gap-2">
                {(Object.values(Level) as Level[]).map((level) => (<LevelBadge key={level} level={level} current={activeLevel} onClick={() => setActiveLevel(level)} />))}
             </div>
           </div>
           <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 Neural Core Synchronized
              </div>
           </div>
        </header>

        {/* Outer scroll container with 4px (px-1) horizontal padding */}
        <div className="flex-1 overflow-y-auto px-1 py-4 md:py-8 lg:py-12 custom-scrollbar relative">
          <div className="w-full space-y-12 pb-24">
            {viewMode === 'lesson' ? (
              <>
                {/* --- Vertical Stretched Layout --- */}
                <div className="flex flex-col gap-4 w-full">
                   {/* Full Width Title Card with Expanded Description */}
                   <div className="relative group/card rounded-[1rem] overflow-hidden flex flex-col justify-end p-8 md:p-12 shadow-2xl transition-all duration-700 hover:shadow-nexus-500/20 border border-white/5 min-h-[500px] w-full">
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover/card:scale-110 z-0"
                        style={{ backgroundImage: `url(${TOPIC_IMAGES[activeTopic]})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-nexus-900 via-nexus-900/80 to-transparent z-[1]" />
                      <div className="relative z-10 space-y-6">
                        {loading ? (
                          <div className="bg-black/40 backdrop-blur-md rounded-[2rem] p-12 border border-white/5">
                            <SectionLoader label="Initializing Module Data" />
                          </div>
                        ) : content && (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-mono text-white tracking-widest uppercase shadow-xl flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                                Research Module Active
                              </span>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight group-hover/card:translate-x-1 transition-transform duration-500 drop-shadow-2xl">
                              {content.title}
                            </h2>
                            <div className="bg-black/50 backdrop-blur-lg p-8 rounded-3xl border border-white/10 shadow-inner w-full">
                              <p className="text-lg md:text-xl text-slate-100 leading-relaxed font-light whitespace-pre-wrap">
                                {content.introduction}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                   </div>

                   {/* Full Width Simulation View Section */}
                   <div className="rounded-[1rem] overflow-hidden border border-slate-800/50 shadow-2xl bg-[#010413] min-h-[600px] w-full relative">
                      <InteractiveViz topic={activeTopic} level={activeLevel} concept={selectedConcept} />
                   </div>
                </div>

                {/* --- Knowledge Nodes Section --- */}
                <section className="max-w-7xl mx-auto px-4">
                  <div className="flex items-center gap-4 mb-8">
                     <h3 className="text-nexus-400 font-mono text-[10px] uppercase tracking-[0.4em] flex items-center gap-3 whitespace-nowrap">
                       <Milestone size={14} className="text-nexus-accent" /> Essential Concepts
                     </h3>
                     <div className="h-px w-full bg-gradient-to-r from-slate-800 to-transparent" />
                  </div>
                  {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-900/30 rounded-3xl border border-white/5 shimmer-skeleton"></div>)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {content?.keyPoints.map((point, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => handleConceptClick(point)} 
                          className="group flex flex-col justify-between bg-slate-900/30 p-6 rounded-3xl border border-white/5 text-left hover:bg-slate-800/80 hover:border-nexus-500/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-nexus-500/20 flex items-center justify-center text-xs font-mono text-slate-500 group-hover:text-nexus-accent transition-colors border border-white/5 mb-6">
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-slate-100 text-sm font-bold tracking-wide">{point}</span>
                             <ArrowUpRight size={16} className="text-slate-600 group-hover:text-nexus-accent transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {/* --- Massive Extended Scholarly Analysis --- */}
                <section className="animate-slide-up-fade max-w-7xl mx-auto px-4">
                   <div className="flex items-center gap-4 mb-10">
                     <h3 className="text-nexus-purple font-mono text-[10px] uppercase tracking-[0.4em] flex items-center gap-3 whitespace-nowrap">
                       <Library size={16} className="text-nexus-purple" /> Extended Scholarly Analysis
                     </h3>
                     <div className="h-px w-full bg-gradient-to-r from-slate-800 to-transparent" />
                  </div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 items-start">
                     <div className="xl:col-span-2 space-y-10">
                        {loading ? (
                          <div className="p-12 bg-slate-900/30 rounded-[3rem] border border-white/5">
                            <SectionLoader label="Synthesizing Research Content" />
                          </div>
                        ) : content?.deepDive ? (
                          <div className="prose prose-invert max-w-none">
                             <div className="text-slate-300 leading-[1.8] space-y-8 text-base md:text-lg font-light tracking-wide">
                                {content.deepDive.split('\n\n').map((p, i) => (
                                  <p key={i} className="first-letter:text-5xl first-letter:font-bold first-letter:text-nexus-accent first-letter:mr-3 first-letter:float-left first-letter:leading-none">
                                    {p}
                                  </p>
                                ))}
                             </div>
                          </div>
                        ) : (
                          <div className="p-12 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 text-center">
                             <Database className="mx-auto text-slate-700 mb-4" size={40} />
                             <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">No detailed analytics currently available for this module.</p>
                          </div>
                        )}
                     </div>

                     <div className="space-y-8">
                        <div className="bg-nexus-900/40 p-8 rounded-[2rem] border border-nexus-500/20 shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                             <Quote size={80} />
                           </div>
                           <h4 className="text-nexus-accent font-mono text-[10px] uppercase tracking-[0.2em] mb-4">Core Insight</h4>
                           {loading ? (
                             <div className="h-20 shimmer-skeleton rounded-xl"></div>
                           ) : (
                             <p className="text-slate-200 text-sm italic leading-relaxed relative z-10 font-medium">
                                "{content?.introduction.split('.')[0]}."
                             </p>
                           )}
                        </div>

                        <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-white/5">
                           <h4 className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             <Search size={14} className="text-nexus-accent" /> Scholarly Map
                           </h4>
                           <div className="space-y-4">
                              <p className="text-xs text-slate-500 leading-relaxed font-light">
                                 This module explores the nexus between fundamental principles and experimental data. Use the visualization core to observe theoretical interactions.
                              </p>
                              <div className="flex flex-col gap-2 pt-4">
                                 <div className="h-px bg-slate-800" />
                                 <div className="flex justify-between items-center py-1">
                                    <span className="text-[10px] font-mono text-slate-500">Academic Rigor</span>
                                    <div className="flex gap-1">
                                       {[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-3 rounded-full ${i <= 5 ? 'bg-nexus-accent' : 'bg-slate-800'}`} />)}
                                    </div>
                                 </div>
                                 <div className="flex justify-between items-center py-1">
                                    <span className="text-[10px] font-mono text-slate-500">Visual Synthesis</span>
                                    <div className="flex gap-1">
                                       {[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-3 rounded-full ${i <= 5 ? 'bg-nexus-purple' : 'bg-slate-800'}`} />)}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                </section>

                {/* --- Research Trajectories Section --- */}
                <section className="bg-gradient-to-br from-nexus-900/30 to-transparent p-6 md:p-10 rounded-[3rem] border border-white/5 max-w-7xl mx-auto">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                     <div className="space-y-2">
                        <h3 className="text-nexus-purple font-mono text-[10px] uppercase tracking-[0.4em] flex items-center gap-3">
                          <Route size={18} /> Research Trajectories
                        </h3>
                        <p className="text-2xl font-bold text-white tracking-tight">Expand Your Academic Horizon</p>
                     </div>
                     <p className="text-slate-500 text-sm max-w-sm leading-relaxed italic">
                        Select a specialized path to deepen your expertise in this specific domain of the Neural Core.
                     </p>
                  </div>
                  
                  {loading ? (
                    <div className="p-12">
                      <SectionLoader label="Mapping Specialized Pathways" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {content?.curatedSubTopics.map((sub, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => handleConceptClick(sub.title)}
                          className="group p-8 bg-slate-900/60 rounded-[2rem] border border-white/5 hover:border-nexus-purple/40 transition-all duration-500 text-left relative overflow-hidden flex flex-col justify-between h-full"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-purple/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-nexus-purple/10 transition-colors" />
                          <div className="relative z-10 space-y-4">
                             <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-nexus-purple group-hover:scale-110 transition-transform">
                                   <BookMarked size={20} />
                                </div>
                                <ArrowUpRight size={18} className="text-slate-700 group-hover:text-nexus-purple group-hover:-translate-y-1 group-hover:translate-x-1 transition-all" />
                             </div>
                             <div>
                                <h4 className="text-lg font-bold text-white mb-2 tracking-wide">{sub.title}</h4>
                                <p className="text-xs text-slate-400 leading-relaxed font-light line-clamp-3">{sub.description}</p>
                             </div>
                          </div>
                          <div className="pt-6 relative z-10">
                             <span className="text-[10px] font-mono text-nexus-purple uppercase tracking-[0.2em] flex items-center gap-2">
                                Launch Deep-Dive <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                             </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 max-w-7xl mx-auto px-4">
                <button 
                  onClick={() => setViewMode('lesson')} 
                  className="flex items-center gap-2 text-slate-500 hover:text-nexus-accent transition-all hover:gap-3 px-6 py-3 bg-slate-900/40 rounded-2xl border border-white/5 w-fit font-mono text-[10px] uppercase tracking-widest shadow-xl"
                >
                  <ArrowLeft size={16} /> Return to Research Module
                </button>
                
                {loadingConcept ? (
                  <div className="p-20 bg-slate-900/30 rounded-[3rem] border border-white/5">
                    <SectionLoader label="Querying Concept Detail" />
                  </div>
                ) : conceptDetail ? (
                  <div className="space-y-12">
                    <div className="relative p-12 rounded-[3rem] overflow-hidden border border-nexus-500/20 bg-nexus-900/40 backdrop-blur-3xl shadow-3xl">
                      <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12">
                         <Brain size={280} />
                      </div>
                      <div className="relative z-10 space-y-8">
                         <div className="flex items-center gap-3">
                            <span className="text-nexus-accent font-mono text-[10px] uppercase tracking-[0.3em] border border-nexus-accent/30 px-3 py-1 rounded-full bg-nexus-accent/10">Academic Thesis</span>
                         </div>
                         <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none">{selectedConcept}</h2>
                         <div className="max-w-4xl">
                            <p className="text-slate-100 leading-[1.8] text-lg md:text-xl font-light border-l-4 border-nexus-accent pl-8 py-4 italic bg-white/5 rounded-r-3xl pr-6">
                              {conceptDetail.explanation}
                            </p>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-10 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] shadow-2xl hover:border-nexus-purple/30 transition-all group">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-nexus-purple/10 flex items-center justify-center text-nexus-purple group-hover:scale-110 transition-transform">
                             <History size={24} />
                          </div>
                          <h4 className="text-xs font-bold text-nexus-purple uppercase tracking-[0.3em]">Historical Genesis</h4>
                        </div>
                        <p className="text-slate-400 leading-relaxed font-light">{conceptDetail.historicalContext}</p>
                      </div>
                      <div className="p-10 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] shadow-2xl hover:border-emerald-500/30 transition-all group">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:rotate-12 transition-transform">
                             <Wrench size={24} />
                          </div>
                          <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-[0.3em]">Applied Principles</h4>
                        </div>
                        <p className="text-slate-400 leading-relaxed font-light">{conceptDetail.practicalApplication}</p>
                      </div>
                    </div>

                    {conceptDetail.suggestedPath && (
                       <section className="bg-gradient-to-r from-nexus-accent/10 to-transparent border border-nexus-accent/20 rounded-[3rem] p-8 md:p-12 shadow-inner relative overflow-hidden group">
                          <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                             <Compass size={240} />
                          </div>
                          <div className="flex items-center gap-4 mb-10">
                             <Compass size={24} className="text-nexus-accent" />
                             <h3 className="text-nexus-accent font-mono text-[10px] uppercase tracking-[0.4em]">Suggested Research Trajectory</h3>
                          </div>
                          <div className="flex flex-col lg:flex-row gap-12 items-center relative z-10">
                             <div className="flex-1 space-y-6">
                                <div className="flex flex-wrap items-center gap-3">
                                   <span className="text-[10px] font-mono px-3 py-1 bg-nexus-accent text-slate-950 rounded-full font-bold uppercase tracking-wider">
                                      {conceptDetail.suggestedPath.connectionType}
                                   </span>
                                   <h4 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{conceptDetail.suggestedPath.nextConcept}</h4>
                                </div>
                                <p className="text-base text-slate-300 leading-relaxed italic max-w-2xl font-light">
                                   "{conceptDetail.suggestedPath.rationale}"
                                </p>
                             </div>
                             <button 
                               onClick={() => handleConceptClick(conceptDetail.suggestedPath.nextConcept)}
                               className="px-10 py-5 bg-nexus-accent text-slate-950 rounded-[2rem] font-bold hover:bg-white hover:scale-105 transition-all shadow-[0_20px_40px_rgba(6,182,212,0.2)] flex items-center gap-4 whitespace-nowrap active:scale-95"
                             >
                                Explore Next Phase <ChevronRight size={20} />
                             </button>
                          </div>
                       </section>
                    )}

                    {conceptDetail.relatedConcepts && conceptDetail.relatedConcepts.length > 0 && (
                       <section className="pt-6">
                          <h4 className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                             <BookMarked size={16} className="text-slate-600" /> Concurrent Knowledge Nodes
                          </h4>
                          <div className="flex flex-wrap gap-3">
                             {conceptDetail.relatedConcepts.map((rel, i) => (
                                <button 
                                  key={i} 
                                  onClick={() => handleConceptClick(rel)}
                                  className="px-6 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs text-slate-400 hover:text-nexus-accent hover:border-nexus-accent/50 hover:bg-slate-800 transition-all font-medium tracking-wide"
                                >
                                   {rel}
                                </button>
                             ))}
                          </div>
                       </section>
                    )}
                  </div>
                ) : (
                  <div className="p-24 bg-slate-900/20 border border-slate-800 border-dashed rounded-[4rem] text-center flex flex-col items-center">
                    <div className="p-10 bg-slate-800/50 rounded-full mb-8 text-slate-600 shadow-inner">
                      <Database size={64} />
                    </div>
                    <p className="text-slate-400 text-xl font-light tracking-wide mb-8">Neural node retrieval unsuccessful. The data stream may have encountered a quantum fluctuation.</p>
                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-nexus-500/10 text-nexus-400 border border-nexus-500/30 rounded-2xl hover:bg-nexus-500/20 transition-all flex items-center gap-3 font-bold uppercase tracking-widest text-[10px]">
                      <RefreshCcw size={18} /> Re-calibrate Core
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <ChatWidget topic={activeTopic} level={activeLevel} />
      </main>
    </div>
  );
}
