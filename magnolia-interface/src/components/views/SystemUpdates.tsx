import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, ExternalLink, ShieldAlert, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface UpdateStatus {
  current_partition: string;
  next_partition: string;
  update_available: boolean;
  update_version: string;
  update_progress: number;
}

interface UpdatePeer {
  hostname: string;
  ip: string;
  version: string;
}

export const SystemUpdates = () => {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [peers, setPeers] = useState<UpdatePeer[]>([]);
  const [p2pEnabled, setP2pEnabled] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await invoke<UpdateStatus>('get_system_update_status');
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch update status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Discover local peers if enabled
    if (p2pEnabled) {
      invoke<UpdatePeer[]>('discover_update_peers').then(setPeers);
    } else {
      setPeers([]);
    }
  }, [p2pEnabled]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await invoke('apply_system_update');
      // Simulate progress
      let p = 0;
      const interval = setInterval(() => {
        p += 0.1;
        if (status) setStatus({ ...status, update_progress: p });
        if (p >= 1) clearInterval(interval);
      }, 500);
    } catch (error) {
      console.error('Update failed:', error);
      setUpdating(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--schemes-primary)' }}>Checking for updates...</div>;

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--schemes-on-surface)', marginBottom: '0.5rem' }}>System Updates</h2>
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '0.875rem' }}>Manage A/B partition failover and OS versioning.</p>
      </header>

      <div style={{ 
        background: 'var(--schemes-surface-container-high)', 
        borderRadius: '1.5rem', 
        padding: '1.5rem',
        border: '1px solid var(--schemes-outline-variant)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: 'var(--schemes-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={32} color="var(--schemes-on-primary-container)" />
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>{status?.current_partition}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--schemes-on-surface-variant)' }}>Standby: {status?.next_partition}</p>
          </div>
        </div>

        {status?.update_available ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              background: 'var(--schemes-primary-container)', 
              borderRadius: '1rem', 
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--schemes-on-primary-container)' }}>Update Available: {status.update_version}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--schemes-on-primary-container)', opacity: 0.8 }}>Security patches and performance improvements.</p>
              </div>
              {!updating && (
                <button 
                  onClick={handleUpdate}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: 'var(--schemes-primary)', 
                    color: '#fff', 
                    borderRadius: '2rem',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  Install Now
                </button>
              )}
            </div>
            
            {updating && (
              <div style={{ width: '100%' }}>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(status.update_progress || 0) * 100}%` }}
                    style={{ height: '100%', background: 'var(--schemes-on-primary-container)' }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--schemes-on-primary-container)' }}>
                  Downloading Image... {Math.round((status.update_progress || 0) * 100)}%
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accents-green)' }}>
            <CheckCircle2 size={20} />
            <p style={{ fontWeight: 500 }}>System is up to date</p>
          </div>
        )}
      </div>

      {/* P2P Lattice Updates */}
      <div style={{ 
        background: 'var(--schemes-surface-container-high)', 
        borderRadius: '1.5rem', 
        padding: '1.5rem',
        border: '1px solid var(--schemes-outline-variant)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', background: 'var(--schemes-secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Network size={20} color="var(--schemes-on-secondary-container)" />
            </div>
            <div>
              <p style={{ fontWeight: 600 }}>Local Mesh Updates</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--schemes-on-surface-variant)' }}>Share signed OS and App patches with local peers.</p>
            </div>
          </div>
          <button 
            onClick={() => setP2pEnabled(!p2pEnabled)}
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '2rem', 
              border: 'none', 
              background: p2pEnabled ? 'var(--schemes-primary)' : 'var(--schemes-surface-container-highest)', 
              color: p2pEnabled ? '#fff' : 'var(--schemes-on-surface)',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {p2pEnabled ? 'SHARING' : 'OFF'}
          </button>
        </div>

        <AnimatePresence>
          {p2pEnabled && peers.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--schemes-primary)', marginBottom: '12px', letterSpacing: '0.05em' }}>PEERS DISCOVERED (AUTHENTICATED)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {peers.map(peer => (
                  <div key={peer.ip} style={{ padding: '12px', borderRadius: '12px', background: 'var(--schemes-surface)', border: '1px solid var(--schemes-outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                       <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accents-green)' }} />
                       <div>
                         <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{peer.hostname}</p>
                         <p style={{ fontSize: '11px', opacity: 0.6, margin: 0 }}>{peer.ip} • Available: {peer.version}</p>
                       </div>
                    </div>
                    <button style={{ padding: '6px 12px', borderRadius: '100px', background: 'var(--schemes-primary-container)', color: 'var(--schemes-on-primary-container)', border: 'none', fontSize: '11px', fontWeight: 700 }}>
                       Request Sync
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button style={{ 
          flex: 1, 
          padding: '1rem', 
          borderRadius: '1rem', 
          border: '1px solid var(--schemes-outline-variant)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          fontSize: '0.875rem'
        }}>
          <ShieldAlert size={20} />
          View Security Logs
        </button>
        <button style={{ 
          flex: 1, 
          padding: '1rem', 
          borderRadius: '1rem', 
          border: '1px solid var(--schemes-outline-variant)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          fontSize: '0.875rem'
        }}>
          <ExternalLink size={20} />
          Release Notes
        </button>
      </div>
    </div>
  );
};
