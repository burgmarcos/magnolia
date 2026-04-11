import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic } from 'lucide-react';
import styles from './PrivacyDots.module.css';

interface HwUsage {
  app_id: string;
  hardware_type: string;
}

export function PrivacyDots() {
  const [usage, setUsage] = useState<HwUsage[]>([]);
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    const poll = setInterval(() => {
      invoke<HwUsage[]>('get_hardware_telemetry')
        .then(setUsage)
        .catch(console.error);
    }, 5000);
    return () => clearInterval(poll);
  }, []);

  const hasCamera = usage.some(u => u.hardware_type === 'camera');
  const hasMic = usage.some(u => u.hardware_type === 'microphone');

  if (!hasCamera && !hasMic) return null;

  return (
    <div className={styles.container} 
         onMouseEnter={() => setShowPill(true)}
         onMouseLeave={() => setShowPill(false)}>
      
      <div className={styles.dotsWrapper}>
        {hasCamera && <div className={styles.dotRed} />}
        {hasMic && <div className={styles.dotGreen} />}
      </div>

      <AnimatePresence>
        {showPill && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className={styles.pill}
          >
            <div className={styles.pillHeader}>
               <p style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6 }}>Active Hardware</p>
            </div>
            <div className={styles.entryList}>
              {usage.map((u, i) => (
                <div key={i} className={styles.entry}>
                  {u.hardware_type === 'camera' ? <Camera size={14} className={styles.iconRed} /> : <Mic size={14} className={styles.iconGreen} />}
                  <span className={styles.appName}>{u.app_id}</span>
                  {i < usage.length - 1 && <div className={styles.divider} />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
