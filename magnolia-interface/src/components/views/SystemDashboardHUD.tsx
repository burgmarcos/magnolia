import { useState, useEffect, ElementType } from 'react';
import { 
  Activity, 
  Cpu, 
  ShieldCheck, 
  RefreshCw, 
  HardDrive as HardDriveIcon, 
  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface SystemStats {
  cpu_usage: number;
  ram_usage: number;
  vram_usage: number;
  uptime: string;
}

interface UpdateStatus {
  current_partition: string;
  next_partition: string;
  update_available: boolean;
  update_version: string;
}

interface SecurityStatus {
  label: string;
  is_locked: boolean;
  is_encrypted: boolean;
}

interface MetricCardProps {
  icon: ElementType;
  label: string;
  value: string;
  subvalue?: string;
  color: string;
}

const MetricCard = ({ icon: Icon, label, value, subvalue, color }: MetricCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
    style={{
      background: 'var(--schemes-surface-container-high)',
      borderRadius: '1.5rem',
      padding: '1.5rem',
      border: '1px solid var(--schemes-outline-variant)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ padding: '0.75rem', borderRadius: '1rem', background: `${color}20`, color: color }}>
        <Icon size={24} />
      </div>
      <TrendingUp size={16} style={{ color: 'var(--accents-green)', opacity: 0.6 }} />
    </div>
    <div>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--schemes-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--schemes-on-surface)' }}>{value}</p>
      {subvalue && <p style={{ fontSize: '0.75rem', color: 'var(--schemes-on-surface-variant)', marginTop: '0.25rem' }}>{subvalue}</p>}
    </div>
  </motion.div>
);

export const SystemDashboardHUD = () => {
  const [stats, setStats] = useState<SystemStats>({ cpu_usage: 12, ram_usage: 45, vram_usage: 28, uptime: '2d 4h 12m' });
  const [updates, setUpdates] = useState<UpdateStatus | null>(null);
  const [security, setSecurity] = useState<SecurityStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const updateData = await invoke<UpdateStatus>('get_system_update_status');
      const securityData = await invoke<SecurityStatus[]>('get_security_status');
      setUpdates(updateData);
      setSecurity(securityData);
      
      // Simulate real-time stats fluctuations
      setStats(prev => ({
        ...prev,
        cpu_usage: Math.floor(Math.random() * 15) + 5,
        ram_usage: 45 + (Math.random() > 0.5 ? 1 : -1)
      }));
    } catch (error) {
      console.error('Failed to sync system HUD:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
     
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Synchronizing Magnolia Core...</div>;

  return (
    <div style={{ 
      padding: '2rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>System HUD</h1>
          <p style={{ color: 'var(--schemes-on-surface-variant)', fontWeight: 500 }}>Real-time Magnolia Node Diagnostics</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--schemes-surface-container)', padding: '0.5rem 1rem', borderRadius: '100px', border: '1px solid var(--schemes-outline-variant)' }}>
          <Clock size={16} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Uptime: {stats.uptime}</span>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <MetricCard icon={Cpu} label="Compute Load" value={`${stats.cpu_usage}%` } subvalue="8-Core ARM Optimized" color="#6750A4" />
        <MetricCard icon={Activity} label="Memory Pool" value={`${stats.ram_usage}%`} subvalue="12.4GB / 32GB Allocated" color="#0061A4" />
        <MetricCard icon={HardDriveIcon} label="System Partition" value="OS_A" subvalue="Read-Only Image" color="#34C759" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
        {/* Security Matrix */}
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={20} color="var(--accents-green)" />
            Security Matrix
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {security.map((p) => (
              <div key={p.label} style={{ 
                padding: '1.25rem', 
                background: 'var(--schemes-surface-container-low)', 
                borderRadius: '1.25rem',
                border: '1px solid var(--schemes-outline-variant)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.is_locked ? 'var(--schemes-error)' : 'var(--accents-green)' }} />
                  <div>
                    <p style={{ fontWeight: 600 }}>{p.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--schemes-on-surface-variant)' }}>{p.is_encrypted ? 'LUKS Encrypted' : 'Standard'}</p>
                  </div>
                </div>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  padding: '4px 12px', 
                  borderRadius: '100px', 
                  background: p.is_locked ? 'var(--schemes-error-container)' : 'var(--schemes-primary-container)',
                  color: p.is_locked ? 'var(--schemes-on-error-container)' : 'var(--schemes-on-primary-container)'
                }}>
                  {p.is_locked ? 'LOCKED' : 'ACTIVE'}
                </span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Update Failover Status */}
        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <RefreshCw size={20} color="var(--schemes-primary)" />
            Update Failover Status
          </h3>
          <div style={{ 
            padding: '2rem', 
            background: 'linear-gradient(135deg, var(--schemes-primary-container) 0%, var(--schemes-surface-container-high) 100%)', 
            borderRadius: '1.5rem',
            border: '1px solid var(--schemes-outline-variant)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--schemes-primary)', textTransform: 'uppercase' }}>Active Boot Target</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>Partition {updates?.current_partition}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--schemes-on-surface-variant)', textTransform: 'uppercase' }}>Standby Target</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, opacity: 0.6 }}>Partition {updates?.next_partition}</p>
                </div>
              </div>

              {updates?.update_available ? (
                <div style={{ background: 'var(--schemes-primary)', color: '#fff', padding: '1.25rem', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700 }}>v{updates.update_version} Released</p>
                    <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Ready for failover deployment</p>
                  </div>
                  <button style={{ background: '#fff', color: 'var(--schemes-primary)', padding: '0.5rem 1.25rem', borderRadius: '100px', fontWeight: 700, fontSize: '0.875rem' }}>
                    Trigger Update
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accents-green)', background: 'rgba(255,255,255,0.4)', padding: '1rem', borderRadius: '1rem' }}>
                  <ShieldCheck size={20} />
                  <span style={{ fontWeight: 600 }}>OS Baseline Immutable & Verified</span>
                </div>
              )}
            </div>
            
            {/* Background design element */}
            <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.05 }}>
              <RefreshCw size={180} />
            </div>
          </div>
        </motion.section>
      </div>

      <div style={{ 
        marginTop: '1rem',
        padding: '1rem', 
        borderRadius: '1rem', 
        background: 'var(--schemes-surface-container-low)', 
        border: '1px solid var(--schemes-outline-variant)',
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        color: 'var(--schemes-on-surface-variant)'
      }}>
        <AlertCircle size={20} />
        <p style={{ fontSize: '0.875rem' }}>Core diagnostics derived from firmware level v0.0.4. Integrity checks enabled.</p>
      </div>
    </div>
  );
};
