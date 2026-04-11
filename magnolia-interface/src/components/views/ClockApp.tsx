import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlarmClock, Timer, Play, Pause, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ClockTab = 'alarm' | 'clock' | 'stopwatch';

export function ClockApp() {
  const [activeTab, setActiveTab] = useState<ClockTab>('clock');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--schemes-surface)', color: 'var(--schemes-on-surface)' }}>
      {/* Tab Bar */}
      <nav style={{ display: 'flex', justifyContent: 'center', gap: '32px', padding: '16px', borderBottom: '1px solid var(--schemes-outline-variant)' }}>
        <button onClick={() => setActiveTab('clock')} style={tabHeaderStyle(activeTab === 'clock')}>
          <Clock size={20} />
          <span>Clock</span>
        </button>
        <button onClick={() => setActiveTab('alarm')} style={tabHeaderStyle(activeTab === 'alarm')}>
          <AlarmClock size={20} />
          <span>Alarms</span>
        </button>
        <button onClick={() => setActiveTab('stopwatch')} style={tabHeaderStyle(activeTab === 'stopwatch')}>
          <Timer size={20} />
          <span>Stopwatch</span>
        </button>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'clock' && <WorldClock time={time} key="clock" />}
          {activeTab === 'alarm' && <Alarms key="alarm" />}
          {activeTab === 'stopwatch' && <Stopwatch key="stopwatch" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function WorldClock({ time }: { time: Date }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}
    >
      <h1 style={{ fontSize: '72px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </h1>
      <p style={{ fontSize: '18px', color: 'var(--schemes-on-surface-variant)', marginTop: '8px' }}>
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      <div style={{ marginTop: '48px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6 }}>Global Pulse</p>
        {[
          { city: 'London', offset: -1 },
          { city: 'New York', offset: -5 },
          { city: 'Tokyo', offset: 9 }
        ].map(zone => {
          const zTime = new Date(time.getTime() + zone.offset * 3600000);
          return (
            <div key={zone.city} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--schemes-surface-container-high)', padding: '16px 20px', borderRadius: '16px' }}>
              <span style={{ fontWeight: 600 }}>{zone.city}</span>
              <span style={{ opacity: 0.8 }}>{zTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function Alarms() {
  const [alarms, setAlarms] = useState([
    { id: 1, time: '07:30', label: 'Wake Up', enabled: true },
    { id: 2, time: '09:00', label: 'Deep Work Session', enabled: false }
  ]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Wake & Pulse</h2>
        <button style={{ background: 'var(--schemes-primary)', color: 'var(--schemes-on-primary)', border: 'none', padding: '8px 16px', borderRadius: '100px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> New Alarm
        </button>
      </div>

      {alarms.map(alarm => (
        <div key={alarm.id} style={{ 
          background: 'var(--schemes-surface-container-high)', 
          padding: '20px', 
          borderRadius: '24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          opacity: alarm.enabled ? 1 : 0.5
        }}>
          <div>
            <h3 style={{ fontSize: '32px', margin: 0 }}>{alarm.time}</h3>
            <p style={{ opacity: 0.6, fontSize: '14px', margin: '4px 0 0' }}>{alarm.label}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div 
              onClick={() => setAlarms(s => s.map(a => a.id === alarm.id ? { ...a, enabled: !a.enabled } : a))}
              style={{ width: '48px', height: '28px', background: alarm.enabled ? 'var(--schemes-primary)' : 'var(--schemes-outline)', borderRadius: '14px', position: 'relative', cursor: 'pointer', transition: '0.3s' }}
            >
              <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '4px', left: alarm.enabled ? '24px' : '4px', transition: '0.3s' }} />
            </div>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--schemes-error)', cursor: 'pointer' }}>
               <Trash2 size={20} />
            </button>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function Stopwatch() {
  const [running, setRunning] = useState(false);
  const [msec, setMsec] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
       timerRef.current = window.setInterval(() => setMsec(s => s + 10), 10);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  const format = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milis = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milis.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}
    >
      <div style={{ fontSize: '80px', fontFamily: 'monospace', fontWeight: 800 }}>{format(msec)}</div>
      
      <div style={{ display: 'flex', gap: '24px', marginTop: '48px' }}>
        <button 
          onClick={() => { setMsec(0); setRunning(false); }}
          style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--schemes-outline)', background: 'transparent', color: 'var(--schemes-on-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RotateCcw size={24} />
        </button>
        <button 
          onClick={() => setRunning(!running)}
          style={{ width: '80px', height: '80px', borderRadius: '50%', border: 'none', background: running ? 'var(--schemes-error-container)' : 'var(--schemes-primary)', color: running ? 'var(--schemes-on-error-container)' : 'var(--schemes-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {running ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
        </button>
      </div>
    </motion.div>
  );
}

function tabHeaderStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    background: 'transparent',
    border: 'none',
    color: active ? 'var(--schemes-primary)' : 'var(--schemes-on-surface-variant)',
    fontWeight: 700,
    cursor: 'pointer',
    position: 'relative',
    opacity: active ? 1 : 0.6,
    transition: '0.2s',
    fontSize: '13px'
  };
}
