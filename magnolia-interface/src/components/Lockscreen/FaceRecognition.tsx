import React from 'react';

interface FaceRecognitionProps {
  username: string;
  avatarSrc: string;
  onBack: () => void;
  status?: 'recognizing' | 'success' | 'error';
}

export const FaceRecognition: React.FC<FaceRecognitionProps> = ({ 
  username, 
  avatarSrc, 
  onBack,
  status = 'recognizing'
}) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl z-[var(--z-lockscreen)] flex flex-col items-center justify-center">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="absolute top-10 left-10 w-14 h-14 bg-[#4f5b92] rounded-full flex items-center justify-center text-white hover:bg-[#5e6ba8] transition-colors shadow-lg"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="relative flex flex-col items-center gap-8">
        {/* Avatar Container with AR Ring */}
        <div className="relative w-[480px] h-[480px]">
          {/* Scanning Ring Animation */}
          <div className="absolute inset-[-20px] rounded-full border-4 border-dashed border-[#6155f5]/30 animate-[spin_10s_linear_infinite]" />
          <div className={`absolute inset-[-10px] rounded-full border-4 border-[#6155f5] transition-all duration-1000 ${status === 'recognizing' ? 'animate-pulse scale-105' : 'scale-100'}`} />
          
          {/* Avatar */}
          <div className="w-full h-full rounded-full overflow-hidden border-8 border-white shadow-2xl relative">
            <img 
              src={avatarSrc} 
              alt={username} 
              className="w-full h-full object-cover"
            />
            {/* Success Overlay */}
            {status === 'success' && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-500">
                <svg className="w-32 h-32 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          {/* AR "Scanning" Beam */}
          {status === 'recognizing' && (
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#6155f5] to-transparent animate-[scan_2s_ease-in-out_infinite]" />
            </div>
          )}
        </div>

        {/* Text/Status */}
        <div className="text-center">
          <h2 className="magnolia-display-large text-white mb-2">
            {username},
          </h2>
          <p className="font-['Lexend_Deca'] text-3xl text-white/80">
            {status === 'recognizing' ? 'Look at the camera!' : status === 'success' ? 'Identity verified.' : 'Verification failed.'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(480px); }
        }
      `}</style>
    </div>
  );
};
