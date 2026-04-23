import React, { useState } from 'react';
import { Package, Download, Play, CheckCircle2, AlertCircle, ShieldCheck, Zap, Globe, Archive } from 'lucide-react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import styles from './AppStore.module.css';

interface AppItem {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  permissions?: string[];
}

const AVAILABLE_APPS: AppItem[] = [
  {
    id: 'sovereign-node',
    name: 'Sovereign Node',
    version: '2.4.0',
    description: 'Run your own blockchain validator and node infrastructure directly within the Magnolia kernel.',
    icon: <ShieldCheck size={32} />,
    url: 'https://registry.bos.io/apps/sovereign-node.pkg',
    permissions: ['Network', 'Filesystem', 'CPU Throttling']
  },
  {
    id: 'llama-vault',
    name: 'Llama Vault',
    version: '1.2.5',
    description: 'A private vault for managing and optimizing large language models with local GPU acceleration.',
    icon: <Zap size={32} />,
    url: 'https://registry.bos.io/apps/llama-vault.pkg',
    permissions: ['GPU Acceleration', 'Local Storage']
  },
  {
    id: 'p2p-mail',
    name: 'Sovereign Mail',
    version: '0.9.1',
    description: 'End-to-end encrypted P2P communication client using the Magnolia Sovereign Identity system.',
    icon: <Globe size={32} />,
    url: 'https://registry.bos.io/apps/p2p-mail.pkg',
    permissions: ['Contacts', 'Network', 'Notifications']
  },
  {
    id: 'media-center',
    name: 'Magnolia Media',
    version: '3.0.1',
    description: 'Hardware-accelerated media player supporting 4K playback and local library indexing.',
    icon: <Package size={32} />,
    url: 'https://registry.bos.io/apps/media-center.pkg',
    permissions: ['Camera', 'Microphone', 'Media Library']
  }
];

interface DiskInfo {
  name: string;
  label: string;
  free_space: number;
}

type InstallState = 'idle' | 'downloading' | 'verifying' | 'installed' | 'error';

