import React, { useState } from 'react';
import { UserAvatar } from './UserAvatar';
import { FaceRecognition } from './FaceRecognition';

const imgBackground = "/assets/design/ef4b11136f38250e864d61e9db231527026ed724.png";
const mainUserAvatar = "/assets/design/72f71c481924a99473c91bfdac585c9cc9c2bc58.png";

const SECONDARY_USERS = [
  { id: '12', avatar: "/assets/design/eaa320717b7e77fd08d1bdaf9802cc375eb36366.png", name: "User 1" },
  { id: '21', avatar: "/assets/design/870010419e5f5601c0d7438d4c0e20fa10cc740f.png", name: "User 2" },
  { id: '28', avatar: "/assets/design/d8299e7fa3e2416b8b9504bb2da108cbcd225007.png", name: "User 3" },
];

export const Lockscreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'recognizing' | 'success' | 'error'>('recognizing');

  const startVerification = () => {
    setIsVerifying(true);
    setVerifyStatus('recognizing');
    
    // Simulate recognition
    setTimeout(() => {
      setVerifyStatus('success');
      setTimeout(onLogin, 1500);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-[#1b1b21] z-[var(--z-lockscreen)] flex items-center justify-center overflow-hidden">
      {/* Background Frame */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 rounded-[30px]" 
          style={{ 
            backgroundImage: "linear-gradient(180deg, var(--accents-indigo-alpha) 0%, var(--accents-green-alpha) 100%), linear-gradient(90deg, #6155f5 0%, #6155f5 100%)",
            backgroundBlendMode: 'overlay'
          }} 
        />
        <img 
          src={imgBackground} 
          alt="" 
          className="w-full h-full object-cover opacity-20 pointer-events-none" 
        />
      </div>

      {/* User Selector Container */}
      {!isVerifying && (
        <div className="relative z-10 flex flex-col items-center gap-24">
          {/* Main User Section */}
          <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom duration-700">
            <UserAvatar 
              src={mainUserAvatar} 
              size="large" 
              isSelected={true}
              onClick={startVerification}
            />
            <div className="text-center group cursor-pointer" onClick={startVerification}>
              <h1 className="magnolia-display-large text-white drop-shadow-md">
                Marcos
              </h1>
              <div className="mt-4 px-8 py-3 bg-[#dfe1f9] rounded-full inline-flex items-center gap-2 shadow-lg group-hover:bg-white transition-colors">
                <span className="text-[#6750a4] font-medium text-lg">Login</span>
                <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#6750a4]">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Secondary Users Carousel */}
          <div className="flex items-center gap-6 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
            {SECONDARY_USERS.map((user) => (
              <UserAvatar 
                key={user.id} 
                src={user.avatar} 
                name={user.name}
              />
            ))}
            <button className="w-14 h-14 rounded-2xl bg-[#dfe1f9]/20 flex items-center justify-center text-white backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all">
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-60H6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Power Button */}
      {!isVerifying && (
        <button className="absolute bottom-10 right-10 w-14 h-14 bg-[#f9dedc] text-[#b3261e] rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      )}

      {/* Face Recognition Overlay */}
      {isVerifying && (
        <FaceRecognition 
          username="Marcos"
          avatarSrc={mainUserAvatar}
          status={verifyStatus}
          onBack={() => setIsVerifying(false)}
        />
      )}
    </div>
  );
};
