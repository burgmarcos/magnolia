import React, { useState, useEffect } from 'react';

import abstractMask from '../../assets/abstract-mask.svg';

const FUN_MESSAGES = [
  "Calibrating neural pathways...",
  "Initializing sovereign protocols...",
  "Loading localized intelligence...",
  "Hardening sandbox environments...",
  "Securing identity vault...",
  "Waking up the Magnolia core...",
  "Optimizing for 4K immersion...",
];

export const BootScreen: React.FC<{ progress?: number }> = ({ progress: initialProgress = 0 }) => {
  const [progress, setProgress] = useState(initialProgress);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 5;
      });
    }, 400);

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % FUN_MESSAGES.length);
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[var(--z-boot)] flex items-center justify-center overflow-hidden">
      {/* Background Mask */}
      <div className="absolute inset-0 opacity-40">
        <img 
          src={abstractMask} 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Stacked Card */}
      <div className="relative z-10 w-[70%] max-w-[1344px] aspect-[16/9] bg-[#374379] rounded-[30px] border border-[#4a5585] shadow-2xl flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-12 text-center">
          {/* Logo */}
          <h1 className="magnolia-display-large text-[#e3e1e9] drop-shadow-lg">
            Magnolia
          </h1>

          {/* Progress Indicator */}
          <div className="w-[600px] h-3 bg-[#e8def8]/40 rounded-full overflow-hidden relative">
            <div 
              className="absolute inset-y-0 left-0 bg-[#6750a4] transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Fun Messages */}
          <p className="font-['Lexend_Deca'] text-2xl text-white tracking-wide min-h-[1.5em] transition-opacity duration-300">
            {FUN_MESSAGES[messageIndex]}
          </p>
        </div>

        {/* Ambient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};