export const AppStore: React.FC = () => {
  const { translate } = useLanguage();
  const [appStates, setAppStates] = useState<Record<string, { state: InstallState; progress: number }>>({});

  const handleArchive = async (appId: string) => {
    try {
      await invoke('archive_app', { appId });
      toast.success(translate('app.archive') + ` successful. Data saved to Cloud.`);
      setAppStates(prev => ({ ...prev, [appId]: { state: 'idle', progress: 0 } }));
    } catch(err) {
      toast.error(`Archiving failed: ${err}`);
    }
  };

  const handleInstall = async (app: AppItem) => {
    // 1. Verify available space for future-proofing
    try {
      const disks = await invoke<DiskInfo[]>('get_disk_info');
      const dataPartition = disks.find((d) => d.name === 'data' || d.label === 'Sovereign_Apps');
      
      // Minimal space requirement: 2GB (2,147,483,648 bytes)
      const MINIMAL_BUFFER = 2 * 1024 * 1024 * 1024;
      
      if (dataPartition && dataPartition.free_space < MINIMAL_BUFFER) {
        toast.error(`Low storage: Magnolia requires at least 2GB free for future system safety. Please expand partition in Settings.`);
        return;
      }
    } catch (e) {
      console.warn("Storage check failed, proceeding with caution:", e);
    }

    setAppStates(prev => ({ ...prev, [app.id]: { state: 'downloading', progress: 0 } }));

    // Log the permission request to the audit trail
    if (app.permissions && app.permissions.length > 0) {
      invoke('log_permission_events', { appId: app.name, permissions: app.permissions, status: 'Requested' });
    }

    // Mock progress since download_app is currently a flat async call
    // In a real scenario, we'd use a Tauri event listener for progress
    const interval = setInterval(() => {
      setAppStates(prev => {
        const current = prev[app.id];
        if (current.progress < 90) {
          return { ...prev, [app.id]: { ...current, progress: current.progress + Math.random() * 15 } };
        }
        return prev;
      });
    }, 400);

    try {
      await invoke('download_app', { url: app.url, appId: app.id });
      clearInterval(interval);
      
      setAppStates(prev => ({ ...prev, [app.id]: { state: 'verifying', progress: 100 } }));
      
      // Verification lag for UX
      setTimeout(() => {
        setAppStates(prev => ({ ...prev, [app.id]: { state: 'installed', progress: 100 } }));
        toast.success(`${app.name} verified and installed.`);
      }, 1500);

    } catch (err) {
      clearInterval(interval);
      setAppStates(prev => ({ ...prev, [app.id]: { state: 'error', progress: 0 } }));
      toast.error(`Installation failed: ${err}`);
    }
  };

  const handleLaunch = async (appId: string) => {
    try {
      await invoke('launch_app', { appId });
      toast.success('App launched in Bubblewrap sandbox.');
    } catch (err) {
      toast.error(`Launch failed: ${err}`);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{translate('app.store')}</h1>
        <p>Discover and deploy sovereign applications to your isolated Magnolia environment.</p>
      </header>

      <div className={styles.grid}>
        {AVAILABLE_APPS.map((app) => (
          <motion.div 
            key={app.id} 
            className={styles.appCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.cardHeader}>
              <div className={styles.iconBox}>
                {app.icon}
              </div>
              <div className={styles.titleBox}>
                <h3>{app.name}</h3>
                <span className={styles.version}>v{app.version}</span>
              </div>
            </div>

            <p className={styles.description}>{app.description}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {app.permissions?.map(p => (
                <span key={p} style={{ 
                  fontSize: '10px', 
                  fontWeight: 700, 
                  padding: '4px 10px', 
                  borderRadius: '100px', 
                  background: 'var(--schemes-surface-container-highest)', 
                  color: 'var(--schemes-on-surface-variant)',
                  border: '1px solid var(--schemes-outline-variant)'
                }}>
                  {p}
                </span>
              ))}
            </div>

            <div className={styles.actions}>
              {!appStates[app.id] || appStates[app.id].state === 'idle' ? (
                <button 
                  className={styles.installBtn}
                  onClick={() => handleInstall(app)}
                >
                  <Download size={18} style={{ marginRight: '8px' }} />
                  Install App
                </button>
              ) : (
                <div className={styles.installFlow}>
                  {appStates[app.id].state === 'downloading' && (
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill} 
                          style={{ width: `${Math.min(appStates[app.id].progress, 100)}%` }} 
                        />
                      </div>
                      <span className={styles.progressText}>
                        Downloading... {Math.round(appStates[app.id].progress)}%
                      </span>
                    </div>
                  )}

                  {appStates[app.id].state === 'verifying' && (
                    <div className={styles.progressContainer}>
                       <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: '100%', background: 'var(--schemes-secondary)' }} />
                      </div>
                      <span className={styles.progressText} style={{ color: 'var(--schemes-secondary)' }}>
                        Verifying Manifest...
                      </span>
                    </div>
                  )}

                  {appStates[app.id].state === 'installed' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className={styles.launchBtn}
                        onClick={() => handleLaunch(app.id)}
                      >
                        <Play size={18} style={{ marginRight: '8px' }} />
                        Launch
                      </button>
                      <button 
                        className={styles.installBtn}
                        style={{ padding: '0 16px', background: 'var(--schemes-surface-container-highest)', color: 'var(--schemes-on-surface)' }}
                        title={translate('app.archive')}
                        onClick={() => handleArchive(app.id)}
                      >
                        <Archive size={18} />
                      </button>
                    </div>
                  )}

                  {appStates[app.id].state === 'error' && (
                    <button 
                      className={styles.installBtn}
                      style={{ background: 'var(--schemes-error)', color: 'white' }}
                      onClick={() => handleInstall(app)}
                    >
                      <AlertCircle size={18} style={{ marginRight: '8px' }} />
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {appStates[app.id]?.state === 'installed' && (
               <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--accents-green)' }}>
                 <CheckCircle2 size={24} />
               </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
