import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DesktopEnvironment.module.css';

interface DesktopEnvironmentProps {
  children: ReactNode;
  wallpaper?: string;
}

export function DesktopEnvironment({ children, wallpaper }: DesktopEnvironmentProps) {
  return (
    <div className={styles.desktop}>
      <AnimatePresence>
        <motion.div 
          key={wallpaper || 'default'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className={styles.background}
          style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : {}}
        >
          <div className={styles.gradientOverlay} />
        </motion.div>
      </AnimatePresence>
      
      {children}
      
      {/* Bottom Navigation Handle */}
      <div className={styles.navigationHandleContainer}>
        <div className={styles.navigationHandle} />
      </div>
    </div>
  );
}
