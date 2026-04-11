import { useState, useEffect } from 'react';
import { Clock, ShieldAlert, MonitorOff, Activity } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useLanguage } from '../../context/LanguageContext';
import styles from './GeneralSettings.module.css';

interface UsageSummary {
  app_id: string;
  total_minutes: number;
}

export function LifestyleSettings() {
  const { translate } = useLanguage();
  const [stats, setStats] = useState<UsageSummary[]>([]);
  const [useWarnings, setUseWarnings] = useState(true);

  useEffect(() => {
    invoke<UsageSummary[]>('get_lifestyle_stats')
      .then(setStats)
      .catch(console.error);
  }, []);

  const totalTime = stats.reduce((acc, curr) => acc + curr.total_minutes, 0);

  return (
    <div className={styles.container} style={{ height: '100%', overflowY: 'auto', padding: '32px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--schemes-on-surface)', marginBottom: '8px' }}>
          {translate('os.lifestyle.screentime')}
        </h1>
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '15px' }}>Track your focus patterns and maintain digital balance.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Daily Summary Card */}
        <section>
          <div style={{ 
            background: 'var(--schemes-primary-container)', 
            borderRadius: '28px', 
            padding: '32px',
            color: 'var(--schemes-on-primary-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Core Usage Today</p>
              <h2 style={{ fontSize: '48px', fontWeight: 800, margin: '8px 0' }}>{Math.floor(totalTime / 60)}h {totalTime % 60}m</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Activity size={16} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>12% increase from yesterday</span>
              </div>
            </div>
            <Clock size={80} opacity={0.2} />
          </div>
        </section>

        {/* App Breakdown */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>App Time Ledger</p>
          <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)' }}>
             {stats.map((app, i) => (
               <div key={app.app_id} style={{ marginBottom: i < stats.length - 1 ? '20px' : 0 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                   <span style={{ fontWeight: 700 }}>{app.app_id}</span>
                   <span style={{ fontSize: '14px', opacity: 0.7 }}>{app.total_minutes} mins</span>
                 </div>
                 <div style={{ height: '8px', background: 'var(--schemes-surface-container-highest)', borderRadius: '4px', overflow: 'hidden' }}>
                   <div style={{ width: `${(app.total_minutes / totalTime) * 100}%`, height: '100%', background: 'var(--schemes-primary)' }} />
                 </div>
               </div>
             ))}
          </div>
        </section>

        {/* Health Controls */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Balance & Warnings</p>
          <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
             
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                 <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--schemes-secondary-container)' }}>
                   <ShieldAlert size={20} color="var(--schemes-on-secondary-container)" />
                 </div>
                 <div>
                   <p style={{ fontWeight: 700 }}>Intrusive Break Warnings</p>
                   <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Suggests standing up every 45 minutes of active session.</p>
                 </div>
               </div>
               <button 
                onClick={() => setUseWarnings(!useWarnings)}
                style={{ padding: '8px 16px', borderRadius: '100px', border: 'none', background: useWarnings ? 'var(--schemes-primary)' : 'var(--schemes-surface-container-highest)', color: useWarnings ? 'var(--schemes-on-primary)' : 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>
                 {useWarnings ? 'ACTIVE' : 'OFF'}
               </button>
             </div>

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                 <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--schemes-error-container)' }}>
                   <MonitorOff size={20} color="var(--schemes-on-error-container)" />
                 </div>
                 <div>
                   <p style={{ fontWeight: 700 }}>Strict App Limits</p>
                   <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Warns users when reaching the 4-hour daily threshold per app.</p>
                 </div>
               </div>
               <button style={{ padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--schemes-outline-variant)', background: 'transparent', color: 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>Manage Limits</button>
             </div>

          </div>
        </section>

      </div>
    </div>
  );
}
