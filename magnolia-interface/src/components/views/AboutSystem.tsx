import { useState, useEffect } from 'react';
import { Cpu, ShieldCheck, Clock, Package, Monitor, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ExpressiveLoader } from '../widgets/ExpressiveLoader';
import styles from './AboutSystem.module.css';

interface HardwareSpecs {
  total_ram_bytes: number;
  free_ram_bytes: number;
  total_vram_bytes: number;
  vendor: string;
  cpu_brand: string;
  screen_resolution: string;
  uptime_seconds: number;
  software_version: string;
}

export function AboutSystem() {
  const [specs, setSpecs] = useState<HardwareSpecs | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSpecs = async () => {
    setIsRefreshing(true);
    try {
      const data = await invoke<HardwareSpecs>('refresh_hardware_specs');
      setSpecs(data);
    } catch {
      console.error("Hardware refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    invoke<HardwareSpecs>('get_hardware_specs')
      .then(setSpecs)
      .catch(console.error);
  }, []);

  const formatBytes = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  if (!specs || isRefreshing) {
    return (
      <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
        <ExpressiveLoader size={64} />
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '13px', fontWeight: 500 }}>Scanning Hardware Architecture...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ padding: '16px', borderRadius: '24px', background: 'var(--schemes-primary-container)' }}>
          <Package size={48} color="var(--schemes-on-primary-container)" />
        </div>
        <div style={{ flex: 1, marginLeft: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h1>Magnolia Desktop</h1>
            <button 
              onClick={fetchSpecs}
              disabled={isRefreshing}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
            >
              <RefreshCw size={20} color="var(--schemes-primary)" className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          <p className={styles.version}>v{specs.software_version} Stabilization</p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <Cpu className={styles.cardIcon} />
          <div className={styles.cardInfo}>
            <p className={styles.cardLabel}>System Processor</p>
            <p className={styles.cardValue}>{specs.cpu_brand}</p>
            <p className={styles.cardSubValue}>{formatBytes(specs.total_ram_bytes)} RAM Total</p>
          </div>
        </div>

        <div className={styles.card}>
          <Monitor className={styles.cardIcon} />
          <div className={styles.cardInfo}>
            <p className={styles.cardLabel}>Display & Graphics</p>
            <p className={styles.cardValue}>{specs.screen_resolution} Native</p>
            {specs.total_vram_bytes > 0 && (
              <p className={styles.cardSubValue}>{specs.vendor} - {formatBytes(specs.total_vram_bytes)} VRAM</p>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <Clock className={styles.cardIcon} />
          <div className={styles.cardInfo}>
            <p className={styles.cardLabel}>System Uptime</p>
            <p className={styles.cardValue}>{formatUptime(specs.uptime_seconds)}</p>
          </div>
        </div>

        <div className={styles.card}>
          <ShieldCheck className={styles.cardIcon} />
          <div className={styles.cardInfo}>
            <p className={styles.cardLabel}>Platform Security</p>
            <p className={styles.cardValue}>Encrypted Storage</p>
            <p className={styles.cardSubValue}>OS SecVault Active</p>
          </div>
        </div>
      </div>

      <div className={styles.footer} style={{ borderTop: '1px solid var(--schemes-outline-variant)', paddingTop: '20px' }}>
        <p>© 2026 Magnolia Technologies. All rights reserved.</p>
        <p className={styles.subtext}>Magnolia v0.0.4 Alpha Core</p>
      </div>
    </div>
  );
}
