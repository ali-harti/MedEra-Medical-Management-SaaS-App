import React, { useState } from 'react';
import { MessageCircle, X, Send, Bot, Phone, Globe, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const WhatsAppButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Midnight Luxe Palette - Adjusted for High Contrast
  const obsidian = "#0D0D12";
  const champagne = "#C9A84C";
  const ivory = "#FAF8F5";
  const slate = "#2A2A35";

  // Easing function for magnetic feel
  const magneticEase = [0.25, 0.46, 0.45, 0.94];

  return (
    <div className="fixed bottom-10 right-10 z-50 font-['Inter']">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ duration: 0.4, ease: magneticEase }}
            style={{ backgroundColor: obsidian }}
            className="mb-6 w-[22rem] overflow-hidden rounded-[2.5rem] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
          >
            {/* Cinematic Header */}
            <div className="relative border-b border-white/10 bg-white/[0.03] px-8 py-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    style={{ backgroundColor: champagne + "20", borderColor: champagne }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border shadow-inner"
                  >
                    <Bot size={22} style={{ color: champagne }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-['Playfair_Display'] italic text-white leading-none">MedEra Assistant</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">System Online</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="group flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-all hover:bg-white/20"
                >
                  <X size={18} className="text-white transition-colors" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="px-8 py-8 space-y-6">
              <p className="text-[15px] leading-relaxed text-white/80 font-medium">
                Greetings. How would you like to proceed with your medical concierge services?
              </p>
              
              <div className="space-y-4">
                {/* Primary Action 1: App Access (In-App Chat) */}
                <button
                  onClick={() => setShowChat(true)}
                  className="group relative w-full flex items-center justify-between overflow-hidden rounded-[1.5rem] bg-white/10 px-6 py-5 border border-white/10 transition-all duration-500 hover:border-white/30 hover:scale-[1.03] hover:bg-white/15"
                  style={{ transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
                >
                  <span className="absolute inset-0 translate-x-[-100%] bg-white/[0.05] transition-transform duration-500 group-hover:translate-x-0" />
                  <div className="relative flex items-center gap-4">
                    <div 
                      style={{ backgroundColor: ivory }}
                      className="flex h-10 w-10 items-center justify-center rounded-full shadow-lg"
                    >
                      <Globe size={18} className="text-[#0D0D12]" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold tracking-tight text-white">MedEra Web Chat</span>
                      <span className="block text-[10px] text-white/40 uppercase tracking-widest font-bold">Secure in-app session</span>
                    </div>
                  </div>
                  <ArrowRight size={18} className="relative text-white/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
                </button>

                {/* Primary Action 2: WhatsApp Access (External) */}
                <a
                  href="https://wa.me/your_number"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center justify-between overflow-hidden rounded-[1.5rem] bg-white/5 px-6 py-5 border border-white/5 transition-all duration-500 hover:border-white/20 hover:scale-[1.03]"
                  style={{ transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
                >
                  <span className="absolute inset-0 translate-x-[-100%] bg-white/[0.03] transition-transform duration-500 group-hover:translate-x-0" />
                  <div className="relative flex items-center gap-4">
                    <div 
                      style={{ backgroundColor: champagne }}
                      className="flex h-10 w-10 items-center justify-center rounded-full shadow-lg"
                    >
                      <Phone size={18} className="text-[#0D0D12]" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold tracking-tight text-white">WhatsApp Direct</span>
                      <span className="block text-[10px] text-white/40 uppercase tracking-widest font-bold">Mobile Link</span>
                    </div>
                  </div>
                  <Send size={16} className="relative text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
                </a>
              </div>
            </div>

            {/* Technical Footer */}
            <div className="bg-white/[0.02] px-8 py-5 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">Encryption: RSA-4096</span>
                <span className="flex items-center gap-2 font-['JetBrains_Mono'] text-[10px] text-white/50">
                  <span className="h-2 w-2 rounded-full bg-green-500/50" />
                  STABLE_V5.2
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: champagne, color: obsidian }}
        className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full shadow-[0_24px_50px_rgba(201,168,76,0.4)] transition-all duration-500 ease-[cubic-bezier(0.25, 0.46, 0.45, 0.94)] border border-white/20"
      >
        <span className="absolute inset-0 scale-0 rounded-full bg-white/20 transition-transform duration-500 group-hover:scale-100" />
        <div className="relative">
          {isOpen ? <X size={32} /> : <MessageCircle size={32} strokeWidth={1.5} />}
        </div>
        
        <AnimatePresence>
          {!isOpen && (
             <motion.span 
               initial={{ scale: 0, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0, opacity: 0 }}
               className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[12px] font-black shadow-2xl border-2 border-[#0D0D12]"
               style={{ color: obsidian }}
             >
               1
             </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* In-App Chat Modal Placeholder (Can be integrated further) */}
      {showChat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[#0D0D12] rounded-[3rem] border border-white/20 overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-2xl font-['Playfair_Display'] italic text-white">Web Concierge</h2>
              <button onClick={() => setShowChat(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="h-96 p-8 flex items-center justify-center text-white/40 italic">
              Initializing secure session...
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppButton;
