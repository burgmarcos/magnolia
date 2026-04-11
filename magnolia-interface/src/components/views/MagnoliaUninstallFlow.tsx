import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';

export function SovereignUninstallFlow() {
  const [deleteData, setDeleteData] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);

  const handleUninstall = async () => {
    setUninstalling(true);
    try {
      await invoke('perform_uninstallation', { deleteData });
      // The backend will terminate the process immediately upon scheduling the CMD deletion
    } catch (e) {
      console.error(e);
      setUninstalling(false);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, rgba(40, 10, 10, 0.95), rgba(15, 0, 0, 0.95))`,
      color: '#ffffff',
      fontFamily: 'var(--title-large-font)',
      userSelect: 'none'
    }}>
      <AnimatePresence mode="wait">
        {!uninstalling && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ textAlign: 'center', maxWidth: '500px' }}>
            <AlertTriangle size={80} color="#ff5252" style={{ marginBottom: 24, padding: 16, background: 'rgba(255,82,82,0.1)', borderRadius: 40 }} />
            <h1 style={{ fontSize: 36, marginBottom: 16, fontWeight: 'bold' }}>Uninstall Magnolia</h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 32 }}>
              You are about to remove the Sovereign AI OS from your system.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 24, borderRadius: 24, marginBottom: 40, textAlign: 'left', border: '1px solid rgba(255,82,82,0.3)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={deleteData}
                  onChange={(e) => setDeleteData(e.target.checked)}
                  style={{ width: 24, height: 24, accentColor: '#ff5252' }}
                />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ffb4b4' }}>Perform Full Data Wipe</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Permanently delete all local AI models, databases, and history in AppData. This cannot be undone.</div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button onClick={() => window.close()} style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: 100,
                fontSize: 18, fontWeight: 600, cursor: 'pointer'
              }}>
                Cancel
              </button>
              <button onClick={handleUninstall} style={{
                background: '#ff5252', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: 100,
                fontSize: 18, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12
              }}>
                Confirm Uninstall <Trash2 size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {uninstalling && (
          <motion.div key="installing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', maxWidth: '400px' }}>
            <ShieldAlert size={80} color="#ff5252" style={{ marginBottom: 32, animation: 'pulse 2s infinite' }} />
            <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>Purging system...</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
              This window will close automatically when complete.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes pulse { 0% { opacity: 1 } 50% { opacity: 0.5 } 100% { opacity: 1 } }`}</style>
    </div>
  );
}
