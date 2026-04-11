import { useState, useEffect } from 'react';
import { HardDrive, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { SovereignConfirmationDialog } from '../layout/SovereignConfirmationDialog';

interface DiskInfo {
  name: string;
  label: string;
  mount_point: string;
  total_space: number;
  used_space: number;
  free_space: number;
  is_removable: boolean;
  is_locked: boolean;
  expansion_pending: boolean;
  filesystem: string;
}

export function StorageSettings() {
  const [disks, setDisks] = useState<DiskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; name: string; action: string } | null>(null);

  const fetchDisks = async () => {
    try {
      const data = await invoke<DiskInfo[]>('get_disk_info');
      setDisks(data);
    } catch (e) {
      console.error("Failed to fetch storage info:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisks();
  }, []);

  const handleAction = (name: string, action: string) => {
    if (action === 'Format' || action === 'Resize') {
      setActionModal({ isOpen: true, name, action });
    } else {
      executeAction(name, action);
    }
  };

  const executeAction = async (name: string, action: string, pin?: string, username?: string) => {
    setActing(name);
    try {
      if (pin && username) {
        await invoke('verify_security_action', { pin, userConfirm: username });
      }
      
      await invoke('manage_partition', { name, action });
      toast.success(`${action} successful on ${name}`);
      fetchDisks();
    } catch (err) {
      toast.error(`Operation failed: ${err}`);
    } finally {
      setActing(null);
      setActionModal(null);
    }
  };

  const handleExpandRequest = async (name: string) => {
    try {
      await invoke('request_boot_resize', { name });
      toast.success('Expansion scheduled for next boot.');
      fetchDisks();
    } catch (err) {
      toast.error(`Failed to schedule expansion: ${err}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--schemes-primary)' }}>Scanning SATA and NVMe nodes...</div>;

  return (
    <div style={{ padding: '32px', height: '100%', overflowY: 'auto' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--schemes-on-surface)', marginBottom: '8px' }}>Physical Storage</h1>
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '15px' }}>Manage block devices, partitions, and sovereign formatting.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {disks.map(disk => {
          const usagePercent = (disk.used_space / disk.total_space) * 100;
          return (
            <motion.div 
              key={disk.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--schemes-surface-container-high)',
                borderRadius: '24px',
                padding: '24px',
                border: '1px solid var(--schemes-outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '16px', 
                    background: disk.is_removable ? 'var(--schemes-secondary-container)' : 'var(--schemes-primary-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <HardDrive size={28} color={disk.is_removable ? 'var(--schemes-on-secondary-container)' : 'var(--schemes-on-primary-container)'} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{disk.label || disk.name}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--schemes-on-surface-variant)' }}>
                      {disk.filesystem.toUpperCase()} • {disk.is_removable ? 'Removable Media' : 'Core Storage'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                   {disk.is_locked ? (
                     <div style={{ padding: '6px 14px', borderRadius: '100px', background: 'var(--accents-green)', color: 'white', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={14} /> SYSTEM PROTECTED
                     </div>
                   ) : (
                     <>
                        <button 
                          onClick={() => handleAction(disk.name, disk.mount_point ? 'Unmount' : 'Mount')}
                          disabled={acting === disk.name}
                          style={{ padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--schemes-outline-variant)', background: 'transparent', color: 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {disk.mount_point ? 'Unmount' : 'Mount'}
                        </button>
                        <button 
                          onClick={() => handleAction(disk.name, 'Format')}
                          disabled={acting === disk.name}
                          style={{ padding: '8px 16px', borderRadius: '100px', border: 'none', background: 'var(--schemes-error-container)', color: 'var(--schemes-on-error-container)', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Format
                        </button>
                     </>
                   )}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600 }}>{formatBytes(disk.used_space)} used</span>
                  <span style={{ opacity: 0.6 }}>{formatBytes(disk.total_space)} total</span>
                </div>
                <div style={{ height: '8px', background: 'var(--schemes-surface-container-highest)', borderRadius: '4px', overflow: 'hidden' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${usagePercent}%` }}
                      style={{ height: '100%', background: usagePercent > 90 ? 'var(--schemes-error)' : 'var(--schemes-primary)' }} 
                    />
                </div>
              </div>

              {disk.mount_point && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--schemes-primary)' }}>
                   <CheckCircle2 size={14} />
                   <span>Mounted at: {disk.mount_point}</span>
                </div>
              )}

              {disk.free_space < 5_000_000_000 && !disk.is_locked && (
                <div style={{ 
                  marginTop: '4px',
                  padding: '16px', 
                  borderRadius: '16px', 
                  background: 'var(--schemes-error-container)', 
                  color: 'var(--schemes-on-error-container)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <AlertTriangle size={16} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>THRESHOLD MET (LOW SPACE: {formatBytes(disk.free_space)} free)</span>
                  </div>
                  {!disk.expansion_pending ? (
                    <button 
                      onClick={() => handleExpandRequest(disk.name)}
                      style={{ padding: '6px 12px', borderRadius: '100px', background: 'var(--schemes-error)', color: 'white', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      SCHEDULE AUTO-EXPAND
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 800, opacity: 0.8 }}>EXPANSION PENDING ON REBOOT</span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <SovereignConfirmationDialog 
        isOpen={!!actionModal?.isOpen}
        onClose={() => setActionModal(null)}
        title={`Confirm ${actionModal?.action} Operation`}
        description={`You are about to execute a high-risk hardware operation on ${actionModal?.name}. This will potentially result in data loss and cannot be undone.`}
        actionLabel={`Confirm & ${actionModal?.action}`}
        onConfirm={(pin, user) => executeAction(actionModal!.name, actionModal!.action, pin, user)}
      />

      <footer style={{ marginTop: '40px', padding: '24px', background: 'var(--schemes-error-container)', borderRadius: '24px', display: 'flex', gap: '16px', color: 'var(--schemes-on-error-container)' }}>
          <AlertTriangle size={24} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>Hardware Warning</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.8 }}>Modifying partitions or unmounting core storage devices without proper shutdown can lead to catastrophic data corruption of the Magnolia root filesystem.</p>
          </div>
      </footer>
    </div>
  );
}
