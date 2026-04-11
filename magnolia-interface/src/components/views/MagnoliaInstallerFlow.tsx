import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, HardDrive, Download, CheckCircle2 } from 'lucide-react';

export function SovereignInstallerFlow() {
  const [step, setStep] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [done, setDone] = useState(false);



  const handleInstall = async () => {
    setInstalling(true);
    setStep(2);
    try {
      await invoke('perform_installation');
      setTimeout(() => {
        setInstalling(false);
        setDone(true);
      }, 2000);
    } catch (e) {
      console.error(e);
      setInstalling(false);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, rgba(30, 20, 60, 0.95), rgba(10, 5, 20, 0.95))`,
      color: '#ffffff',
      fontFamily: 'var(--title-large-font)',
      userSelect: 'none'
    }}>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ textAlign: 'center', maxWidth: '500px' }}>
            <ShieldCheck size={80} color="var(--schemes-primary)" style={{ marginBottom: 24, padding: 16, background: 'var(--schemes-surface-container-highest)', borderRadius: 40 }} />
            <h1 style={{ fontSize: 36, marginBottom: 16, fontWeight: 'bold' }}>Sovereign AI OS</h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 40 }}>
              Welcome to the private intelligence environment. This process will extract the local core directly to your secure user directory.
            </p>
            <button onClick={() => setStep(1)} style={{
              background: 'var(--schemes-primary)', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: 100,
              fontSize: 18, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, margin: '0 auto'
            }}>
              Begin <Download size={20} />
            </button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ textAlign: 'center', maxWidth: '500px' }}>
            <HardDrive size={80} color="var(--schemes-primary)" style={{ marginBottom: 24, padding: 16, background: 'var(--schemes-surface-container-highest)', borderRadius: 40 }} />
            <h1 style={{ fontSize: 36, marginBottom: 16, fontWeight: 'bold' }}>Local Extraction</h1>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 24, borderRadius: 24, marginBottom: 40, textAlign: 'left' }}>
              <ul style={{ margin: 0, paddingLeft: 24, color: 'rgba(255,255,255,0.8)', lineHeight: 2 }}>
                <li>Extracting Magnolia binaries to AppData</li>
                <li>Generating Local Shortcuts</li>
                <li>Configuring Registry for uninstallation</li>
                <li>Zero-Telemetry deployment</li>
              </ul>
            </div>
            <button onClick={handleInstall} style={{
              background: 'var(--schemes-primary)', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: 100,
              fontSize: 18, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, margin: '0 auto'
            }}>
              Extract Now
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="installing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 32px' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', animation: 'spin 2s linear infinite' }}>
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--schemes-primary)" strokeWidth="8" strokeDasharray="100 200" strokeDashoffset={installing ? "0" : "-300"} style={{ transition: 'stroke-dashoffset 2s ease-out' }} />
              </svg>
              {done && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 color="var(--schemes-primary)" size={60} />
                </motion.div>
              )}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>
              {done ? "Extraction Complete" : "Extracting Local Core..."}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
              {done ? "You may now launch Magnolia from your Start Menu" : "Please do not interrupt"}
            </p>
            {done && (
              <button onClick={() => window.close()} style={{
                background: 'var(--schemes-surface-variant)', color: 'var(--schemes-on-surface-variant)', border: 'none', padding: '12px 24px', borderRadius: 100,
                fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 32
              }}>
                Close Wizard
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
