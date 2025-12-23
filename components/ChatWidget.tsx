
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Zap, BrainCircuit, Loader2, ExternalLink } from 'lucide-react';
import { Topic, Level } from '../types';
import { chatWithTutor, ChatResponse } from '../services/geminiService';
// Changed import type to import from @google/genai as per guidelines
import { Content } from '@google/genai';

interface ChatWidgetProps {
  topic: Topic;
  level: Level;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; url: string }[];
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ topic, level }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Hello! I'm your Nexus Tutor. I see you're studying ${topic}. How can I help you today?` }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Reset welcome message if topic changes
  useEffect(() => {
    setMessages([{ role: 'model', text: `Switching context to ${topic}. What would you like to know?` }]);
  }, [topic]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    // Convert local messages to Gemini 'Content' format for history
    const history: Content[] = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response: ChatResponse = await chatWithTutor(history, userMsg, isThinkingMode, topic, level);

    setMessages(prev => [...prev, { 
      role: 'model', 
      text: response.text,
      sources: response.sources 
    }]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg shadow-nexus-500/30 transition-all duration-300 hover:scale-110 ${
          isOpen ? 'bg-slate-700 text-slate-300 rotate-90' : 'bg-gradient-to-r from-nexus-500 to-nexus-purple text-white'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-24 right-6 w-[90vw] md:w-96 bg-[#0f172a]/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right flex flex-col overflow-hidden z-40 ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-10 pointer-events-none'
        }`}
        style={{ height: 'min(600px, 70vh)' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isThinkingMode ? 'bg-nexus-purple/20 text-nexus-purple' : 'bg-nexus-500/20 text-nexus-400'}`}>
              {isThinkingMode ? <BrainCircuit size={18} /> : <Zap size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-200 text-sm">Nexus Intelligence</h3>
              <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                {isThinkingMode ? 'PRO • DEEP RESEARCH' : 'FLASH • LIVE SEARCH'}
              </p>
            </div>
          </div>
          
          {/* Mode Toggle */}
          <button
            onClick={() => setIsThinkingMode(!isThinkingMode)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              isThinkingMode 
                ? 'bg-nexus-purple/10 border-nexus-purple/30 text-nexus-purple hover:bg-nexus-purple/20' 
                : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
            }`}
            title={isThinkingMode ? "Switch to Fast Mode" : "Switch to Deep Research Mode"}
          >
            {isThinkingMode ? 'Thinking ON' : 'Thinking OFF'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-nexus-500 text-white rounded-tr-none' 
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                }`}
              >
                {msg.text.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                ))}
              </div>
              
              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 ml-1 max-w-[85%]">
                   <p className="text-[10px] text-slate-500 font-mono mb-1 flex items-center gap-1">
                     <Sparkles size={10} /> SOURCES
                   </p>
                   <div className="flex flex-wrap gap-2">
                     {msg.sources.map((source, sIdx) => (
                       <a 
                         key={sIdx}
                         href={source.url}
                         target="_blank"
                         rel="noopener noreferrer"
                         title={source.title}
                         className="flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 hover:underline border border-slate-700/50 rounded-md px-2 py-1 text-[10px] text-nexus-400 transition-colors max-w-full truncate cursor-pointer"
                       >
                         <span className="truncate max-w-[150px]">{source.title}</span>
                         <ExternalLink size={8} />
                       </a>
                     ))}
                   </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none p-3 flex items-center gap-2">
                 <Loader2 size={16} className="animate-spin text-nexus-accent" />
                 <span className="text-xs text-slate-400 font-mono animate-pulse">
                   {isThinkingMode ? 'Thinking deeply...' : 'Searching & Processing...'}
                 </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-800/30 border-t border-slate-700/50">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isThinkingMode ? "Ask a complex question..." : "Ask a question (Search enabled)..."}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-nexus-500/50 focus:ring-1 focus:ring-nexus-500/50 transition-all"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-nexus-500/10 text-nexus-400 hover:bg-nexus-500 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-nexus-400 transition-all"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="mt-2 flex justify-center">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              Powered by Gemini <Sparkles size={10} className="text-nexus-accent" />
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
