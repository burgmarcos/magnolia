import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  RefreshCw, 
  Lock,
  HardDrive,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CloudStats {
  used_bytes: number;
  total_bytes: number;
  is_encrypted: boolean;
  last_sync: string;
}

export const BOSCloudHub = () => {
  const [stats, setStats] = useState<CloudStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch for Phase 2b Initial Dev
    setTimeout(() => {
      setStats({
        used_bytes: 1.2 * 1024 * 1024 * 1024,
        total_bytes: 5 * 1024 * 1024 * 1024,
        is_encrypted: true,
        last_sync: '12 minutes ago'
      });
      setLoading(false);
    }, 1500);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '200px', height: '32px', background: 'var(--schemes-surface-container)', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        <div style={{ width: '100%', height: '200px', background: 'var(--schemes-surface-container)', borderRadius: '24px', animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  const usagePercent = stats ? (stats.used_bytes / stats.total_bytes) * 100 : 0;

  return (
    <div style={{ 
      padding: '2rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '2rem',
      maxWidth: '1200px',
      margin: '0 auto' 
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Cloud Hub</h1>
          <p style={{ color: 'var(--schemes-on-surface-variant)', fontWeight: 500 }}>Sovereign Sync & Resilience</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--accents-green)20', color: 'var(--accents-green)', padding: '0.5rem 1.25rem', borderRadius: '100px', fontSize: '0.875rem', fontWeight: 700 }}>
          <ShieldCheck size={18} />
          Zero-Knowledge Active
        </div>
      </header>

      {/* Quota Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ 
          background: 'var(--schemes-surface-container-high)', 
          borderRadius: '2rem', 
          padding: '2.5rem',
          border: '1px solid var(--schemes-outline-variant)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--schemes-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Storage Usage</p>
              <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{(stats!.used_bytes / 1e9).toFixed(1)} GB <span style={{ opacity: 0.4, fontSize: '1.25rem' }}>of 5 GB Used</span></h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>{Math.round(usagePercent)}%</p>
            </div>
          </div>

          <div style={{ width: '100%', height: '12px', background: 'var(--schemes-surface-container)', borderRadius: '100px', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${usagePercent}%` }}
              transition={{ duration: 1, ease: [0.2, 0, 0, 1] }}
              style={{ 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--schemes-primary) 0%, var(--schemes-secondary) 100%)',
                borderRadius: '100px'
              }} 
            />
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--schemes-on-surface-variant)', fontSize: '0.875rem' }}>
              <RefreshCw size={16} />
              Last sync: {stats?.last_sync}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--schemes-on-surface-variant)', fontSize: '0.875rem' }}>
              <HardDrive size={16} />
              mrburg-os GCS Bucket
            </div>
          </div>
        </div>
      </motion.section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        {/* Sovereignty & Privacy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Lock size={20} color="var(--schemes-primary)" />
            Privacy & Sovereignty
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--schemes-surface-container-low)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--schemes-outline-variant)' }}>
              <div style={{ marginBottom: '1rem', color: 'var(--schemes-primary)' }}><Key size={24} /></div>
              <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Recovery Key</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--schemes-on-surface-variant)', marginBottom: '1rem' }}>Your 256-bit emergency rescue key.</p>
              <button style={{ width: '100%', padding: '0.75rem', background: 'var(--schemes-primary-container)', color: 'var(--schemes-on-primary-container)', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.875rem' }}>
                View Key
              </button>
            </div>

            <div style={{ background: 'var(--schemes-surface-container-low)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid var(--schemes-outline-variant)' }}>
              <div style={{ marginBottom: '1rem', color: 'var(--accents-green)' }}><ShieldCheck size={24} /></div>
              <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Encryption Mode</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--schemes-on-surface-variant)', marginBottom: '1rem' }}>age-format streaming active.</p>
              <button style={{ width: '100%', padding: '0.75rem', background: 'var(--schemes-surface-container-highest)', color: 'var(--schemes-on-surface)', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.875rem' }}>
                Config
              </button>
            </div>
          </div>
        </div>

        {/* Sync Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Active Streams</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {['Knowledge Base', 'System Settings', 'Browser Profile'].map((item) => (
              <div key={item} style={{ 
                padding: '1rem 1.25rem', 
                background: 'var(--schemes-surface-container)', 
                borderRadius: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600 }}>{item}</span>
                <div style={{ width: '40px', height: '20px', background: 'var(--schemes-primary)', borderRadius: '100px', position: 'relative' }}>
                  <div style={{ position: 'absolute', right: '4px', top: '4px', width: '12px', height: '12px', background: '#fff', borderRadius: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ 
        marginTop: 'auto',
        padding: '1.5rem', 
        background: 'var(--schemes-primary-container)', 
        borderRadius: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        color: 'var(--schemes-on-primary-container)'
      }}>
        <Info size={24} />
        <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Your data is encrypted on-device before hitting the <b>mrburg-os</b> cloud. Magnolia cannot recover your account if you lose your Recovery Key.
        </p>
      </footer>
    </div>
  );
};
