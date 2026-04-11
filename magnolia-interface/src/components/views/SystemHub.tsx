import { useState, useEffect } from 'react';
import { 
  Search,
  Database,
  Cpu,
  RefreshCw,
  Shield,
  Cloud,
  Settings,
  Wifi,
  Camera,
  Activity
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { open } from '@tauri-apps/plugin-dialog';
import { ExpressiveLoader } from '../widgets/ExpressiveLoader';
import styles from './GeneralSettings.module.css';

interface SystemHubProps {
  onNavigate?: (route: string) => void;
}

interface HardwareSpecs {
  cpu_brand: string;
  total_ram_bytes: number;
  os_info: string;
  resolution?: string;
}

interface SystemUpdateStatus {
  current_partition: string;
  next_partition: string;
  update_available: boolean;
  update_version: string;
  update_progress: number;
}

export function SystemHub({ onNavigate }: SystemHubProps) {
  const { translate } = useLanguage();
  const [knowledgePath, setKnowledgePath] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [hwSpecs, setHwSpecs] = useState<HardwareSpecs | null>(null);
  const [updateStatus, setUpdateStatus] = useState<SystemUpdateStatus | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    refreshHubData().then(() => setIsInitialLoad(false));
  }, []);

  const refreshHubData = async () => {
    try {
      const specs = await invoke<HardwareSpecs>('refresh_hardware_specs');
      setHwSpecs(specs);

      const status = await invoke<SystemUpdateStatus>('get_system_update_status');
      setUpdateStatus(status);

      const savedPath = localStorage.getItem('Magnolia-knowledge-path');
      if (savedPath) setKnowledgePath(savedPath);
    } catch {
      console.error("Hub data fetch failed");
    }
  };

  const pickFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Knowledge Folder'
      });
      if (selected && typeof selected === 'string') {
        setKnowledgePath(selected);
        localStorage.setItem('Magnolia-knowledge-path', selected);
        toast.success(`Knowledge base linked to ${selected.split(/[\\/]/).pop()}`);
      }
    } catch {
      toast.error('Could not open folder picker');
    }
  };

  const triggerIndex = async () => {
    if (!knowledgePath) return toast.error('Pick a folder first!');
    setIsIndexing(true);
    try {
      const count = await invoke<number>('index_local_folder', { path: knowledgePath });
      await invoke('trigger_embedding_job');
      toast.success(`Indexed ${count} new documents!`);
    } catch {
      toast.error('Indexing failed');
    } finally {
      setIsIndexing(false);
    }
  };

  if (isInitialLoad) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
        <ExpressiveLoader size={64} />
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '13px', fontWeight: 500 }}>Syncing System State...</p>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ 
      padding: '32px', 
      overflowY: 'auto', 
      height: '100%',
      background: 'var(--schemes-surface-container-lowest)' 
    }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--schemes-on-surface)', letterSpacing: '-0.02em', marginBottom: '8px' }}>System Hub</h1>
          <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '15px', fontWeight: 500, opacity: 0.8 }}>Securely orchestrating your private intelligence engine.</p>
        </div>
        <button 
          onClick={refreshHubData} 
          style={{ 
            background: 'var(--schemes-surface-container-high)', 
            border: '1px solid var(--schemes-outline-variant)', 
            borderRadius: '16px',
            padding: '12px',
            cursor: 'pointer',
            display: 'flex',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--schemes-surface-container-highest)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--schemes-surface-container-high)'}
        >
          <RefreshCw size={20} color="var(--schemes-primary)" />
        </button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Knowledge Sovereignty Card */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', marginLeft: '4px' }}>Knowledge Sovereignty</p>
          <div style={{ 
            background: 'var(--schemes-surface-container-high)', 
            borderRadius: '28px', 
            padding: '24px',
            border: '1px solid var(--schemes-outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ padding: '16px', borderRadius: '20px', background: 'var(--schemes-primary-container)' }}>
                  <Database size={28} color="var(--schemes-on-primary-container)" />
                </div>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>Local Context Base</p>
                  <p style={{ fontSize: '14px', color: 'var(--schemes-on-surface-variant)', opacity: 0.7 }}>{knowledgePath || 'No local directory linked'}</p>
                </div>
              </div>
              <button 
                onClick={pickFolder} 
                style={{ 
                  color: 'var(--schemes-primary)', 
                  fontSize: '14px', 
                  fontWeight: 700, 
                  background: 'var(--schemes-primary-container)', 
                  border: 'none', 
                  padding: '10px 20px',
                  borderRadius: '100px',
                  cursor: 'pointer' 
                }}
              >
                {knowledgePath ? 'Relink' : 'Link Folder'}
              </button>
            </div>
            {knowledgePath && (
              <button 
                onClick={triggerIndex}
                disabled={isIndexing}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '18px',
                  background: 'var(--schemes-primary)',
                  color: 'var(--schemes-on-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  fontSize: '15px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: 'var(--elevation-light-2)'
                }}
              >
                {isIndexing ? 'Deep Indexing...' : <><RefreshCw size={18} /> Sync Local Knowledge</>}
              </button>
            )}
          </div>
        </section>

        {/* intelligence Diagnostics Row */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', marginLeft: '4px' }}>Hardware Diagnostics</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ 
              background: 'var(--schemes-surface-container-high)', 
              borderRadius: '24px', 
              padding: '24px',
              border: '1px solid var(--schemes-outline-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ padding: '12px', borderRadius: '16px', background: 'var(--schemes-secondary-container)' }}>
                <Cpu size={24} color="var(--schemes-on-secondary-container)" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>{hwSpecs?.cpu_brand?.replace('(R)', '')?.replace('TM', '') || 'Detecting...'}</p>
                <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Sovereign Compute Core</p>
              </div>
            </div>

            <div style={{ 
              background: 'var(--schemes-surface-container-high)', 
              borderRadius: '24px', 
              padding: '24px',
              border: '1px solid var(--schemes-outline-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ padding: '12px', borderRadius: '16px', background: 'var(--schemes-tertiary-container, #d0e4ff)' }}>
                <Database size={24} color="var(--schemes-on-tertiary-container, #001e2f)" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>{hwSpecs ? `${Math.ceil(hwSpecs.total_ram_bytes / 1e9)}GB Unified RAM` : 'Evaluating...'}</p>
                <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Memory Allocation Pool</p>
              </div>
            </div>
          </div>
        </section>

        {/* OS Management Row */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', marginLeft: '4px' }}>OS & Hardware Ecosystem</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div 
              onClick={() => onNavigate?.('updates')}
              style={{ 
                background: 'var(--schemes-surface-container-high)', 
                borderRadius: '24px', 
                padding: '24px',
                border: '1px solid var(--schemes-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '16px', background: 'var(--schemes-primary-container)' }}>
                <RefreshCw size={24} color="var(--schemes-on-primary-container)" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>{updateStatus?.update_available ? 'Update Ready' : 'System v1.0.4'}</p>
                <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>A/B Partition Manager</p>
              </div>
            </div>

            <div 
              onClick={() => onNavigate?.('cloud')}
              style={{ 
                background: 'var(--schemes-surface-container-high)', 
                borderRadius: '24px', 
                padding: '24px',
                border: '1px solid var(--schemes-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '16px', background: 'var(--schemes-secondary-container)' }}>
                <Cloud size={24} color="var(--schemes-on-secondary-container)" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>Cloud Hub</p>
                <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>5GB Sovereign Storage</p>
              </div>
            </div>

            <div 
              onClick={() => onNavigate?.('security')}
              style={{ 
                background: 'var(--schemes-surface-container-high)', 
                borderRadius: '24px', 
                padding: '24px',
                border: '1px solid var(--schemes-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '16px', background: 'var(--schemes-error-container)' }}>
                <Shield size={24} color="var(--schemes-on-error-container)" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>Security Center</p>
                <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>LUKS Partition Control</p>
              </div>
            </div>

            <div 
              onClick={() => onNavigate?.('preferences')}
              style={{ 
                background: 'var(--schemes-surface-container-high)', 
                borderRadius: '24px', 
                padding: '24px',
                border: '1px solid var(--schemes-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '16px', background: 'var(--schemes-tertiary-container, #ffd8e4)' }}>
                <Settings size={24} color="var(--schemes-on-tertiary-container, #31111d)" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>Device & Privacy</p>
                <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Hardware HAL Management</p>
              </div>
            </div>
            <div 
              onClick={() => onNavigate?.('connectivity')}
              style={{ 
                background: 'var(--schemes-surface-container-high)', 
                borderRadius: '24px', 
                padding: '24px',
                border: '1px solid var(--schemes-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '16px', background: 'var(--schemes-primary-container)' }}>
                <Wifi size={24} color="var(--schemes-on-primary-container)" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>Connectivity</p>
                <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>WiFi & Bluetooth Control</p>
              </div>
            </div>
            
            <div 
              onClick={() => onNavigate?.('lifestyle')}
              style={{ 
                background: 'var(--schemes-surface-container-high)', 
                borderRadius: '24px', 
                padding: '24px',
                border: '1px solid var(--schemes-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '16px', background: 'var(--schemes-secondary-container)' }}>
                <Activity size={24} color="var(--schemes-on-secondary-container)" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>{translate('os.lifestyle')}</p>
                <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Digital Wellness & Patterns</p>
              </div>
            </div>
          </div>
        </section>

        {/* Global Tools Section */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', marginLeft: '4px' }}>Utilities & Workspace</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            <div 
              onClick={async () => {
                try {
                  await invoke<string>('take_screenshot');
                  toast.success(`Screenshot saved to /data/Pictures`);
                } catch(err) {
                  toast.error(`Capture failed: ${err}`);
                }
              }}
              style={{ 
                background: 'var(--schemes-surface-container-high)', 
                borderRadius: '24px', 
                padding: '24px',
                border: '1px solid var(--schemes-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ padding: '12px', borderRadius: '16px', background: 'var(--schemes-tertiary-container)' }}>
                <Camera size={24} color="var(--schemes-on-tertiary-container)" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>{translate('os.capture')}</p>
                <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Capture instantaneous system output</p>
              </div>
            </div>
          </div>
        </section>

        {/* Engine Management Row */}
        <section>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--schemes-primary) 0%, var(--schemes-secondary) 100%)', 
            borderRadius: '28px', 
            padding: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'var(--schemes-on-primary)',
            boxShadow: 'var(--elevation-light-3)'
          }}>
            <div style={{ maxWidth: '60%' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Intelligence Hub</h3>
              <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: 1.5 }}>Configure local inference engines and download state-of-the-art open models directly to your private vault.</p>
            </div>
            <button 
              onClick={() => onNavigate?.('models')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 28px',
                borderRadius: '100px',
                background: 'var(--schemes-surface-container-lowest)',
                color: 'var(--schemes-primary)',
                fontWeight: 800,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
              }}
            >
              Open Hub <Search size={20} />
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
