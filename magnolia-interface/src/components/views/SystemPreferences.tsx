import { EyeOff, MicOff, Volume2, Sun, ZapOff, Usb, Battery, Flashlight, Brain, RefreshCw, Search } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';
import styles from './GeneralSettings.module.css';

export function SystemPreferences() {
  const { 
    reducedMotion, setReducedMotion, 
    volume, setVolume, 
    brightness, setBrightness,
    blockCamera, setBlockCamera,
    blockMicrophone, setBlockMicrophone,
    blockUSB, setBlockUSB,
    powerSavingMode, setPowerSavingMode,
    autoPerformanceMode, setAutoPerformanceMode,
    fontScale, setFontScale,
    autoUpdateApps, setAutoUpdateApps,
    indexingEnabled, setIndexingEnabled
  } = usePreferences();
  const { translate } = useLanguage();

  return (
    <div className={styles.container} style={{ height: '100%', overflowY: 'auto', padding: '32px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--schemes-on-surface)', marginBottom: '8px' }}>Device & Privacy</h1>
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '15px' }}>Configure Sandbox restrictions and Hardware parameters.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Hardware Controls */}
        <section>
           <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Sensory Constraints</p>
           <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
               <Volume2 size={24} color="var(--schemes-on-surface)" />
               <div style={{ flex: 1 }}>
                 <p style={{ fontSize: '15px', fontWeight: 700 }}>System Audio Volume</p>
                 <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} style={{ width: '100%', marginTop: '8px' }} />
               </div>
               <span style={{ fontSize: '14px', fontWeight: 700 }}>{volume}%</span>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               <Sun size={24} color="var(--schemes-on-surface)" />
               <div style={{ flex: 1 }}>
                 <p style={{ fontSize: '15px', fontWeight: 700 }}>Display Brightness</p>
                 <input type="range" min="0" max="100" value={brightness} onChange={e => setBrightness(Number(e.target.value))} style={{ width: '100%', marginTop: '8px' }} />
               </div>
               <span style={{ fontSize: '14px', fontWeight: 700 }}>{brightness}%</span>
             </div>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
               <Battery size={24} color={powerSavingMode ? "var(--schemes-primary)" : "var(--schemes-on-surface)"} />
               <div style={{ flex: 1 }}>
                 <p style={{ fontSize: '15px', fontWeight: 700 }}>Eco Battery Mode</p>
                 <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Throttles CPU cycles and disables discrete GPU polling.</p>
               </div>
               <button 
                onClick={() => setPowerSavingMode(!powerSavingMode)}
                style={{ padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--schemes-outline-variant)', background: powerSavingMode ? 'var(--schemes-primary-container)' : 'transparent', color: powerSavingMode ? 'var(--schemes-on-primary-container)' : 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>
                 {powerSavingMode ? translate('os.eco.battery') : 'PERFORMANCE'}
               </button>
             </div>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
               <Flashlight size={24} color={brightness === 100 ? "var(--schemes-primary)" : "var(--schemes-on-surface)"} />
               <div style={{ flex: 1 }}>
                 <p style={{ fontSize: '15px', fontWeight: 700 }}>{translate('os.flashlight')}</p>
                 <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Overrides screen limits and casts pure white background.</p>
               </div>
               <button 
                onClick={() => setBrightness(brightness === 100 ? 50 : 100)}
                style={{ padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--schemes-outline-variant)', background: brightness === 100 ? 'var(--schemes-primary-container)' : 'transparent', color: brightness === 100 ? 'var(--schemes-on-primary-container)' : 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>
                 {brightness === 100 ? 'ACTIVE' : 'OFF'}
               </button>
             </div>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
               <Brain size={24} color={autoPerformanceMode ? "var(--schemes-primary)" : "var(--schemes-on-surface)"} />
               <div style={{ flex: 1 }}>
                 <p style={{ fontSize: '15px', fontWeight: 700 }}>{translate('os.ml.performance')}</p>
                 <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Usage pattern matching to predict performance needs (Auto Eco-Shift).</p>
               </div>
               <button 
                onClick={() => setAutoPerformanceMode(!autoPerformanceMode)}
                style={{ padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--schemes-outline-variant)', background: autoPerformanceMode ? 'var(--schemes-primary-container)' : 'transparent', color: autoPerformanceMode ? 'var(--schemes-on-primary-container)' : 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>
                 {autoPerformanceMode ? 'ENABLED' : 'MANUAL'}
               </button>
             </div>
             
           </div>
        </section>

        {/* Privacy Shield */}
        <section>
           <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Physical Sandboxing</p>
           <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
             
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <EyeOff size={24} color={blockCamera ? "var(--schemes-error)" : "var(--schemes-on-surface)"} />
                 <div>
                   <p style={{ fontSize: '15px', fontWeight: 700 }}>Block Internal Webcams (V4L2)</p>
                   <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Strictly severs hardware access to the camera interface.</p>
                 </div>
               </div>
               <button 
                onClick={() => setBlockCamera(!blockCamera)}
                style={{ padding: '8px 16px', borderRadius: '100px', border: 'none', background: blockCamera ? 'var(--schemes-error)' : 'var(--schemes-surface-container-highest)', color: blockCamera ? 'var(--schemes-on-error)' : 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>
                 {blockCamera ? 'BLOCKED' : 'ALLOW'}
               </button>
             </div>

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <MicOff size={24} color={blockMicrophone ? "var(--schemes-error)" : "var(--schemes-on-surface)"} />
                 <div>
                   <p style={{ fontSize: '15px', fontWeight: 700 }}>Mute Microphones Natively</p>
                   <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Kills kernel endpoints bridging physical recording arrays.</p>
                 </div>
               </div>
               <button 
                onClick={() => setBlockMicrophone(!blockMicrophone)}
                style={{ padding: '8px 16px', borderRadius: '100px', border: 'none', background: blockMicrophone ? 'var(--schemes-error)' : 'var(--schemes-surface-container-highest)', color: blockMicrophone ? 'var(--schemes-on-error)' : 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>
                 {blockMicrophone ? 'BLOCKED' : 'ALLOW'}
               </button>
             </div>

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <Usb size={24} color={blockUSB ? "var(--schemes-error)" : "var(--schemes-on-surface)"} />
                 <div>
                   <p style={{ fontSize: '15px', fontWeight: 700 }}>Block USB Automounts</p>
                   <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Ignores Udisks2 probing for external USB memory units.</p>
                 </div>
               </div>
               <button 
                onClick={() => setBlockUSB(!blockUSB)}
                style={{ padding: '8px 16px', borderRadius: '100px', border: 'none', background: blockUSB ? 'var(--schemes-error)' : 'var(--schemes-surface-container-highest)', color: blockUSB ? 'var(--schemes-on-error)' : 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>
                 {blockUSB ? 'BLOCKED' : 'ALLOW'}
               </button>
             </div>

           </div>
        </section>

        {/* Accessibility Tools */}
        <section>
           <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Accessibility Engine</p>
           <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <ZapOff size={24} color={reducedMotion ? "var(--schemes-primary)" : "var(--schemes-on-surface)"} />
                 <div>
                   <p style={{ fontSize: '15px', fontWeight: 700 }}>Reduced Motion Layout</p>
                   <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Kills all framer-motion UI interpolation for instant snappiness.</p>
                 </div>
               </div>
               <button 
                onClick={() => setReducedMotion(!reducedMotion)}
                style={{ padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--schemes-outline-variant)', background: reducedMotion ? 'var(--schemes-primary-container)' : 'transparent', color: reducedMotion ? 'var(--schemes-on-primary-container)' : 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>
                 {reducedMotion ? 'ENABLED' : 'DISABLED'}
               </button>
             </div>

              {/* Font Scale Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 700 }}>Global System Font Scale</p>
                  <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)', marginBottom: '8px' }}>Adjusts all text and UI elements relative to viewport.</p>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2" 
                    step="0.1" 
                    value={fontScale} 
                    onChange={e => setFontScale(Number(e.target.value))} 
                    style={{ width: '100%' }} 
                  />
                </div>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--schemes-primary)', minWidth: '60px', textAlign: 'right' }}>{Math.round(fontScale * 100)}%</span>
              </div>
           </div>
        </section>

        {/* Maintenance Section */}
        <section>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Maintenance & Lifecycle</p>
            <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--schemes-primary-container)' }}>
                    <RefreshCw size={20} color="var(--schemes-on-primary-container)" />
                  </div>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700 }}>Auto-Update Sovereignty Apps</p>
                    <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Downloads and installs app patches during detected idle periods.</p>
                  </div>
                </div>
                <button 
                 onClick={() => setAutoUpdateApps(!autoUpdateApps)}
                 style={{ padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--schemes-outline-variant)', background: autoUpdateApps ? 'var(--schemes-primary-container)' : 'transparent', color: autoUpdateApps ? 'var(--schemes-on-primary-container)' : 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>
                  {autoUpdateApps ? 'ACTIVE' : 'MANUAL'}
                </button>
              </div>
            </div>
          </section>

        {/* Intellectual Sovereignty (MemPalace) */}
        <section>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--schemes-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Intellectual Sovereignty</p>
            <div style={{ background: 'var(--schemes-surface-container-high)', borderRadius: '24px', padding: '24px', border: '1px solid var(--schemes-outline-variant)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--schemes-secondary-container)' }}>
                    <Search size={20} color="var(--schemes-on-secondary-container)" />
                  </div>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700 }}>MemPalace Deep Indexing</p>
                    <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>Index every local file for instant semantic discovery via Magnolia Assistant.</p>
                  </div>
                </div>
                <button 
                 onClick={() => setIndexingEnabled(!indexingEnabled)}
                 style={{ padding: '8px 16px', borderRadius: '100px', border: 'none', background: indexingEnabled ? 'var(--schemes-primary)' : 'var(--schemes-surface-container-highest)', color: indexingEnabled ? 'var(--schemes-on-primary)' : 'var(--schemes-on-surface)', fontWeight: 700, cursor: 'pointer' }}>
                  {indexingEnabled ? 'OPTED-IN' : 'DISABLED'}
                </button>
              </div>
            </div>
          </section>

      </div>
    </div>
  );
}
