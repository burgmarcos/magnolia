import { useState, useEffect } from 'react';
import { Wifi, Bluetooth, Link2Off } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useLanguage } from '../../context/LanguageContext';
import styles from './GeneralSettings.module.css';

interface WifiNetwork {
  ssid: string;
  strength: number;
}
interface BtDevice {
  name: string;
  mac: string;
}

export function ConnectivitySettings() {
  const { translate } = useLanguage();
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>([]);
  const [btDevices, setBtDevices] = useState<BtDevice[]>([]);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    // Attempt mock scans
    invoke<WifiNetwork[]>('scan_wifi', { interface: 'wlan0' })
      .then(setWifiNetworks)
      .catch()
      .finally(() => setIsScanning(false));
      
    // Mock BT scan immediately alongside Wifi
    invoke<BtDevice[]>('scan_bluetooth')
      .then(setBtDevices)
      .catch();
  }, []);

  return (
    <div className={styles.container} style={{ height: '100%', overflowY: 'auto', padding: '32px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--schemes-on-surface)', marginBottom: '8px' }}>
          {translate('os.connectivity')}
        </h1>
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '15px' }}>Bluetooth arrays and Radio Management</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Wifi Frame */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Wi-Fi Array</p>
          <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)' }}>
             {isScanning ? <p>Scanning radios...</p> : (
               wifiNetworks.map((net, i) => (
                 <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < wifiNetworks.length - 1 ? '1px solid var(--schemes-outline-variant)' : 'none' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <Wifi color="var(--schemes-primary)" />
                     <p style={{ fontWeight: 600 }}>{net.ssid}</p>
                   </div>
                   <button style={{ padding: '6px 12px', borderRadius: '100px', cursor: 'pointer', background: 'var(--schemes-primary-container)', border: 'none', color: 'var(--schemes-on-primary-container)', fontWeight: 700 }}>Connect</button>
                 </div>
               ))
             )}
          </div>
        </section>

        {/* Bluetooth Frame */}
        <section>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Bluetooth Audio</p>
          <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)' }}>
             {btDevices.map((dev, i) => (
               <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < btDevices.length - 1 ? '1px solid var(--schemes-outline-variant)' : 'none' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <Bluetooth color="var(--schemes-tertiary)" />
                   <div>
                     <p style={{ fontWeight: 600 }}>{dev.name}</p>
                     <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>{dev.mac}</p>
                   </div>
                 </div>
                 <div style={{ display: 'flex', gap: '8px' }}>
                   <button style={{ padding: '6px 12px', borderRadius: '100px', cursor: 'pointer', background: 'var(--schemes-tertiary-container)', border: 'none', color: 'var(--schemes-on-tertiary-container)', fontWeight: 700 }}>{translate('os.bluetooth.pair')}</button>
                   <button style={{ padding: '6px', borderRadius: '100px', cursor: 'pointer', background: 'var(--schemes-error-container)', border: 'none', color: 'var(--schemes-on-error-container)' }}><Link2Off size={16} /></button>
                 </div>
               </div>
             ))}
             {btDevices.length === 0 && <p style={{ color: 'var(--schemes-on-surface-variant)' }}>No active Bluetooth controllers detected in Udev bounds.</p>}
          </div>
        </section>

      </div>
    </div>
  );
}
