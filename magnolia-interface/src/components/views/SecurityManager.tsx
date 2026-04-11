import { useState, useEffect } from 'react';
import { Unlock, Lock, AlertTriangle, CheckCircle2, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'react-hot-toast';

interface PartitionStatus {
  label: string;
  is_encrypted: boolean;
  is_locked: boolean;
  mount_point: string;
}

export const SecurityManager = () => {
  const [partitions, setPartitions] = useState<PartitionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await invoke<PartitionStatus[]>('get_security_status');
      setPartitions(data);
    } catch (error) {
      console.error('Failed to fetch security status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleUnlock = async (label: string) => {
    if (!password) {
      toast.error('Please enter a password');
      return;
    }

    try {
      await invoke('unlock_partition', { label, password });
      toast.success(`${label} unlocked and mounted`);
      setUnlocking(null);
      setPassword('');
      fetchStatus();
    } catch (error) {
      toast.error(error as string);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--schemes-primary)' }}>Scanning secure partitions...</div>;

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--schemes-on-surface)', marginBottom: '0.5rem' }}>User Security</h2>
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '0.875rem' }}>Manage LUKS encrypted partitions and user data sovereignty.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {partitions.map((p) => (
          <div key={String(p.label)} style={{
            background: 'var(--schemes-surface-container-high)',
            borderRadius: '1.25rem',
            padding: p.is_locked ? '1.5rem' : '1.25rem',
            border: `1px solid ${p.is_locked ? 'var(--schemes-outline-variant)' : 'var(--accents-green)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '3rem', 
                  height: '3rem', 
                  borderRadius: '0.75rem', 
                  background: p.is_locked ? 'var(--schemes-secondary-container)' : 'var(--accents-green)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {p.is_locked ? <Lock size={24} color="var(--schemes-on-secondary-container)" /> : <Unlock size={24} color="#fff" />}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '1rem' }}>{p.label}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--schemes-on-surface-variant)' }}>
                    {p.mount_point} • {p.is_encrypted ? 'LUKS Encrypted' : 'Standard Partition'}
                  </p>
                </div>
              </div>
              
              {!p.is_locked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accents-green)' }}>
                  <CheckCircle2 size={20} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Live</span>
                </div>
              ) : (
                <button 
                  onClick={() => setUnlocking(p.label)}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: 'var(--schemes-primary)', 
                    color: '#fff', 
                    borderRadius: '2rem',
                    fontSize: '0.875rem',
                  }}
                >
                  Unlock
                </button>
              )}
            </div>

            <AnimatePresence>
              {unlocking === p.label && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ 
                    paddingTop: '1rem', 
                    borderTop: '1px solid var(--schemes-outline-variant)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div style={{ position: 'relative' }}>
                      <Key size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                      <input 
                        type="password" 
                        placeholder="Master Partition Key"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem 1rem 0.75rem 2.5rem', 
                          borderRadius: '0.75rem', 
                          background: 'var(--schemes-surface)', 
                          border: '1px solid var(--schemes-outline-variant)',
                          fontSize: '0.875rem'
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleUnlock(p.label)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleUnlock(p.label)}
                        style={{ flex: 1, padding: '0.75rem', background: 'var(--schemes-primary)', color: '#fff', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}
                      >
                        Mount Partition
                      </button>
                      <button 
                        onClick={() => { setUnlocking(null); setPassword(''); }}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: '1px solid var(--schemes-outline-variant)', fontSize: '0.875rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: 'auto',
        padding: '1rem', 
        borderRadius: '1rem', 
        background: 'var(--schemes-error-container)', 
        color: 'var(--schemes-on-error-container)',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center'
      }}>
        <AlertTriangle size={24} />
        <p style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
          <strong>Critical:</strong> Unmounting a partition without closing active applications may result in data loss. Ensure all workloads are saved.
        </p>
      </div>
    </div>
  );
};
