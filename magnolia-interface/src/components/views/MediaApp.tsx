import React, { useState, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize, FileVideo, Music, List } from 'lucide-react';
import { motion } from 'framer-motion';

export function MediaApp() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume] = useState(80);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [view, setView] = useState<'player' | 'library'>('player');

  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress((current / total) * 100);
      setCurrentTime(formatTime(current));
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ height: '100%', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Player View */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <video 
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => setDuration(formatTime(videoRef.current?.duration || 0))}
          style={{ maxWidth: '100%', maxHeight: '100%' }}
          poster="/media/poster_default.png"
        >
          <source src="/media/demo_video.mp4" type="video/mp4" />
        </video>

        {/* Overlay Controls */}
        <div style={{ 
          position: 'absolute', 
          bottom: '24px', 
          left: '24px', 
          right: '24px', 
          background: 'rgba(20, 20, 25, 0.7)', 
          backdropFilter: 'blur(20px)', 
          borderRadius: '24px', 
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Progress Bar */}
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', position: 'relative' }}>
             <div style={{ height: '100%', width: `${progress}%`, background: 'var(--schemes-primary)', borderRadius: '2px' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <SkipBack size={24} style={{ cursor: 'pointer', opacity: 0.8 }} />
              <button 
                onClick={togglePlay}
                style={{ background: 'var(--schemes-primary)', border: 'none', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                {isPlaying ? <Pause size={28} /> : <Play size={28} fill="currentColor" />}
              </button>
              <SkipForward size={24} style={{ cursor: 'pointer', opacity: 0.8 }} />
              <div style={{ fontSize: '14px', fontWeight: 600, opacity: 0.8 }}>
                {currentTime} / {duration}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <Volume2 size={20} opacity={0.7} />
                 <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${volume}%`, background: '#fff', borderRadius: '2px' }} />
                 </div>
              </div>
              <Maximize size={20} style={{ cursor: 'pointer', opacity: 0.7 }} />
              <List size={20} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => setView('library')} />
            </div>
          </div>
        </div>
      </div>

      {/* Library Sidebar (Conditional) */}
      {view === 'library' && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '300px', background: 'rgba(15, 15, 20, 0.95)', backdropFilter: 'blur(32px)', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 200, padding: '24px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
             <h3 style={{ margin: 0, fontSize: '18px' }}>Library</h3>
             <X size={20} style={{ cursor: 'pointer' }} onClick={() => setView('player')} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { title: 'Project Sovereign', duration: '2:45', type: 'video' },
              { city: 'Ambient Pulse', duration: '1:20:00', type: 'audio' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                {item.type === 'video' ? <FileVideo size={20} /> : <Music size={20} />}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

const X = ({ size, style, onClick }: { size: number, style?: React.CSSProperties, onClick?: () => void }) => (
  <svg width={size} height={size} style={style} onClick={onClick} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
