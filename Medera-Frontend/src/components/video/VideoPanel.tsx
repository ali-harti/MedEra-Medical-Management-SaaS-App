import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Maximize2, Minimize2, X, PhoneMissed } from 'lucide-react';

interface VideoPanelProps {
  url: string;
  onEndCall: () => void;
}

export const VideoPanel: React.FC<VideoPanelProps> = ({ url, onEndCall }) => {
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <div className="video-pip" onClick={() => setMinimized(false)}>
         <iframe src={url} allow="camera; microphone; fullscreen; display-capture" title="Video Pip" />
         <div className="absolute inset-0 bg-black/20 hover:bg-black/0 transition-colors pointer-events-none" />
         <button onClick={(e) => { e.stopPropagation(); onEndCall(); }} className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors pointer-events-auto shadow-lg">
           <PhoneMissed size={14} />
         </button>
      </div>
    );
  }

  return (
    <div className="video-panel flex flex-col">
      <div className="video-panel-controls">
        <div className="text-[12px] font-mono text-white tracking-widest uppercase">Video Session</div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.open(url, '_blank')} className="text-white/70 hover:text-white transition-colors" title="Open in new tab">
             <Maximize2 size={16} />
          </button>
          <button onClick={() => setMinimized(true)} className="text-white/70 hover:text-white transition-colors" title="Minimize PiP">
             <Minimize2 size={16} />
          </button>
          <button onClick={onEndCall} className="text-white/70 hover:text-red-500 transition-colors ml-2" title="End call">
             <X size={18} />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-black overflow-hidden relative">
         <iframe 
            src={url} 
            allow="camera; microphone; fullscreen; display-capture" 
            className="w-full h-full"
            title="Video Room"
         />
      </div>
    </div>
  );
};
